import { useCallback, useEffect, useState } from 'react';
import { AccountDrawer } from './components/AccountDrawer';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { CheckoutView } from './components/CheckoutView';
import { MenuCatalogView } from './components/MenuCatalogView';
import { Navbar, type AppView } from './components/Navbar';
import { OrderTrackingView } from './components/OrderTrackingView';
import { ReservationModal } from './components/ReservationModal';
import { StripeCheckoutModal } from './components/StripeCheckoutModal';
import { SubscriptionSection } from './components/SubscriptionSection';
import { WelcomeView } from './components/WelcomeView';
import {
  bootstrapAdminAccount,
  cancelSubscription,
  confirmSandboxStripeSession,
  createOrder,
  createReservation,
  createSubscriptionCheckout,
  fetchCurrentUser,
  fetchMenu,
  fetchPlans,
  fetchPublicConfig,
  loginAccount,
  logoutAccount,
  registerAccount,
} from './lib/api';
import { getSupabaseBrowserClient } from './lib/supabaseClient';
import type {
  CartItem,
  FulfillmentMode,
  OrderRecord,
  PaymentMethod,
  Product,
  PublicConfig,
  SubscriptionPlan,
  SubscriptionRecord,
  UserProfile,
} from './shared/types';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'menu';
    }
    return 'welcome';
  });

  const [publicConfig, setPublicConfig] = useState<PublicConfig>({
    supabaseConfigured: false,
    supabaseUrl: null,
    supabaseAnonKey: null,
    stripeConfigured: false,
    hasAdminClaimed: false,
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Auth state held in memory (Supabase manages its own browser storage when configured)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userSubscriptions, setUserSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [userOrders, setUserOrders] = useState<OrderRecord[]>([]);

  // Storefront flow & fulfillment mode
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>('Take Away');
  const [tableOrNote, setTableOrNote] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<OrderRecord | null>(null);

  // Modals & Drawers
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authContextMessage, setAuthContextMessage] = useState<string | null>(null);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);

  // Stripe Subscriptions & Sandbox Checkout Modal
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [cancelingSubId, setCancelingSubId] = useState<string | null>(null);
  const [stripeSessionModal, setStripeSessionModal] = useState<{
    sessionId: string;
    title: string;
    description: string;
    amountIdr: number;
    customerEmail: string;
    isSubscription: boolean;
    pendingOrder?: OrderRecord;
  } | null>(null);
  const [stripeConfirming, setStripeConfirming] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const syncUserFromToken = useCallback(async (token: string) => {
    try {
      const me = await fetchCurrentUser(token);
      setUser(me.user);
      setUserSubscriptions(me.subscriptions);
      setUserOrders(me.orders);
      setAuthToken(token);
    } catch {
      setUser(null);
      setUserSubscriptions([]);
      setUserOrders([]);
      setAuthToken(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [cfg, menuRes, plansRes] = await Promise.all([
          fetchPublicConfig(),
          fetchMenu(),
          fetchPlans(),
        ]);
        if (!active) return;
        setPublicConfig(cfg);
        setProducts(menuRes.products);
        setPlans(plansRes.plans);

        const supabase = getSupabaseBrowserClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const accessToken = data.session?.access_token;
          if (accessToken) {
            await syncUserFromToken(accessToken);
          }
        }
      } catch (err) {
        console.error('Failed initial load:', err);
      } finally {
        if (active) setLoadingCatalog(false);
      }
    }

    void init();

    const urlParams = new URLSearchParams(window.location.search);
    const stripeStatus = urlParams.get('stripe_status');
    if (stripeStatus === 'success') {
      setBannerMessage('Pembayaran Stripe berhasil dikonfirmasi. Terima kasih telah bersama Green Cafe.');
    } else if (stripeStatus === 'canceled') {
      setBannerMessage('Sesi pembayaran Stripe dibatalkan.');
    }

    return () => {
      active = false;
    };
  }, [syncUserFromToken]);

  const activeSubscription = userSubscriptions.find((s) => s.status === 'active') ?? null;
  const activePlan = activeSubscription
    ? plans.find((p) => p.id === activeSubscription.planId)
    : undefined;
  const subscriberDiscountPct = activePlan?.cafeDiscountPct ?? 0;

  const handleNavigate = (view: AppView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient(
      publicConfig.supabaseUrl,
      publicConfig.supabaseAnonKey,
    );

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session?.access_token) {
        throw new Error(error?.message || 'Gagal masuk melalui Supabase Auth.');
      }
      await syncUserFromToken(data.session.access_token);
    } else {
      const res = await loginAccount({ email, password });
      setAuthToken(res.token);
      setUser(res.user);
      const me = await fetchCurrentUser(res.token);
      setUserSubscriptions(me.subscriptions);
      setUserOrders(me.orders);
    }
    setAuthContextMessage(null);
  };

  const handleRegister = async (fullName: string, email: string, password: string) => {
    const supabase = getSupabaseBrowserClient(
      publicConfig.supabaseUrl,
      publicConfig.supabaseAnonKey,
    );

    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) {
        throw new Error(error.message);
      }
      if (data.session?.access_token) {
        await syncUserFromToken(data.session.access_token);
      } else {
        setBannerMessage(
          'Akun berhasil dibuat. Periksa kotak masuk email Anda untuk verifikasi Supabase.',
        );
      }
    } else {
      const res = await registerAccount({ fullName, email, password });
      setAuthToken(res.token);
      setUser(res.user);
      setUserSubscriptions([]);
      setUserOrders([]);
    }
    setAuthContextMessage(null);
  };

  const handleClaimFirstAdmin = async (payload: {
    fullName: string;
    email: string;
    password: string;
  }) => {
    const res = await bootstrapAdminAccount(payload);
    setAuthToken(res.token);
    setUser(res.user);
    setUserSubscriptions([]);
    setPublicConfig((prev) => ({ ...prev, hasAdminClaimed: true }));
  };

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient(
      publicConfig.supabaseUrl,
      publicConfig.supabaseAnonKey,
    );
    if (supabase) {
      await supabase.auth.signOut();
    }
    await logoutAccount(authToken).catch(() => undefined);
    setAuthToken(null);
    setUser(null);
    setUserSubscriptions([]);
    setUserOrders([]);
    setAccountDrawerOpen(false);
    if (activeView === 'admin') {
      setActiveView('welcome');
    }
  };

  const handleAddToCart = (product: Product) => {
    setOrderError(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(50, item.quantity + 1) }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const handleUpdateNote = (productId: string, note: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, note } : item,
      ),
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleSubmitReservation = async (payload: {
    customerName: string;
    customerEmail: string;
    phone: string;
    guests: number;
    tableNumber: string;
    reservationDate: string;
    reservationTime: string;
    notes?: string;
  }) => {
    setReservationSubmitting(true);
    try {
      const res = await createReservation(payload, authToken);
      setBannerMessage(
        `Reservasi meja ${res.reservation.reservationCode} (${res.reservation.tableNumber}) berhasil dikonfirmasi.`,
      );
      return res.reservation;
    } finally {
      setReservationSubmitting(false);
    }
  };

  const handleSubmitOrder = async (payload: {
    customerName: string;
    customerEmail: string;
    fulfillmentMode: FulfillmentMode;
    tableOrNote: string;
    paymentMethod: PaymentMethod;
    promoCode?: string;
  }): Promise<OrderRecord | null> => {
    setOrderSubmitting(true);
    setOrderError(null);
    try {
      const res = await createOrder(
        {
          ...payload,
          items: cart.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            unitPriceIdr: item.product.priceIdr,
            customization: item.customization,
            note: item.note?.trim() || undefined,
          })),
        },
        authToken,
      );

      if (res.checkoutMode === 'stripe_live' && res.checkoutUrl) {
        window.location.assign(res.checkoutUrl);
        return null;
      }

      if (res.checkoutMode === 'stripe_sandbox' && res.sessionId) {
        setStripeSessionModal({
          sessionId: res.sessionId,
          title: `Pembayaran Pesanan #${res.order.orderCode}`,
          description: res.transaction.description,
          amountIdr: res.order.totalIdr,
          customerEmail: res.order.customerEmail,
          isSubscription: false,
          pendingOrder: res.order,
        });
        setUserOrders((prev) => [res.order, ...prev]);
        setCart([]);
        return res.order;
      }

      setUserOrders((prev) => [res.order, ...prev]);
      setCart([]);
      return res.order;
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Gagal memproses pesanan.');
      return null;
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!user || !authToken) {
      setAuthContextMessage(
        `Masuk atau daftar terlebih dahulu untuk mengaktifkan paket langganan ${plan.name} via Stripe.`,
      );
      setAuthModalOpen(true);
      return;
    }

    setSubscribingPlanId(plan.id);
    try {
      const res = await createSubscriptionCheckout(plan.id, authToken);
      if (res.checkoutMode === 'stripe_live' && res.checkoutUrl) {
        window.location.assign(res.checkoutUrl);
        return;
      }

      setStripeSessionModal({
        sessionId: res.sessionId,
        title: `Langganan ${plan.name}`,
        description: `Paket bulanan ${plan.bagsPerMonth}× 250g · Diskon kafe ${plan.cafeDiscountPct}%`,
        amountIdr: plan.priceIdr,
        customerEmail: user.email,
        isSubscription: true,
      });
    } catch (err) {
      setBannerMessage(
        err instanceof Error ? err.message : 'Gagal memulai langganan Stripe.',
      );
    } finally {
      setSubscribingPlanId(null);
    }
  };

  const handleConfirmStripeSandbox = async (sessionId: string) => {
    setStripeConfirming(true);
    try {
      const pendingOrder = stripeSessionModal?.pendingOrder;
      const result = await confirmSandboxStripeSession(sessionId, authToken);
      setStripeSessionModal(null);

      if (result.subscription) {
        setUserSubscriptions((prev) => [
          result.subscription!,
          ...prev.filter((s) => s.id !== result.subscription!.id),
        ]);
        setBannerMessage(
          `Langganan ${result.subscription.planName} aktif! Diskon Green Club diterapkan otomatis saat checkout.`,
        );
      } else if (result.order || pendingOrder) {
        const finalOrder = result.order ?? pendingOrder!;
        setTrackedOrder(finalOrder);
        setUserOrders((prev) =>
          prev.map((o) => (o.id === finalOrder.id ? finalOrder : o)),
        );
        setBannerMessage(
          `Pembayaran Stripe untuk pesanan #${finalOrder.orderCode} berhasil dikonfirmasi.`,
        );
        handleNavigate('tracking');
      } else {
        setBannerMessage('Pembayaran Stripe berhasil dikonfirmasi.');
      }
    } finally {
      setStripeConfirming(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!authToken) return;
    setCancelingSubId(subscriptionId);
    try {
      const { subscription } = await cancelSubscription(subscriptionId, authToken);
      setUserSubscriptions((prev) =>
        prev.map((s) => (s.id === subscription.id ? subscription : s)),
      );
    } finally {
      setCancelingSubId(null);
    }
  };

  const handleProductUpdated = useCallback((updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
    );
  }, []);

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#fcf9f2] text-[#1c1c18]">
      <Navbar
        activeView={activeView}
        fulfillmentMode={fulfillmentMode}
        cartCount={totalCartItems}
        user={user}
        onNavigate={handleNavigate}
        onOpenReservation={() => setReservationModalOpen(true)}
        onOpenAuth={() => {
          setAuthContextMessage(null);
          setAuthModalOpen(true);
        }}
        onOpenAccount={() => setAccountDrawerOpen(true)}
      />

      {bannerMessage && activeView !== 'admin' && (
        <div
          role="status"
          className="fixed top-24 right-4 z-40 flex max-w-md items-center justify-between gap-3 rounded-2xl border border-[#c4c8c0] bg-[#fcf9f2]/95 px-4 py-3 text-xs font-medium text-[#182519] shadow-lg backdrop-blur-md"
        >
          <span>{bannerMessage}</span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="shrink-0 font-semibold text-[#7a582f] underline underline-offset-2"
          >
            Tutup
          </button>
        </div>
      )}

      <main>
        {activeView === 'welcome' && (
          <WelcomeView
            onSelectDineIn={() => setReservationModalOpen(true)}
            onSelectTakeAway={() => {
              setFulfillmentMode('Take Away');
              handleNavigate('menu');
            }}
            onOpenSubscriptions={() => handleNavigate('subscriptions')}
          />
        )}

        {activeView === 'menu' && (
          <MenuCatalogView
            products={products}
            loading={loadingCatalog}
            cart={cart}
            onAddToCart={handleAddToCart}
            onGoToCheckout={() => handleNavigate('checkout')}
          />
        )}

        {activeView === 'checkout' && (
          <CheckoutView
            items={cart}
            user={user}
            fulfillmentMode={fulfillmentMode}
            tableOrNote={tableOrNote}
            activeSubscription={activeSubscription}
            subscriberDiscountPct={subscriberDiscountPct}
            submitting={orderSubmitting}
            errorMessage={orderError}
            onChangeFulfillmentMode={setFulfillmentMode}
            onChangeTableOrNote={setTableOrNote}
            onUpdateQty={handleUpdateQty}
            onUpdateNote={handleUpdateNote}
            onRemoveItem={handleRemoveItem}
            onNavigateWelcome={() => handleNavigate('welcome')}
            onNavigateMenu={() => handleNavigate('menu')}
            onSubmitOrder={handleSubmitOrder}
            onOrderConfirmedNavigate={(order) => {
              setTrackedOrder(order);
              handleNavigate('tracking');
            }}
          />
        )}

        {activeView === 'tracking' && (
          <OrderTrackingView
            initialOrder={trackedOrder}
            pastOrders={userOrders}
            onBackHome={() => handleNavigate('welcome')}
            onOrderAgain={() => handleNavigate('menu')}
          />
        )}

        {activeView === 'subscriptions' && (
          <SubscriptionSection
            plans={plans}
            activeSubscription={activeSubscription}
            subscribingPlanId={subscribingPlanId}
            onSelectPlan={(plan) => void handleSelectPlan(plan)}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboard
            user={user}
            authToken={authToken}
            publicConfig={publicConfig}
            onClaimFirstAdmin={handleClaimFirstAdmin}
            onOpenAuth={() => {
              setAuthContextMessage('Masuk menggunakan akun Administrator / Barista untuk membuka dasbor.');
              setAuthModalOpen(true);
            }}
            onBackToStore={() => handleNavigate('welcome')}
            onLogout={handleLogout}
            onProductUpdated={handleProductUpdated}
          />
        )}
      </main>

      <ReservationModal
        open={reservationModalOpen}
        user={user}
        submitting={reservationSubmitting}
        onClose={() => setReservationModalOpen(false)}
        onSubmitReservation={handleSubmitReservation}
        onProceedToMenu={(tableLabel) => {
          setReservationModalOpen(false);
          setFulfillmentMode('Dine-In');
          setTableOrNote(tableLabel);
          handleNavigate('menu');
        }}
      />

      <AuthModal
        open={authModalOpen}
        supabaseConfigured={publicConfig.supabaseConfigured}
        contextMessage={authContextMessage}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <AccountDrawer
        open={accountDrawerOpen}
        user={user}
        subscriptions={userSubscriptions}
        cancelingId={cancelingSubId}
        onClose={() => setAccountDrawerOpen(false)}
        onCancelSubscription={handleCancelSubscription}
        onOpenAdmin={() => handleNavigate('admin')}
        onLogout={handleLogout}
      />

      <StripeCheckoutModal
        session={stripeSessionModal}
        processing={stripeConfirming}
        onClose={() => setStripeSessionModal(null)}
        onConfirmPayment={handleConfirmStripeSandbox}
      />
    </div>
  );
}
