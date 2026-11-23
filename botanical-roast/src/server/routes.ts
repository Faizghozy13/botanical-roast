import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  buildTransactionsCsv,
  calculateCartTotals,
  computeAdminOverview,
} from '../shared/pricing';
import type {
  FulfillmentMode,
  OrderItemSummary,
  OrderRecord,
  OrderStatus,
  PaymentMethod,
  PublicConfig,
  ReservationRecord,
  UserProfile,
} from '../shared/types';
import { serverConfig, stripeClient } from './config';
import { realtimeBroker, type RealtimeEvent } from './realtime';
import { botanicalStore } from './store';

interface AuthenticatedRequest extends Request {
  authUser?: UserProfile | null;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

async function attachUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  req.authUser = await botanicalStore.resolveAuthUser(token);
  next();
}

function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Silakan masuk terlebih dahulu untuk mengakses fitur ini.' });
    return;
  }
  next();
}

function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Autentikasi admin/barista diperlukan.' });
    return;
  }
  if (req.authUser.role !== 'admin') {
    res.status(403).json({ error: 'Akses ditolak. Hanya akun Admin/Barista yang dapat membuka dasbor.' });
    return;
  }
  next();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const apiRouter = express.Router();

apiRouter.use(attachUser);

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'green-cafe-api' });
});

apiRouter.get('/config/public', async (_req, res) => {
  const hasAdminClaimed = await botanicalStore.hasAdminClaimed();
  const payload: PublicConfig = {
    supabaseConfigured: Boolean(serverConfig.supabaseUrl && serverConfig.supabaseAnonKey),
    supabaseUrl: serverConfig.supabaseUrl,
    supabaseAnonKey: serverConfig.supabaseAnonKey,
    stripeConfigured: Boolean(serverConfig.stripeSecretKey),
    hasAdminClaimed,
  };
  res.json(payload);
});

apiRouter.get('/menu', async (_req, res) => {
  const products = await botanicalStore.getProducts();
  res.json({ products });
});

apiRouter.get('/plans', async (_req, res) => {
  const plans = await botanicalStore.getPlans();
  res.json({ plans });
});

// Authentication endpoints
apiRouter.post('/auth/register', async (req, res) => {
  const { email, password, fullName } = req.body as {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
  };

  if (typeof email !== 'string' || !isValidEmail(email)) {
    res.status(400).json({ error: 'Format email tidak valid.' });
    return;
  }
  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
    return;
  }
  if (typeof fullName !== 'string' || fullName.trim().length < 2) {
    res.status(400).json({ error: 'Nama lengkap minimal 2 karakter.' });
    return;
  }

  try {
    const result = await botanicalStore.registerLocalUser({
      email,
      password,
      fullName,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'EMAIL_EXISTS') {
      res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk dengan akun Anda.' });
      return;
    }
    res.status(500).json({ error: 'Gagal mendaftarkan akun baru.' });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body as { email?: unknown; password?: unknown };

  if (typeof email !== 'string' || !isValidEmail(email) || typeof password !== 'string' || !password) {
    res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
    return;
  }

  try {
    const result = await botanicalStore.loginLocalUser({ email, password });
    res.json(result);
  } catch {
    res.status(401).json({ error: 'Email atau kata sandi salah.' });
  }
});

apiRouter.post('/auth/bootstrap-admin', async (req, res) => {
  const alreadyClaimed = await botanicalStore.hasAdminClaimed();
  if (alreadyClaimed) {
    res.status(409).json({
      error: 'Akun Admin sudah aktif. Silakan masuk menggunakan kredensial Admin yang telah diklaim.',
    });
    return;
  }

  const { email, password, fullName } = req.body as {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
  };

  if (typeof email !== 'string' || !isValidEmail(email)) {
    res.status(400).json({ error: 'Masukkan alamat email admin yang valid.' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Kata sandi Admin minimal 8 karakter.' });
    return;
  }
  if (typeof fullName !== 'string' || fullName.trim().length < 2) {
    res.status(400).json({ error: 'Nama Admin/Barista wajib diisi.' });
    return;
  }

  try {
    const result = await botanicalStore.registerLocalUser({
      email,
      password,
      fullName,
      role: 'admin',
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'EMAIL_EXISTS') {
      res.status(409).json({ error: 'Email tersebut sudah terdaftar sebagai pengguna biasa.' });
      return;
    }
    res.status(500).json({ error: 'Gagal mengklaim akun Admin.' });
  }
});

apiRouter.get('/auth/me', async (req: AuthenticatedRequest, res) => {
  if (!req.authUser) {
    res.status(401).json({ error: 'Sesi tidak aktif.' });
    return;
  }
  const [subscriptions, orders, reservations] = await Promise.all([
    botanicalStore.getUserSubscriptions(req.authUser.id, req.authUser.email),
    botanicalStore.getUserOrders(req.authUser),
    botanicalStore.getUserReservations(req.authUser),
  ]);
  res.json({ user: req.authUser, subscriptions, orders, reservations });
});

apiRouter.post('/auth/logout', async (req: AuthenticatedRequest, res) => {
  if (req.authUser) {
    await botanicalStore.recordActivity({
      userId: req.authUser.id,
      actorEmail: req.authUser.email,
      actorName: req.authUser.fullName,
      action: 'Keluar dari sesi akun',
      category: 'auth',
    });
  }
  res.json({ ok: true });
});

// Reservations (Dine-In)
apiRouter.post('/reservations', async (req: AuthenticatedRequest, res) => {
  const body = req.body as {
    customerName?: unknown;
    customerEmail?: unknown;
    phone?: unknown;
    guests?: unknown;
    tableNumber?: unknown;
    reservationDate?: unknown;
    reservationTime?: unknown;
    notes?: unknown;
  };

  const customerName =
    typeof body.customerName === 'string' && body.customerName.trim().length >= 2
      ? body.customerName.trim()
      : req.authUser?.fullName;
  const customerEmail =
    typeof body.customerEmail === 'string' && isValidEmail(body.customerEmail)
      ? body.customerEmail.trim().toLowerCase()
      : req.authUser?.email;

  if (!customerName || !customerEmail) {
    res.status(400).json({ error: 'Nama dan email wajib diisi untuk reservasi meja.' });
    return;
  }

  const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : '-';
  const guests = Number(body.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
    res.status(400).json({ error: 'Jumlah tamu harus antara 1 sampai 20 orang.' });
    return;
  }

  const tableNumber =
    typeof body.tableNumber === 'string' && body.tableNumber.trim()
      ? body.tableNumber.trim()
      : 'Meja 01 · Indoor';
  const reservationDate =
    typeof body.reservationDate === 'string' && body.reservationDate.trim()
      ? body.reservationDate.trim()
      : new Date().toISOString().slice(0, 10);
  const reservationTime =
    typeof body.reservationTime === 'string' && body.reservationTime.trim()
      ? body.reservationTime.trim()
      : '15:00';

  const record: ReservationRecord = {
    id: `res-${crypto.randomUUID()}`,
    reservationCode: `RES-2026-${Math.floor(100 + Math.random() * 899)}`,
    userId: req.authUser?.id ?? null,
    customerName,
    customerEmail,
    phone,
    guests,
    tableNumber,
    reservationDate,
    reservationTime,
    notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };

  const saved = await botanicalStore.createReservation(record);
  res.status(201).json({ reservation: saved });
});

apiRouter.get('/reservations/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const reservations = await botanicalStore.getUserReservations(req.authUser!);
  res.json({ reservations });
});

// Orders & Menu Checkout
apiRouter.get('/orders/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const orders = await botanicalStore.getUserOrders(req.authUser!);
  res.json({ orders });
});

apiRouter.get('/orders/stream/:orderCode', async (req, res) => {
  const targetCode = req.params.orderCode.replace(/^#/, '').trim().toUpperCase();
  const order = await botanicalStore.getOrderByCode(targetCode);
  if (!order) {
    res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`event: order:snapshot\ndata: ${JSON.stringify(order)}\n\n`);

  const onMessage = (payload: RealtimeEvent) => {
    if (
      (payload.event === 'order:updated' || payload.event === 'order:created') &&
      payload.data.orderCode.toUpperCase() === targetCode
    ) {
      res.write(`event: order:updated\ndata: ${JSON.stringify(payload.data)}\n\n`);
    }
  };

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 20_000);

  realtimeBroker.on('message', onMessage);
  req.on('close', () => {
    clearInterval(heartbeat);
    realtimeBroker.off('message', onMessage);
  });
});

apiRouter.get('/orders/:orderCode', async (req, res) => {
  const order = await botanicalStore.getOrderByCode(req.params.orderCode);
  if (!order) {
    res.status(404).json({ error: 'Nomor pesanan tidak ditemukan.' });
    return;
  }
  res.json({ order });
});

apiRouter.post('/orders', async (req: AuthenticatedRequest, res) => {
  const body = req.body as {
    customerName?: unknown;
    customerEmail?: unknown;
    fulfillmentMode?: unknown;
    tableOrNote?: unknown;
    paymentMethod?: unknown;
    promoCode?: unknown;
    items?: unknown;
  };

  const customerName =
    typeof body.customerName === 'string' && body.customerName.trim()
      ? body.customerName.trim()
      : req.authUser?.fullName;
  const customerEmail =
    typeof body.customerEmail === 'string' && isValidEmail(body.customerEmail)
      ? body.customerEmail.trim().toLowerCase()
      : req.authUser?.email;

  if (!customerName || !customerEmail) {
    res.status(400).json({ error: 'Nama dan email pelanggan wajib diisi dengan benar.' });
    return;
  }

  const validModes: FulfillmentMode[] = ['Dine-In', 'Take Away'];
  const fulfillmentMode = validModes.includes(body.fulfillmentMode as FulfillmentMode)
    ? (body.fulfillmentMode as FulfillmentMode)
    : 'Take Away';

  const validPayments: PaymentMethod[] = ['qris', 'stripe_card', 'cash'];
  const paymentMethod = validPayments.includes(body.paymentMethod as PaymentMethod)
    ? (body.paymentMethod as PaymentMethod)
    : 'qris';

  const tableOrNote =
    typeof body.tableOrNote === 'string' && body.tableOrNote.trim()
      ? body.tableOrNote.trim()
      : fulfillmentMode === 'Take Away'
        ? 'Ambil di Bar Kasir'
        : 'Meja Utama';

  if (!Array.isArray(body.items) || body.items.length === 0) {
    res.status(400).json({ error: 'Keranjang pesanan masih kosong.' });
    return;
  }

  const catalog = await botanicalStore.getProducts();
  const plans = await botanicalStore.getPlans();
  const normalizedItems: OrderItemSummary[] = [];

  for (const rawItem of body.items) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const itemObj = rawItem as {
      productId?: unknown;
      quantity?: unknown;
      customization?: unknown;
      note?: unknown;
    };
    const product = catalog.find((p) => p.id === itemObj.productId);
    const quantity = Number(itemObj.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      res.status(400).json({ error: 'Item pesanan atau jumlah tidak valid.' });
      return;
    }
    if (!product.inStock) {
      res.status(400).json({ error: `Menu "${product.name}" sedang habis.` });
      return;
    }
    normalizedItems.push({
      productId: product.id,
      name: product.name,
      quantity,
      unitPriceIdr: product.priceIdr,
      customization:
        typeof itemObj.customization === 'string' && itemObj.customization.trim()
          ? itemObj.customization.trim()
          : undefined,
      note:
        typeof itemObj.note === 'string' && itemObj.note.trim()
          ? itemObj.note.trim()
          : undefined,
    });
  }

  if (normalizedItems.length === 0) {
    res.status(400).json({ error: 'Tidak ada item valid dalam pesanan.' });
    return;
  }

  let discountPct = 0;
  if (req.authUser) {
    const activeSub = await botanicalStore.getUserActiveSubscription(
      req.authUser.id,
      req.authUser.email,
    );
    if (activeSub) {
      const plan = plans.find((p) => p.id === activeSub.planId);
      discountPct = plan?.cafeDiscountPct ?? 0;
    }
  }

  const promoCode =
    typeof body.promoCode === 'string' && body.promoCode.trim()
      ? body.promoCode.trim().toUpperCase()
      : undefined;

  const totals = calculateCartTotals(normalizedItems, discountPct, promoCode);
  const orderCode = `INV-2026-${Math.floor(100 + Math.random() * 899)}`;
  const orderId = `ord-${crypto.randomUUID()}`;
  const nowIso = new Date().toISOString();

  const order: OrderRecord = {
    id: orderId,
    orderCode,
    userId: req.authUser?.id ?? null,
    customerName,
    customerEmail,
    fulfillmentMode,
    tableOrNote,
    items: normalizedItems,
    promoCode,
    subtotalIdr: totals.subtotalIdr,
    discountIdr: totals.discountIdr,
    taxIdr: totals.taxIdr,
    totalIdr: totals.totalIdr,
    paymentMethod,
    status: paymentMethod === 'qris' ? 'preparing' : 'pending_payment',
    createdAt: nowIso,
  };

  const summaryText = normalizedItems
    .map((item) => `${item.quantity}× ${item.name}`)
    .slice(0, 3)
    .join(', ');

  if (paymentMethod === 'stripe_card') {
    const stripeSessionId = `cs_ord_${crypto.randomBytes(10).toString('hex')}`;
    const { transaction } = await botanicalStore.createOrderAndTransaction({
      order,
      transactionStatus: 'pending',
      paymentProvider: 'Stripe',
      stripeSessionId,
      description: `Pesanan ${orderCode} · ${summaryText}`,
    });

    if (stripeClient) {
      try {
        const origin = serverConfig.appUrl.replace(/\/$/, '');
        const session = await stripeClient.checkout.sessions.create({
          mode: 'payment',
          customer_email: customerEmail,
          line_items: [
            {
              price_data: {
                currency: 'idr',
                product_data: {
                  name: `Pesanan Green Cafe #${orderCode}`,
                  description: summaryText,
                },
                unit_amount: totals.totalIdr * 100,
              },
              quantity: 1,
            },
          ],
          metadata: {
            mode: 'payment',
            orderId: order.id,
            orderCode: order.orderCode,
            userId: req.authUser?.id ?? '',
            customerEmail,
            customerName,
          },
          success_url: `${origin}/?stripe_status=success&order_code=${orderCode}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/?stripe_status=canceled`,
        });

        transaction.stripeSessionId = session.id;
        res.status(201).json({
          order,
          transaction,
          checkoutMode: 'stripe_live',
          checkoutUrl: session.url,
          sessionId: session.id,
        });
        return;
      } catch (err) {
        console.error('Stripe checkout creation failed:', err);
        res.status(502).json({ error: 'Gagal menghubungi Stripe Checkout. Periksa konfigurasi API Stripe.' });
        return;
      }
    }

    botanicalStore.createSandboxSession({
      id: stripeSessionId,
      mode: 'payment',
      userId: req.authUser?.id ?? null,
      customerEmail,
      customerName,
      amountIdr: order.totalIdr,
      orderId: order.id,
      transactionId: transaction.id,
      description: `Pesanan ${orderCode} · ${summaryText}`,
      status: 'open',
      createdAt: nowIso,
    });

    res.status(201).json({
      order,
      transaction,
      checkoutMode: 'stripe_sandbox',
      sessionId: stripeSessionId,
    });
    return;
  }

  const isQris = paymentMethod === 'qris';
  const { transaction } = await botanicalStore.createOrderAndTransaction({
    order,
    transactionStatus: isQris ? 'succeeded' : 'pending',
    paymentProvider: isQris ? 'QRIS' : 'Cash',
    description: `Pesanan ${orderCode} · ${summaryText}`,
  });

  res.status(201).json({
    order,
    transaction,
    checkoutMode: 'instant',
  });
});

// Stripe Subscription Checkout
apiRouter.post('/stripe/create-checkout-session', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const { planId } = req.body as { planId?: unknown };

  if (typeof planId !== 'string') {
    res.status(400).json({ error: 'Pilih paket langganan terlebih dahulu.' });
    return;
  }

  const plans = await botanicalStore.getPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) {
    res.status(404).json({ error: 'Paket langganan tidak ditemukan.' });
    return;
  }

  if (stripeClient) {
    try {
      const origin = serverConfig.appUrl.replace(/\/$/, '');
      const session = await stripeClient.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email,
        line_items: [
          plan.stripePriceId
            ? { price: plan.stripePriceId, quantity: 1 }
            : {
                price_data: {
                  currency: 'idr',
                  product_data: {
                    name: `Green Cafe Club — ${plan.name}`,
                    description: plan.description,
                  },
                  unit_amount: plan.priceIdr * 100,
                  recurring: { interval: 'month' },
                },
                quantity: 1,
              },
        ],
        metadata: {
          mode: 'subscription',
          planId: plan.id,
          userId: user.id,
          customerEmail: user.email,
          customerName: user.fullName,
        },
        success_url: `${origin}/?stripe_status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?stripe_status=canceled`,
      });

      await botanicalStore.createPendingSubscriptionTransaction({
        user,
        plan,
        stripeSessionId: session.id,
      });

      res.json({
        checkoutMode: 'stripe_live',
        checkoutUrl: session.url,
        sessionId: session.id,
      });
      return;
    } catch (err) {
      console.error('Stripe subscription checkout error:', err);
      res.status(502).json({ error: 'Gagal membuat sesi langganan Stripe.' });
      return;
    }
  }

  const sandboxSessionId = `cs_sub_${crypto.randomBytes(10).toString('hex')}`;
  const tx = await botanicalStore.createPendingSubscriptionTransaction({
    user,
    plan,
    stripeSessionId: sandboxSessionId,
  });

  botanicalStore.createSandboxSession({
    id: sandboxSessionId,
    mode: 'subscription',
    userId: user.id,
    customerEmail: user.email,
    customerName: user.fullName,
    amountIdr: plan.priceIdr,
    planId: plan.id,
    transactionId: tx.id,
    description: `Langganan Bulanan · ${plan.name}`,
    status: 'open',
    createdAt: new Date().toISOString(),
  });

  res.json({
    checkoutMode: 'stripe_sandbox',
    sessionId: sandboxSessionId,
    plan,
  });
});

apiRouter.post('/stripe/confirm-sandbox-session', async (req: AuthenticatedRequest, res) => {
  const { sessionId } = req.body as { sessionId?: unknown };
  if (typeof sessionId !== 'string' || !sessionId) {
    res.status(400).json({ error: 'ID sesi Stripe tidak valid.' });
    return;
  }

  const session = botanicalStore.getSandboxSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Sesi checkout Stripe tidak ditemukan.' });
    return;
  }

  if (session.userId && (!req.authUser || (req.authUser.id !== session.userId && req.authUser.role !== 'admin'))) {
    res.status(403).json({ error: 'Anda tidak memiliki akses ke sesi pembayaran ini.' });
    return;
  }

  const result = await botanicalStore.completeStripeCheckout({
    stripeSessionId: session.id,
    mode: session.mode,
    planId: session.planId,
    orderId: session.orderId,
    userId: session.userId,
    customerEmail: session.customerEmail,
    customerName: session.customerName,
  });

  res.json({
    ok: true,
    transaction: result.transaction,
    subscription: result.subscription,
    order: result.order,
  });
});

apiRouter.post('/subscriptions/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await botanicalStore.cancelSubscription(req.params.id, req.authUser!);
    res.json({ subscription: updated });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Langganan tidak ditemukan.' });
      return;
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      res.status(403).json({ error: 'Akses ditolak.' });
      return;
    }
    res.status(500).json({ error: 'Gagal membatalkan langganan.' });
  }
});

// Admin & Barista Operational Dashboard Endpoints
apiRouter.get('/admin/overview', requireAdmin, async (_req, res) => {
  const data = await botanicalStore.getAdminData();
  const overview = computeAdminOverview({
    transactions: data.transactions,
    activeSubscriptions: data.subscriptions,
    orders: data.orders,
    reservations: data.reservations,
    usersCount: Math.max(data.users.length, new Set(data.transactions.map((t) => t.customerEmail)).size),
  });

  res.json({
    overview,
    transactions: data.transactions,
    activities: data.activities,
    subscriptions: data.subscriptions,
    orders: data.orders,
    reservations: data.reservations,
    products: data.products,
    users: data.users,
  });
});

apiRouter.patch('/admin/orders/:id/status', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { status } = req.body as { status?: unknown };
  const validStatuses: OrderStatus[] = [
    'pending_payment',
    'preparing',
    'ready',
    'completed',
    'canceled',
  ];
  if (!validStatuses.includes(status as OrderStatus)) {
    res.status(400).json({ error: 'Status pesanan tidak valid.' });
    return;
  }

  try {
    const result = await botanicalStore.updateOrderStatus(
      req.params.id,
      status as OrderStatus,
      req.authUser!,
    );
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
      return;
    }
    res.status(500).json({ error: 'Gagal memperbarui status pesanan.' });
  }
});

apiRouter.patch('/admin/reservations/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { status } = req.body as { status?: unknown };
  const validStatuses: ReservationRecord['status'][] = [
    'confirmed',
    'seated',
    'completed',
    'canceled',
  ];
  if (!validStatuses.includes(status as ReservationRecord['status'])) {
    res.status(400).json({ error: 'Status reservasi tidak valid.' });
    return;
  }

  try {
    const reservation = await botanicalStore.updateReservationStatus(
      req.params.id,
      status as ReservationRecord['status'],
      req.authUser!,
    );
    res.json({ reservation });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Reservasi tidak ditemukan.' });
      return;
    }
    res.status(500).json({ error: 'Gagal memperbarui reservasi.' });
  }
});

apiRouter.patch('/admin/products/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { inStock, priceIdr } = req.body as { inStock?: unknown; priceIdr?: unknown };
  try {
    const product = await botanicalStore.updateProduct(
      req.params.id,
      {
        inStock: typeof inStock === 'boolean' ? inStock : undefined,
        priceIdr: typeof priceIdr === 'number' ? priceIdr : undefined,
      },
      req.authUser!,
    );
    res.json({ product });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Produk tidak ditemukan.' });
      return;
    }
    res.status(500).json({ error: 'Gagal memperbarui menu.' });
  }
});

apiRouter.get('/admin/export.csv', requireAdmin, async (_req, res) => {
  const data = await botanicalStore.getAdminData();
  const csv = buildTransactionsCsv(data.transactions);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="green-cafe-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
  );
  res.send(csv);
});

apiRouter.post('/admin/stream-ticket', requireAdmin, (req: AuthenticatedRequest, res) => {
  const ticket = realtimeBroker.createTicket(req.authUser!.id);
  res.json({ ticket });
});

apiRouter.get('/admin/stream', (req, res) => {
  const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : '';
  const userId = realtimeBroker.consumeTicket(ticket);
  if (!userId) {
    res.status(401).json({ error: 'Tiket stream real-time tidak valid atau kedaluwarsa.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`event: connected\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);

  const onMessage = (payload: RealtimeEvent) => {
    res.write(`event: ${payload.event}\ndata: ${JSON.stringify(payload.data)}\n\n`);
  };

  const heartbeat = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 20_000);

  realtimeBroker.on('message', onMessage);

  req.on('close', () => {
    clearInterval(heartbeat);
    realtimeBroker.off('message', onMessage);
  });
});

// Stripe Webhook Handler (called with express.raw body from server.ts)
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  if (!stripeClient || !serverConfig.stripeWebhookSecret) {
    res.status(400).json({ error: 'Stripe webhook secret belum dikonfigurasi.' });
    return;
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    res.status(400).json({ error: 'Header stripe-signature tidak ditemukan.' });
    return;
  }

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      serverConfig.stripeWebhookSecret,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Verifikasi signature webhook gagal.' });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const meta = session.metadata ?? {};
    await botanicalStore.completeStripeCheckout({
      stripeSessionId: session.id,
      stripeSubscriptionId:
        typeof session.subscription === 'string' ? session.subscription : undefined,
      mode: meta.mode === 'subscription' ? 'subscription' : 'payment',
      planId: meta.planId || undefined,
      orderId: meta.orderId || undefined,
      userId: meta.userId || null,
      customerEmail: meta.customerEmail || session.customer_details?.email || 'pelanggan@greencafe.id',
      customerName: meta.customerName || session.customer_details?.name || 'Pelanggan Stripe',
    });
  }

  res.json({ received: true });
}
