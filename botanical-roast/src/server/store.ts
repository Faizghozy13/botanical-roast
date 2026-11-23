import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  ActivityCategory,
  ActivityLog,
  OrderRecord,
  OrderStatus,
  Product,
  ReservationRecord,
  SubscriptionPlan,
  SubscriptionRecord,
  TransactionRecord,
  UserProfile,
  UserRole,
} from '../shared/types';
import { serverConfig, supabaseAdmin } from './config';
import { realtimeBroker } from './realtime';
import {
  SEED_ACTIVITIES,
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_RESERVATIONS,
  SEED_SUBSCRIPTIONS,
  SEED_SUBSCRIPTION_PLANS,
  SEED_TRANSACTIONS,
} from './seed';

interface LocalUserAccount extends UserProfile {
  passwordHash: string;
}

export interface SandboxStripeSession {
  id: string;
  mode: 'subscription' | 'payment';
  userId: string | null;
  customerEmail: string;
  customerName: string;
  amountIdr: number;
  planId?: string;
  orderId?: string;
  transactionId: string;
  description: string;
  status: 'open' | 'complete' | 'expired';
  createdAt: string;
}

interface LocalStoreData {
  users: LocalUserAccount[];
  products: Product[];
  plans: SubscriptionPlan[];
  subscriptions: SubscriptionRecord[];
  orders: OrderRecord[];
  reservations: ReservationRecord[];
  transactions: TransactionRecord[];
  activities: ActivityLog[];
  sandboxSessions: SandboxStripeSession[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'green-cafe-store.json');

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

export function signSessionToken(user: Pick<UserProfile, 'id' | 'email' | 'role'>): string {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 7 * 24 * 3600 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', serverConfig.sessionSecret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(
  token: string,
): { sub: string; email: string; role: UserRole } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', serverConfig.sessionSecret)
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      sub: string;
      email: string;
      role: UserRole;
      exp: number;
    };
    if (!parsed.sub || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return { sub: parsed.sub, email: parsed.email, role: parsed.role };
  } catch {
    return null;
  }
}

class BotanicalStore {
  private local: LocalStoreData;

  constructor() {
    this.local = this.loadLocalStore();
  }

  private loadLocalStore(): LocalStoreData {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw) as Partial<LocalStoreData>;
        const hasValidGreenCafeProducts =
          Array.isArray(parsed.products) &&
          parsed.products.some((p) => p.category === 'Kopi' && Boolean(p.subcategory));
        return {
          users: Array.isArray(parsed.users) ? parsed.users : [],
          products: hasValidGreenCafeProducts ? parsed.products! : SEED_PRODUCTS,
          plans:
            Array.isArray(parsed.plans) && parsed.plans.length > 0
              ? parsed.plans
              : SEED_SUBSCRIPTION_PLANS,
          subscriptions: Array.isArray(parsed.subscriptions)
            ? parsed.subscriptions
            : SEED_SUBSCRIPTIONS,
          orders: Array.isArray(parsed.orders) ? parsed.orders : SEED_ORDERS,
          reservations: Array.isArray(parsed.reservations)
            ? parsed.reservations
            : SEED_RESERVATIONS,
          transactions: Array.isArray(parsed.transactions)
            ? parsed.transactions
            : SEED_TRANSACTIONS,
          activities: Array.isArray(parsed.activities) ? parsed.activities : SEED_ACTIVITIES,
          sandboxSessions: Array.isArray(parsed.sandboxSessions) ? parsed.sandboxSessions : [],
        };
      }
    } catch {
      // Fallback to fresh seed data
    }

    const fresh: LocalStoreData = {
      users: [],
      products: SEED_PRODUCTS,
      plans: SEED_SUBSCRIPTION_PLANS,
      subscriptions: SEED_SUBSCRIPTIONS,
      orders: SEED_ORDERS,
      reservations: SEED_RESERVATIONS,
      transactions: SEED_TRANSACTIONS,
      activities: SEED_ACTIVITIES,
      sandboxSessions: [],
    };
    this.saveLocalStore(fresh);
    return fresh;
  }

  private saveLocalStore(data: LocalStoreData = this.local): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // Non-fatal in read-only environments
    }
  }

  async hasAdminClaimed(): Promise<boolean> {
    if (supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1);
        if (data && data.length > 0) return true;
      } catch {
        // Fallback to local check
      }
    }
    return this.local.users.some((u) => u.role === 'admin');
  }

  async getProducts(): Promise<Product[]> {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('products')
          .select('*')
          .order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            name: row.name,
            category: row.category,
            subcategory: row.subcategory,
            description: row.description,
            priceIdr: row.price_idr,
            imageUrl: row.image_url ?? undefined,
            badge: row.badge ?? undefined,
            isAddon: Boolean(row.is_addon),
            inStock: Boolean(row.in_stock),
          }));
        }
      } catch {
        // Fallback to local seed
      }
    }
    return this.local.products;
  }

  async updateProduct(
    productId: string,
    patch: { inStock?: boolean; priceIdr?: number },
    actor: UserProfile,
  ): Promise<Product> {
    const product = this.local.products.find((p) => p.id === productId);
    if (!product) {
      throw new Error('NOT_FOUND');
    }
    if (typeof patch.inStock === 'boolean') {
      product.inStock = patch.inStock;
    }
    if (typeof patch.priceIdr === 'number' && Number.isFinite(patch.priceIdr) && patch.priceIdr >= 1000) {
      product.priceIdr = Math.round(patch.priceIdr);
    }
    this.saveLocalStore();

    if (supabaseAdmin) {
      void supabaseAdmin
        .from('products')
        .update({ in_stock: product.inStock, price_idr: product.priceIdr })
        .eq('id', product.id);
    }

    realtimeBroker.publish({ event: 'product:updated', data: product });
    await this.recordActivity({
      userId: actor.id,
      actorEmail: actor.email,
      actorName: actor.fullName,
      action: `Memperbarui menu ${product.name} (${product.inStock ? 'Tersedia' : 'Habis'})`,
      category: 'admin',
    });

    return product;
  }

  async getPlans(): Promise<SubscriptionPlan[]> {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('subscription_plans')
          .select('*')
          .order('price_idr', { ascending: true });
        if (!error && data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            name: row.name,
            audience: row.audience,
            description: row.description,
            intervalLabel: row.interval_label,
            priceIdr: row.price_idr,
            bagsPerMonth: row.bags_per_month,
            cafeDiscountPct: row.cafe_discount_pct,
            stripePriceId: row.stripe_price_id ?? undefined,
            features: Array.isArray(row.features) ? row.features : [],
            isPopular: Boolean(row.is_popular),
          }));
        }
      } catch {
        // Fallback to local seed
      }
    }
    return this.local.plans;
  }

  async registerLocalUser(params: {
    email: string;
    password: string;
    fullName: string;
    role?: UserRole;
  }): Promise<{ user: UserProfile; token: string }> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const existing = this.local.users.find((u) => u.email === normalizedEmail);
    if (existing) {
      throw new Error('EMAIL_EXISTS');
    }

    const nowIso = new Date().toISOString();
    const assignedRole: UserRole =
      params.role === 'admin'
        ? 'admin'
        : serverConfig.adminEmail && normalizedEmail === serverConfig.adminEmail
          ? 'admin'
          : 'member';

    const account: LocalUserAccount = {
      id: `usr-${crypto.randomUUID()}`,
      email: normalizedEmail,
      fullName: params.fullName.trim(),
      role: assignedRole,
      createdAt: nowIso,
      lastActiveAt: nowIso,
      passwordHash: hashPassword(params.password),
    };
    this.local.users.push(account);
    this.saveLocalStore();

    const user = this.stripHash(account);
    await this.recordActivity({
      userId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
      action:
        assignedRole === 'admin'
          ? 'Mengaktifkan akun Admin & Barista Green Cafe'
          : 'Mendaftar sebagai anggota baru Green Cafe',
      category: 'auth',
    });

    return {
      user,
      token: signSessionToken(user),
    };
  }

  async loginLocalUser(params: {
    email: string;
    password: string;
  }): Promise<{ user: UserProfile; token: string }> {
    const normalizedEmail = params.email.trim().toLowerCase();
    const account = this.local.users.find((u) => u.email === normalizedEmail);
    if (!account || !verifyPassword(params.password, account.passwordHash)) {
      throw new Error('INVALID_CREDENTIALS');
    }

    account.lastActiveAt = new Date().toISOString();
    this.saveLocalStore();

    const user = this.stripHash(account);
    await this.recordActivity({
      userId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
      action: `Masuk ke akun (${user.role})`,
      category: 'auth',
    });

    return {
      user,
      token: signSessionToken(user),
    };
  }

  async resolveAuthUser(bearerToken: string | null): Promise<UserProfile | null> {
    if (!bearerToken) return null;

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(bearerToken);
        if (!error && data.user) {
          const authUser = data.user;
          const { data: profileRow } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          const email = (authUser.email ?? '').toLowerCase();
          const role: UserRole =
            profileRow?.role === 'admin' ||
            (serverConfig.adminEmail && email === serverConfig.adminEmail)
              ? 'admin'
              : 'member';

          const profile: UserProfile = {
            id: authUser.id,
            email,
            fullName:
              profileRow?.full_name ||
              (authUser.user_metadata?.full_name as string | undefined) ||
              email.split('@')[0] ||
              'Member',
            role,
            stripeCustomerId: profileRow?.stripe_customer_id ?? undefined,
            createdAt: profileRow?.created_at || authUser.created_at,
            lastActiveAt: new Date().toISOString(),
          };

          void supabaseAdmin
            .from('profiles')
            .update({ last_active_at: profile.lastActiveAt })
            .eq('id', authUser.id);

          return profile;
        }
      } catch {
        // Fall through to local token verification
      }
    }

    const verified = verifySessionToken(bearerToken);
    if (!verified) return null;

    const account = this.local.users.find((u) => u.id === verified.sub);
    if (!account) return null;
    account.lastActiveAt = new Date().toISOString();
    return this.stripHash(account);
  }

  private stripHash(account: LocalUserAccount): UserProfile {
    const { passwordHash: _ignored, ...profile } = account;
    return profile;
  }

  async getUserActiveSubscription(userId: string, email?: string): Promise<SubscriptionRecord | null> {
    if (supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          return {
            id: data.id,
            userId: data.user_id,
            userEmail: data.user_email,
            userName: data.user_email.split('@')[0],
            planId: data.plan_id,
            planName: data.plan_name,
            status: data.status,
            stripeSubscriptionId: data.stripe_subscription_id || '',
            stripeCheckoutSessionId: data.stripe_checkout_session_id || '',
            amountIdr: data.amount_idr,
            currentPeriodEnd: data.current_period_end,
            createdAt: data.created_at,
          };
        }
      } catch {
        // Fallback to local
      }
    }

    const normalizedEmail = email?.toLowerCase();
    return (
      this.local.subscriptions.find(
        (s) =>
          s.status === 'active' &&
          (s.userId === userId || (normalizedEmail && s.userEmail.toLowerCase() === normalizedEmail)),
      ) ?? null
    );
  }

  async getUserSubscriptions(userId: string, email: string): Promise<SubscriptionRecord[]> {
    if (supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (data) {
          return data.map((row) => ({
            id: row.id,
            userId: row.user_id,
            userEmail: row.user_email,
            userName: row.user_email.split('@')[0],
            planId: row.plan_id,
            planName: row.plan_name,
            status: row.status,
            stripeSubscriptionId: row.stripe_subscription_id || '',
            stripeCheckoutSessionId: row.stripe_checkout_session_id || '',
            amountIdr: row.amount_idr,
            currentPeriodEnd: row.current_period_end,
            createdAt: row.created_at,
          }));
        }
      } catch {
        // Fallback
      }
    }

    const normalizedEmail = email.toLowerCase();
    return this.local.subscriptions.filter(
      (s) => s.userId === userId || s.userEmail.toLowerCase() === normalizedEmail,
    );
  }

  async cancelSubscription(subscriptionId: string, user: UserProfile): Promise<SubscriptionRecord> {
    const target = this.local.subscriptions.find((s) => s.id === subscriptionId);
    if (!target) {
      throw new Error('NOT_FOUND');
    }
    if (
      user.role !== 'admin' &&
      target.userId !== user.id &&
      target.userEmail.toLowerCase() !== user.email.toLowerCase()
    ) {
      throw new Error('FORBIDDEN');
    }

    target.status = 'canceled';
    this.saveLocalStore();

    if (supabaseAdmin) {
      void supabaseAdmin
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('id', subscriptionId);
    }

    realtimeBroker.publish({ event: 'subscription:updated', data: target });
    await this.recordActivity({
      userId: user.id,
      actorEmail: user.email,
      actorName: user.fullName,
      action: `Membatalkan langganan ${target.planName}`,
      category: 'subscription',
    });

    return target;
  }

  async getOrderByCode(orderCode: string): Promise<OrderRecord | null> {
    const cleaned = orderCode.replace(/^#/, '').trim().toUpperCase();
    if (supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('order_code', cleaned)
          .maybeSingle();
        if (data) {
          return this.mapSupabaseOrder(data);
        }
      } catch {
        // Fallback
      }
    }
    return this.local.orders.find((o) => o.orderCode.toUpperCase() === cleaned) ?? null;
  }

  async getUserOrders(user: UserProfile): Promise<OrderRecord[]> {
    const normalizedEmail = user.email.toLowerCase();
    if (supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from('orders')
          .select('*')
          .or(`user_id.eq.${user.id},customer_email.eq.${normalizedEmail}`)
          .order('created_at', { ascending: false })
          .limit(30);
        if (data) {
          return data.map((r) => this.mapSupabaseOrder(r));
        }
      } catch {
        // Fallback
      }
    }
    return this.local.orders.filter(
      (o) => o.userId === user.id || o.customerEmail.toLowerCase() === normalizedEmail,
    );
  }

  async createOrderAndTransaction(params: {
    order: OrderRecord;
    transactionStatus: TransactionRecord['status'];
    paymentProvider: TransactionRecord['paymentProvider'];
    stripeSessionId?: string;
    description: string;
  }): Promise<{ order: OrderRecord; transaction: TransactionRecord }> {
    const tx: TransactionRecord = {
      id: `tx-${crypto.randomUUID()}`,
      referenceCode: `TRX-${params.order.orderCode}`,
      orderCode: params.order.orderCode,
      userId: params.order.userId,
      customerName: params.order.customerName,
      customerEmail: params.order.customerEmail,
      type: 'order',
      paymentProvider: params.paymentProvider,
      amountIdr: params.order.totalIdr,
      status: params.transactionStatus,
      stripeSessionId: params.stripeSessionId,
      description: params.description,
      createdAt: params.order.createdAt,
    };

    this.local.orders.unshift(params.order);
    this.local.transactions.unshift(tx);
    this.saveLocalStore();

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('orders').insert({
          id: params.order.id,
          order_code: params.order.orderCode,
          user_id: params.order.userId,
          customer_name: params.order.customerName,
          customer_email: params.order.customerEmail,
          fulfillment_mode: params.order.fulfillmentMode,
          table_or_note: params.order.tableOrNote,
          items: params.order.items,
          promo_code: params.order.promoCode ?? null,
          subtotal_idr: params.order.subtotalIdr,
          discount_idr: params.order.discountIdr,
          tax_idr: params.order.taxIdr,
          total_idr: params.order.totalIdr,
          payment_method: params.order.paymentMethod,
          status: params.order.status,
          created_at: params.order.createdAt,
        });
        await supabaseAdmin.from('transactions').insert({
          id: tx.id,
          reference_code: tx.referenceCode,
          order_code: tx.orderCode ?? null,
          user_id: tx.userId,
          customer_name: tx.customerName,
          customer_email: tx.customerEmail,
          type: tx.type,
          payment_provider: tx.paymentProvider,
          amount_idr: tx.amountIdr,
          status: tx.status,
          stripe_session_id: tx.stripeSessionId ?? null,
          description: tx.description,
          created_at: tx.createdAt,
        });
      } catch {
        // Local persistence remains operational
      }
    }

    realtimeBroker.publish({ event: 'order:created', data: params.order });
    realtimeBroker.publish({ event: 'transaction:created', data: tx });
    await this.recordActivity({
      userId: params.order.userId,
      actorEmail: params.order.customerEmail,
      actorName: params.order.customerName,
      action: `Pesanan baru #${params.order.orderCode} (${params.order.fulfillmentMode} · ${params.paymentProvider})`,
      category: 'order',
    });

    return { order: params.order, transaction: tx };
  }

  async updateOrderStatus(
    orderIdOrCode: string,
    nextStatus: OrderStatus,
    actor: UserProfile,
  ): Promise<{ order: OrderRecord; transaction: TransactionRecord | null }> {
    const order = this.local.orders.find(
      (o) => o.id === orderIdOrCode || o.orderCode === orderIdOrCode,
    );
    if (!order) {
      throw new Error('NOT_FOUND');
    }

    order.status = nextStatus;

    let linkedTx: TransactionRecord | null =
      this.local.transactions.find((t) => t.orderCode === order.orderCode) ?? null;

    if (linkedTx) {
      if (nextStatus === 'preparing' || nextStatus === 'ready' || nextStatus === 'completed') {
        if (linkedTx.status === 'pending') {
          linkedTx.status = 'succeeded';
        }
      } else if (nextStatus === 'canceled') {
        linkedTx.status = linkedTx.status === 'succeeded' ? 'refunded' : 'failed';
      }
    }

    this.saveLocalStore();

    if (supabaseAdmin) {
      void supabaseAdmin.from('orders').update({ status: nextStatus }).eq('id', order.id);
      if (linkedTx) {
        void supabaseAdmin
          .from('transactions')
          .update({ status: linkedTx.status })
          .eq('id', linkedTx.id);
      }
    }

    realtimeBroker.publish({ event: 'order:updated', data: order });
    if (linkedTx) {
      realtimeBroker.publish({ event: 'transaction:updated', data: linkedTx });
    }

    const statusLabelMap: Record<OrderStatus, string> = {
      pending_payment: 'Menunggu Pembayaran',
      preparing: 'Diproses Barista',
      ready: 'Siap Diambil',
      completed: 'Selesai',
      canceled: 'Dibatalkan',
    };

    await this.recordActivity({
      userId: actor.id,
      actorEmail: actor.email,
      actorName: actor.fullName,
      action: `Mengubah status #${order.orderCode} → ${statusLabelMap[nextStatus]}`,
      category: 'admin',
    });

    return { order, transaction: linkedTx };
  }

  async createReservation(
    reservation: ReservationRecord,
  ): Promise<ReservationRecord> {
    this.local.reservations.unshift(reservation);
    this.saveLocalStore();

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('reservations').insert({
          id: reservation.id,
          reservation_code: reservation.reservationCode,
          user_id: reservation.userId,
          customer_name: reservation.customerName,
          customer_email: reservation.customerEmail,
          phone: reservation.phone,
          guests: reservation.guests,
          table_number: reservation.tableNumber,
          reservation_date: reservation.reservationDate,
          reservation_time: reservation.reservationTime,
          notes: reservation.notes ?? null,
          status: reservation.status,
          created_at: reservation.createdAt,
        });
      } catch {
        // Non-fatal
      }
    }

    realtimeBroker.publish({ event: 'reservation:created', data: reservation });
    await this.recordActivity({
      userId: reservation.userId,
      actorEmail: reservation.customerEmail,
      actorName: reservation.customerName,
      action: `Reservasi Dine-In ${reservation.reservationCode} (${reservation.tableNumber} · ${reservation.guests} tamu)`,
      category: 'reservation',
    });

    return reservation;
  }

  async updateReservationStatus(
    reservationId: string,
    status: ReservationRecord['status'],
    actor: UserProfile,
  ): Promise<ReservationRecord> {
    const resRecord = this.local.reservations.find((r) => r.id === reservationId);
    if (!resRecord) {
      throw new Error('NOT_FOUND');
    }
    resRecord.status = status;
    this.saveLocalStore();

    if (supabaseAdmin) {
      void supabaseAdmin
        .from('reservations')
        .update({ status })
        .eq('id', reservationId);
    }

    realtimeBroker.publish({ event: 'reservation:updated', data: resRecord });
    await this.recordActivity({
      userId: actor.id,
      actorEmail: actor.email,
      actorName: actor.fullName,
      action: `Status reservasi ${resRecord.reservationCode} → ${status}`,
      category: 'reservation',
    });

    return resRecord;
  }

  async getUserReservations(user: UserProfile): Promise<ReservationRecord[]> {
    const normalizedEmail = user.email.toLowerCase();
    return this.local.reservations.filter(
      (r) => r.userId === user.id || r.customerEmail.toLowerCase() === normalizedEmail,
    );
  }

  createSandboxSession(session: SandboxStripeSession): SandboxStripeSession {
    this.local.sandboxSessions.unshift(session);
    this.saveLocalStore();
    return session;
  }

  getSandboxSession(sessionId: string): SandboxStripeSession | null {
    return this.local.sandboxSessions.find((s) => s.id === sessionId) ?? null;
  }

  async createPendingSubscriptionTransaction(params: {
    user: UserProfile;
    plan: SubscriptionPlan;
    stripeSessionId: string;
  }): Promise<TransactionRecord> {
    const nowIso = new Date().toISOString();
    const tx: TransactionRecord = {
      id: `tx-${crypto.randomUUID()}`,
      referenceCode: `TX-SUB-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: params.user.id,
      customerName: params.user.fullName,
      customerEmail: params.user.email,
      type: 'subscription',
      paymentProvider: 'Stripe',
      amountIdr: params.plan.priceIdr,
      status: 'pending',
      stripeSessionId: params.stripeSessionId,
      description: `Langganan Bulanan · ${params.plan.name}`,
      createdAt: nowIso,
    };

    this.local.transactions.unshift(tx);
    this.saveLocalStore();

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('transactions').insert({
          id: tx.id,
          reference_code: tx.referenceCode,
          user_id: tx.userId,
          customer_name: tx.customerName,
          customer_email: tx.customerEmail,
          type: tx.type,
          payment_provider: tx.paymentProvider,
          amount_idr: tx.amountIdr,
          status: tx.status,
          stripe_session_id: tx.stripeSessionId ?? null,
          description: tx.description,
          created_at: tx.createdAt,
        });
      } catch {
        // Local fallback remains authoritative
      }
    }

    realtimeBroker.publish({ event: 'transaction:created', data: tx });
    await this.recordActivity({
      userId: params.user.id,
      actorEmail: params.user.email,
      actorName: params.user.fullName,
      action: `Membuka sesi Stripe Checkout untuk paket ${params.plan.name}`,
      category: 'payment',
    });

    return tx;
  }

  async completeStripeCheckout(params: {
    stripeSessionId: string;
    stripeSubscriptionId?: string;
    mode: 'subscription' | 'payment';
    planId?: string;
    orderId?: string;
    userId?: string | null;
    customerEmail: string;
    customerName: string;
  }): Promise<{
    transaction: TransactionRecord | null;
    subscription?: SubscriptionRecord;
    order?: OrderRecord;
  }> {
    const sandbox = this.local.sandboxSessions.find((s) => s.id === params.stripeSessionId);
    if (sandbox) {
      sandbox.status = 'complete';
    }

    const tx = this.local.transactions.find((t) => t.stripeSessionId === params.stripeSessionId) ?? null;
    if (tx) {
      tx.status = 'succeeded';
      if (supabaseAdmin) {
        void supabaseAdmin
          .from('transactions')
          .update({ status: 'succeeded' })
          .eq('id', tx.id);
      }
      realtimeBroker.publish({ event: 'transaction:updated', data: tx });
    }

    let updatedOrder: OrderRecord | undefined;
    if (params.mode === 'payment' && params.orderId) {
      const order = this.local.orders.find((o) => o.id === params.orderId);
      if (order) {
        order.status = 'preparing';
        updatedOrder = order;
        if (supabaseAdmin) {
          void supabaseAdmin.from('orders').update({ status: 'preparing' }).eq('id', order.id);
        }
        realtimeBroker.publish({ event: 'order:updated', data: order });
      }
    }

    let createdSub: SubscriptionRecord | undefined;
    if (params.mode === 'subscription' && params.planId) {
      const plan = this.local.plans.find((p) => p.id === params.planId);
      if (plan) {
        for (const existingSub of this.local.subscriptions) {
          if (
            existingSub.status === 'active' &&
            ((params.userId && existingSub.userId === params.userId) ||
              existingSub.userEmail.toLowerCase() === params.customerEmail.toLowerCase())
          ) {
            existingSub.status = 'canceled';
          }
        }

        const nowDate = new Date();
        const nextMonth = new Date(nowDate.getTime() + 30 * 86_400_000);
        createdSub = {
          id: `sub-${crypto.randomUUID()}`,
          userId: params.userId ?? null,
          userEmail: params.customerEmail,
          userName: params.customerName,
          planId: plan.id,
          planName: plan.name,
          status: 'active',
          stripeSubscriptionId:
            params.stripeSubscriptionId || `sub_stripe_${crypto.randomBytes(6).toString('hex')}`,
          stripeCheckoutSessionId: params.stripeSessionId,
          amountIdr: plan.priceIdr,
          currentPeriodEnd: nextMonth.toISOString(),
          createdAt: nowDate.toISOString(),
        };

        this.local.subscriptions.unshift(createdSub);

        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from('subscriptions').insert({
              id: createdSub.id,
              user_id: createdSub.userId,
              user_email: createdSub.userEmail,
              plan_id: createdSub.planId,
              plan_name: createdSub.planName,
              status: createdSub.status,
              stripe_subscription_id: createdSub.stripeSubscriptionId,
              stripe_checkout_session_id: createdSub.stripeCheckoutSessionId,
              amount_idr: createdSub.amountIdr,
              current_period_end: createdSub.currentPeriodEnd,
              created_at: createdSub.createdAt,
            });
          } catch {
            // Non-fatal
          }
        }

        realtimeBroker.publish({ event: 'subscription:updated', data: createdSub });
      }
    }

    this.saveLocalStore();
    await this.recordActivity({
      userId: params.userId ?? null,
      actorEmail: params.customerEmail,
      actorName: params.customerName,
      action:
        params.mode === 'subscription'
          ? `Pembayaran langganan Stripe terkonfirmasi (${createdSub?.planName ?? 'Member'})`
          : `Pembayaran Stripe pesanan #${updatedOrder?.orderCode ?? ''} terkonfirmasi`,
      category: 'payment',
    });

    return { transaction: tx, subscription: createdSub, order: updatedOrder };
  }

  async recordActivity(params: {
    userId: string | null;
    actorEmail: string;
    actorName: string;
    action: string;
    category: ActivityCategory;
    metadata?: Record<string, string | number | boolean>;
  }): Promise<ActivityLog> {
    const entry: ActivityLog = {
      id: `act-${crypto.randomUUID()}`,
      userId: params.userId,
      actorEmail: params.actorEmail,
      actorName: params.actorName,
      action: params.action,
      category: params.category,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };

    this.local.activities.unshift(entry);
    if (this.local.activities.length > 250) {
      this.local.activities = this.local.activities.slice(0, 250);
    }
    this.saveLocalStore();

    if (supabaseAdmin) {
      void supabaseAdmin.from('activity_logs').insert({
        id: entry.id,
        user_id: entry.userId,
        actor_email: entry.actorEmail,
        actor_name: entry.actorName,
        action: entry.action,
        category: entry.category,
        metadata: entry.metadata ?? {},
        created_at: entry.createdAt,
      });
    }

    realtimeBroker.publish({ event: 'activity:created', data: entry });
    return entry;
  }

  private mapSupabaseOrder(r: Record<string, unknown>): OrderRecord {
    return {
      id: String(r.id),
      orderCode: String(r.order_code),
      userId: (r.user_id as string | null) ?? null,
      customerName: String(r.customer_name),
      customerEmail: String(r.customer_email),
      fulfillmentMode: r.fulfillment_mode as OrderRecord['fulfillmentMode'],
      tableOrNote: String(r.table_or_note ?? ''),
      items: Array.isArray(r.items) ? (r.items as OrderRecord['items']) : [],
      promoCode: (r.promo_code as string | null) ?? undefined,
      subtotalIdr: Number(r.subtotal_idr ?? 0),
      discountIdr: Number(r.discount_idr ?? 0),
      taxIdr: Number(r.tax_idr ?? 0),
      totalIdr: Number(r.total_idr ?? 0),
      paymentMethod: r.payment_method as OrderRecord['paymentMethod'],
      status: r.status as OrderRecord['status'],
      createdAt: String(r.created_at),
    };
  }

  async getAdminData(): Promise<{
    transactions: TransactionRecord[];
    activities: ActivityLog[];
    subscriptions: SubscriptionRecord[];
    orders: OrderRecord[];
    reservations: ReservationRecord[];
    products: Product[];
    users: UserProfile[];
  }> {
    if (supabaseAdmin) {
      try {
        const [txRes, actRes, subRes, ordRes, resRes, profRes] = await Promise.all([
          supabaseAdmin
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100),
          supabaseAdmin
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100),
          supabaseAdmin
            .from('subscriptions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100),
          supabaseAdmin
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100),
          supabaseAdmin
            .from('reservations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100),
          supabaseAdmin
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100),
        ]);

        if (!txRes.error && txRes.data && txRes.data.length > 0) {
          const products = await this.getProducts();
          return {
            transactions: txRes.data.map((r) => ({
              id: r.id,
              referenceCode: r.reference_code,
              orderCode: r.order_code ?? undefined,
              userId: r.user_id,
              customerName: r.customer_name,
              customerEmail: r.customer_email,
              type: r.type,
              paymentProvider: r.payment_provider,
              amountIdr: r.amount_idr,
              status: r.status,
              stripeSessionId: r.stripe_session_id ?? undefined,
              description: r.description,
              createdAt: r.created_at,
            })),
            activities: (actRes.data ?? []).map((r) => ({
              id: r.id,
              userId: r.user_id,
              actorEmail: r.actor_email,
              actorName: r.actor_name,
              action: r.action,
              category: r.category,
              metadata: r.metadata ?? undefined,
              createdAt: r.created_at,
            })),
            subscriptions: (subRes.data ?? []).map((r) => ({
              id: r.id,
              userId: r.user_id,
              userEmail: r.user_email,
              userName: r.user_email.split('@')[0],
              planId: r.plan_id,
              planName: r.plan_name,
              status: r.status,
              stripeSubscriptionId: r.stripe_subscription_id || '',
              stripeCheckoutSessionId: r.stripe_checkout_session_id || '',
              amountIdr: r.amount_idr,
              currentPeriodEnd: r.current_period_end,
              createdAt: r.created_at,
            })),
            orders: (ordRes.data ?? []).map((r) => this.mapSupabaseOrder(r)),
            reservations: (resRes.data ?? []).map((r) => ({
              id: r.id,
              reservationCode: r.reservation_code,
              userId: r.user_id,
              customerName: r.customer_name,
              customerEmail: r.customer_email,
              phone: r.phone,
              guests: r.guests,
              tableNumber: r.table_number,
              reservationDate: r.reservation_date,
              reservationTime: r.reservation_time,
              notes: r.notes ?? undefined,
              status: r.status,
              createdAt: r.created_at,
            })),
            products,
            users: (profRes.data ?? []).map((r) => ({
              id: r.id,
              email: r.email,
              fullName: r.full_name,
              role: r.role,
              stripeCustomerId: r.stripe_customer_id ?? undefined,
              createdAt: r.created_at,
              lastActiveAt: r.last_active_at,
            })),
          };
        }
      } catch {
        // Fallback to local datastore
      }
    }

    return {
      transactions: this.local.transactions,
      activities: this.local.activities,
      subscriptions: this.local.subscriptions,
      orders: this.local.orders,
      reservations: this.local.reservations,
      products: this.local.products,
      users: this.local.users.map((u) => this.stripHash(u)),
    };
  }
}

export const botanicalStore = new BotanicalStore();
