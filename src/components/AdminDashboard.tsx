import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  Coffee,
  Download,
  Leaf,
  LogOut,
  Menu,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Timer,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  downloadTransactionsCsv,
  fetchAdminOverview,
  requestAdminStreamTicket,
  updateAdminOrderStatus,
  updateAdminProduct,
  updateAdminReservationStatus,
} from '../lib/api';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';
import {
  computeAdminOverview,
  filterTransactions,
  formatRupiah,
} from '../shared/pricing';
import type {
  ActivityLog,
  OrderRecord,
  OrderStatus,
  Product,
  PublicConfig,
  ReservationRecord,
  SubscriptionRecord,
  TransactionRecord,
  TransactionStatus,
  TransactionType,
  UserProfile,
} from '../shared/types';

interface AdminDashboardProps {
  user: UserProfile | null;
  authToken: string | null;
  publicConfig: PublicConfig;
  onClaimFirstAdmin: (payload: {
    fullName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  onOpenAuth: () => void;
  onBackToStore: () => void;
  onLogout: () => Promise<void>;
  onProductUpdated?: (product: Product) => void;
}

type AdminSection = 'pesanan' | 'kelola-menu' | 'reservasi' | 'laporan';

const TX_STATUS_LABELS: Record<TransactionStatus, { label: string; className: string }> = {
  succeeded: { label: 'Berhasil', className: 'bg-[#d7e7d3] text-[#111f12]' },
  pending: { label: 'Menunggu', className: 'bg-[#ffddba] text-[#5f401a]' },
  failed: { label: 'Gagal', className: 'bg-[#ffdad6] text-[#93000a]' },
  refunded: { label: 'Dikembalikan', className: 'bg-[#ebe8e1] text-[#444842]' },
};

const ACTIVITY_CATEGORY_LABELS: Record<ActivityLog['category'], string> = {
  auth: 'Autentikasi',
  order: 'Pesanan',
  reservation: 'Reservasi',
  subscription: 'Langganan',
  payment: 'Pembayaran',
  admin: 'Admin',
};

const RESERVATION_STATUS_BADGE: Record<
  ReservationRecord['status'],
  { label: string; className: string }
> = {
  confirmed: { label: 'Terkonfirmasi', className: 'bg-[#d7e7d3] text-[#111f12]' },
  seated: { label: 'Sudah Duduk', className: 'bg-[#fecf9d] text-[#2b1700]' },
  completed: { label: 'Selesai', className: 'bg-[#ebe8e1] text-[#444842]' },
  canceled: { label: 'Dibatalkan', className: 'bg-[#ffdad6] text-[#93000a]' },
};

export function AdminDashboard({
  user,
  authToken,
  publicConfig,
  onClaimFirstAdmin,
  onOpenAuth,
  onBackToStore,
  onLogout,
  onProductUpdated,
}: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('pesanan');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wibClock, setWibClock] = useState(() =>
    new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  );

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Order queue filters
  const [orderTab, setOrderTab] = useState<'all' | 'pending_payment' | 'preparing' | 'ready'>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState<'oldest' | 'newest' | 'highest'>('newest');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  // Menu management state
  const [menuSearch, setMenuSearch] = useState('');
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  // Reservation busy state
  const [busyResId, setBusyResId] = useState<string | null>(null);

  // Laporan (Real-time transactions & activity) filters
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txStatusFilter, setTxStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [txTypeFilter, setTxTypeFilter] = useState<TransactionType | 'all'>('all');
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'connected' | 'offline'>(
    'offline',
  );
  const [exporting, setExporting] = useState(false);

  // First-Run Admin Claim state
  const [claimName, setClaimName] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimPassword, setClaimPassword] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Live WIB clock in fixed top bar
  useEffect(() => {
    const timer = setInterval(() => {
      setWibClock(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!authToken || user?.role !== 'admin') return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminOverview(authToken);
      setTransactions(data.transactions);
      setActivities(data.activities);
      setSubscriptions(data.subscriptions);
      setOrders(data.orders);
      setReservations(data.reservations);
      setProducts(data.products);
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data dasbor operasional.');
    } finally {
      setLoading(false);
    }
  }, [authToken, user?.role]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Real-time SSE + Supabase Realtime Listener
  useEffect(() => {
    if (!authToken || user?.role !== 'admin') {
      setStreamStatus('offline');
      return;
    }

    let closed = false;
    let eventSource: EventSource | null = null;
    const supabase = getSupabaseBrowserClient(
      publicConfig.supabaseUrl,
      publicConfig.supabaseAnonKey,
    );
    const channel = supabase
      ? supabase
          .channel('greencafe-admin-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            () => void loadDashboard(),
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'reservations' },
            () => void loadDashboard(),
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'transactions' },
            () => void loadDashboard(),
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'activity_logs' },
            () => void loadDashboard(),
          )
          .subscribe()
      : null;

    async function connectSse() {
      setStreamStatus('connecting');
      try {
        const { ticket } = await requestAdminStreamTicket(authToken!);
        if (closed) return;

        eventSource = new EventSource(`/api/admin/stream?ticket=${encodeURIComponent(ticket)}`);
        eventSource.addEventListener('connected', () => {
          if (!closed) setStreamStatus('connected');
        });
        eventSource.addEventListener('order:created', (evt) => {
          const ord = JSON.parse((evt as MessageEvent).data) as OrderRecord;
          setOrders((prev) => (prev.some((o) => o.id === ord.id) ? prev : [ord, ...prev]));
        });
        eventSource.addEventListener('order:updated', (evt) => {
          const ord = JSON.parse((evt as MessageEvent).data) as OrderRecord;
          setOrders((prev) => prev.map((o) => (o.id === ord.id ? ord : o)));
        });
        eventSource.addEventListener('reservation:created', (evt) => {
          const resv = JSON.parse((evt as MessageEvent).data) as ReservationRecord;
          setReservations((prev) =>
            prev.some((r) => r.id === resv.id) ? prev : [resv, ...prev],
          );
        });
        eventSource.addEventListener('reservation:updated', (evt) => {
          const resv = JSON.parse((evt as MessageEvent).data) as ReservationRecord;
          setReservations((prev) => prev.map((r) => (r.id === resv.id ? resv : r)));
        });
        eventSource.addEventListener('product:updated', (evt) => {
          const prod = JSON.parse((evt as MessageEvent).data) as Product;
          setProducts((prev) => prev.map((p) => (p.id === prod.id ? prod : p)));
          onProductUpdated?.(prod);
        });
        eventSource.addEventListener('transaction:created', (evt) => {
          const tx = JSON.parse((evt as MessageEvent).data) as TransactionRecord;
          setTransactions((prev) =>
            prev.some((p) => p.id === tx.id) ? prev : [tx, ...prev],
          );
        });
        eventSource.addEventListener('transaction:updated', (evt) => {
          const updated = JSON.parse((evt as MessageEvent).data) as TransactionRecord;
          setTransactions((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item)),
          );
        });
        eventSource.addEventListener('activity:created', (evt) => {
          const act = JSON.parse((evt as MessageEvent).data) as ActivityLog;
          setActivities((prev) =>
            prev.some((p) => p.id === act.id) ? prev : [act, ...prev],
          );
        });
        eventSource.addEventListener('subscription:updated', (evt) => {
          const sub = JSON.parse((evt as MessageEvent).data) as SubscriptionRecord;
          setSubscriptions((prev) => {
            const exists = prev.some((s) => s.id === sub.id);
            return exists ? prev.map((s) => (s.id === sub.id ? sub : s)) : [sub, ...prev];
          });
        });
        eventSource.onerror = () => {
          if (!closed) setStreamStatus('offline');
        };
      } catch {
        if (!closed) setStreamStatus('offline');
      }
    }

    void connectSse();

    return () => {
      closed = true;
      eventSource?.close();
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [
    authToken,
    user?.role,
    publicConfig.supabaseUrl,
    publicConfig.supabaseAnonKey,
    loadDashboard,
    onProductUpdated,
  ]);

  const overview = useMemo(
    () =>
      computeAdminOverview({
        transactions,
        activeSubscriptions: subscriptions,
        orders,
        reservations,
        usersCount: Math.max(
          users.length,
          new Set(transactions.map((t) => t.customerEmail)).size,
        ),
      }),
    [transactions, subscriptions, orders, reservations, users.length],
  );

  // Filtered & sorted active orders
  const queueOrders = useMemo(() => {
    const activeSet = orders.filter((o) => o.status !== 'canceled');
    const q = orderSearch.trim().toLowerCase();
    const filtered = activeSet.filter((ord) => {
      if (orderTab !== 'all' && ord.status !== orderTab) return false;
      if (!q) return true;
      return (
        ord.orderCode.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.tableOrNote.toLowerCase().includes(q)
      );
    });
    return [...filtered].sort((a, b) => {
      if (orderSort === 'highest') return b.totalIdr - a.totalIdr;
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return orderSort === 'oldest' ? ta - tb : tb - ta;
    });
  }, [orders, orderTab, orderSearch, orderSort]);

  const queueCounts = useMemo(() => {
    const nonCanceled = orders.filter((o) => o.status !== 'canceled');
    return {
      all: nonCanceled.length,
      pending_payment: nonCanceled.filter((o) => o.status === 'pending_payment').length,
      preparing: nonCanceled.filter((o) => o.status === 'preparing').length,
      ready: nonCanceled.filter((o) => o.status === 'ready').length,
    };
  }, [orders]);

  const filteredMenuProducts = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q),
    );
  }, [products, menuSearch]);

  const filteredTransactions = useMemo(
    () =>
      filterTransactions(transactions, {
        query: txSearchQuery,
        status: txStatusFilter,
        type: txTypeFilter,
      }),
    [transactions, txSearchQuery, txStatusFilter, txTypeFilter],
  );

  const handleAdvanceOrder = async (orderId: string, nextStatus: OrderStatus) => {
    if (!authToken) return;
    setBusyOrderId(orderId);
    setError(null);
    try {
      const res = await updateAdminOrderStatus(orderId, nextStatus, authToken);
      setOrders((prev) => prev.map((o) => (o.id === res.order.id ? res.order : o)));
      if (res.transaction) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === res.transaction!.id ? res.transaction! : t)),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status pesanan.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleToggleProductStock = async (product: Product) => {
    if (!authToken) return;
    setBusyProductId(product.id);
    setError(null);
    try {
      const res = await updateAdminProduct(
        product.id,
        { inStock: !product.inStock },
        authToken,
      );
      setProducts((prev) => prev.map((p) => (p.id === res.product.id ? res.product : p)));
      onProductUpdated?.(res.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui ketersediaan menu.');
    } finally {
      setBusyProductId(null);
    }
  };

  const handleReservationStatus = async (
    reservationId: string,
    status: ReservationRecord['status'],
  ) => {
    if (!authToken) return;
    setBusyResId(reservationId);
    setError(null);
    try {
      const res = await updateAdminReservationStatus(reservationId, status, authToken);
      setReservations((prev) =>
        prev.map((r) => (r.id === res.reservation.id ? res.reservation : r)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status reservasi.');
    } finally {
      setBusyResId(null);
    }
  };

  const handleExportCsv = async () => {
    if (!authToken) return;
    setExporting(true);
    try {
      const csv = await downloadTransactionsCsv(authToken);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `green-cafe-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengekspor CSV.');
    } finally {
      setExporting(false);
    }
  };

  const handleClaimSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setClaimError(null);
    if (claimName.trim().length < 2) {
      setClaimError('Nama administrator minimal 2 karakter.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claimEmail.trim())) {
      setClaimError('Format email tidak valid.');
      return;
    }
    if (claimPassword.length < 8) {
      setClaimError('Kata sandi administrator minimal 8 karakter.');
      return;
    }

    setClaiming(true);
    try {
      await onClaimFirstAdmin({
        fullName: claimName.trim(),
        email: claimEmail.trim().toLowerCase(),
        password: claimPassword,
      });
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Gagal mengaktifkan akun Admin.');
    } finally {
      setClaiming(false);
    }
  };

  // Gate 1: Not signed in yet
  if (!user) {
    if (!publicConfig.hasAdminClaimed && !publicConfig.supabaseConfigured) {
      return (
        <section className="mx-auto flex min-h-screen max-w-[540px] flex-col justify-center px-5 py-12">
          <div className="mb-4">
            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#444842] hover:text-[#182519]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Kembali ke Green Cafe</span>
            </button>
          </div>
          <div className="rounded-3xl border border-[#e5e2db] bg-white p-8 shadow-ambient">
            <div className="flex items-center gap-3 text-[#2d3b2d]">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-wider text-[#7a582f]">
                Konfigurasi Awal Dasbor Admin &amp; Barista
              </p>
            </div>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-[#182519]">
              Aktifkan Akun Admin Pertama
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#444842]">
              Belum ada akun administrator terdaftar pada instans ini. Daftarkan admin atau kepala
              barista pertama untuk mengelola antrian pesanan, reservasi meja, stok menu, serta
              laporan transaksi real-time.
            </p>

            <form onSubmit={(e) => void handleClaimSubmit(e)} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="admin-claim-name"
                  className="block text-xs font-semibold text-[#182519]"
                >
                  Nama Admin / Kepala Barista
                </label>
                <input
                  id="admin-claim-name"
                  type="text"
                  required
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  placeholder="Contoh: Aditia Barista"
                  className="mt-1 w-full rounded-xl border border-[#c4c8c0] bg-[#fcf9f2] px-3.5 py-2.5 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-claim-email"
                  className="block text-xs font-semibold text-[#182519]"
                >
                  Email Admin
                </label>
                <input
                  id="admin-claim-email"
                  type="email"
                  required
                  value={claimEmail}
                  onChange={(e) => setClaimEmail(e.target.value)}
                  placeholder="admin@greencafe.id"
                  className="mt-1 w-full rounded-xl border border-[#c4c8c0] bg-[#fcf9f2] px-3.5 py-2.5 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-claim-pass"
                  className="block text-xs font-semibold text-[#182519]"
                >
                  Kata Sandi Admin (minimal 8 karakter)
                </label>
                <input
                  id="admin-claim-pass"
                  type="password"
                  required
                  minLength={8}
                  value={claimPassword}
                  onChange={(e) => setClaimPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-[#c4c8c0] bg-[#fcf9f2] px-3.5 py-2.5 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                />
              </div>

              {claimError && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#ffdad6] px-3.5 py-2 text-xs font-medium text-[#93000a]"
                >
                  {claimError}
                </p>
              )}

              <button
                type="submit"
                disabled={claiming}
                className="w-full rounded-full bg-[#182519] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2d3b2d] disabled:opacity-60"
              >
                {claiming ? 'Mengaktifkan Akun...' : 'Klaim & Buka Dashboard Operasional'}
              </button>
            </form>
          </div>
        </section>
      );
    }

    return (
      <section className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-5 py-16 text-center">
        <div className="rounded-3xl border border-[#e5e2db] bg-white p-8 shadow-ambient">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#2d3b2d]" aria-hidden="true" />
          <h1 className="mt-3 font-serif text-2xl font-semibold text-[#182519]">
            Autentikasi Admin &amp; Barista Diperlukan
          </h1>
          <p className="mt-2 text-sm text-[#444842]">
            Masuk dengan akun Administrator untuk membuka antrian pesanan, manajemen menu,
            reservasi Dine-In, dan laporan transaksi real-time.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAuth}
              className="rounded-full bg-[#182519] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2d3b2d]"
            >
              Masuk Akun Admin
            </button>
            <button
              type="button"
              onClick={onBackToStore}
              className="rounded-full border border-[#c4c8c0] bg-[#fcf9f2] px-5 py-2.5 text-sm font-semibold text-[#182519] hover:bg-[#f1eee7]"
            >
              Kembali ke Toko
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Gate 2: Signed in as regular member
  if (user.role !== 'admin') {
    return (
      <section className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-5 py-16 text-center">
        <div className="rounded-3xl border border-[#e5e2db] bg-white p-8 shadow-ambient">
          <ShieldAlert className="mx-auto h-10 w-10 text-[#ba1a1a]" aria-hidden="true" />
          <h1 className="mt-3 font-serif text-2xl font-semibold text-[#182519]">
            Akses Terbatas untuk Admin &amp; Barista
          </h1>
          <p className="mt-2 text-sm text-[#444842]">
            Akun Anda ({user.email}) terdaftar sebagai anggota reguler. Masuk dengan akun
            Administrator atau ubah kolom role menjadi admin pada tabel profiles Supabase.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onBackToStore}
              className="rounded-full bg-[#182519] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2d3b2d]"
            >
              Kembali ke Green Cafe
            </button>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="rounded-full border border-[#c4c8c0] px-5 py-2.5 text-sm font-semibold text-[#182519] hover:bg-[#f1eee7]"
            >
              Keluar
            </button>
          </div>
        </div>
      </section>
    );
  }

  const navItems: {
    id: AdminSection;
    label: string;
    icon: typeof ClipboardList;
    badge?: number;
  }[] = [
    {
      id: 'pesanan',
      label: 'Pesanan',
      icon: ClipboardList,
      badge: overview.activeOrdersCount,
    },
    { id: 'kelola-menu', label: 'Kelola Menu', icon: Coffee },
    {
      id: 'reservasi',
      label: 'Reservasi',
      icon: UtensilsCrossed,
      badge: overview.todayReservationsCount,
    },
    { id: 'laporan', label: 'Laporan', icon: BarChart3 },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#f6f3ec] px-4 py-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2d3b2d] text-white">
              <Leaf className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <span className="block font-serif text-lg font-semibold leading-none text-[#182519]">
                Green Cafe
              </span>
              <span className="mt-1 block text-[11px] font-medium uppercase tracking-wider text-[#444842]">
                Atelier &amp; Roastery
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Tutup menu samping"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#444842] hover:bg-[#ebe8e1] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-2 h-px bg-[#ebe8e1]" />

        <nav aria-label="Navigasi Dasbor Admin" className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileSidebarOpen(false);
                }}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors duration-75 ${
                  active
                    ? 'bg-[#2d3b2d] text-white shadow-[0_8px_24px_-4px_rgba(45,59,45,0.16)]'
                    : 'text-[#444842] hover:bg-[#ebe8e1] hover:text-[#182519]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                      active ? 'bg-white/20 text-white' : 'bg-[#e5e2db] text-[#182519]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mx-2 h-px bg-[#ebe8e1]" />

        <button
          type="button"
          onClick={onBackToStore}
          className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#444842] transition-colors hover:bg-[#ebe8e1] hover:text-[#182519]"
        >
          <Store className="h-4 w-4" aria-hidden="true" />
          <span>Lihat Etalase Toko</span>
        </button>
      </div>

      {/* Staff Profile Footer Card */}
      <div className="flex items-center justify-between gap-2 rounded-xl bg-[#f1eee7] p-3 shadow-[0_2px_12px_rgba(45,59,45,0.04)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#182519] text-xs font-bold text-white">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="block truncate text-xs font-semibold text-[#182519]">
              {user.fullName}
            </span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#7a582f]" />
              <span className="block truncate text-[11px] text-[#444842]">Shift Aktif • Barista</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          aria-label="Keluar dari akun admin"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#444842] transition-colors hover:bg-[#e5e2db] hover:text-[#182519]"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcf9f2] text-[#1c1c18]">
      {/* Fixed Desktop Sidebar */}
      <aside className="fixed top-0 left-0 z-40 hidden h-full w-72 border-r border-[#e5e2db] lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#182519]/40 backdrop-blur-[2px]"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative z-10 h-full w-72 border-r border-[#e5e2db] shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className="flex min-h-screen flex-col lg:pl-72">
        {/* Top Operational Header matching HTML */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e5e2db]/80 bg-[#fcf9f2]/90 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Buka menu navigasi admin"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f6f3ec] text-[#182519] lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 rounded-full bg-[#f6f3ec] px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-[#2d3b2d]" />
              <span className="text-xs font-semibold text-[#182519]">Buka</span>
              <span className="text-xs text-[#c4c8c0]">•</span>
              <span className="text-xs font-medium text-[#444842]">Kasir Utama</span>
            </div>
            <span className="hidden text-[#c4c8c0] sm:inline">/</span>
            <span className="hidden text-xs text-[#444842] sm:inline">Operasional Lantai 1</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden items-center gap-1.5 rounded-full bg-[#f6f3ec] px-3 py-1.5 text-xs font-medium text-[#444842] sm:flex">
              <span
                className={`h-2 w-2 rounded-full ${
                  streamStatus === 'connected'
                    ? 'bg-[#16a34a]'
                    : streamStatus === 'connecting'
                      ? 'bg-[#d97706]'
                      : 'bg-[#747872]'
                }`}
              />
              <span>
                {streamStatus === 'connected'
                  ? 'Live Stream Aktif'
                  : streamStatus === 'connecting'
                    ? 'Menyambungkan...'
                    : 'Sinkron Manual'}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-[#f6f3ec] px-3 py-1.5 text-xs font-medium text-[#182519]">
              <Clock className="h-3.5 w-3.5 text-[#444842]" aria-hidden="true" />
              <span className="font-mono tabular-nums">{wibClock} WIB</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveSection('pesanan')}
              aria-label="Pesanan menunggu kasir"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#f6f3ec] text-[#444842] hover:text-[#182519]"
            >
              <Bell className="h-4 w-4" />
              {overview.pendingCashierCount > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#ba1a1a]" />
              )}
            </button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-7 px-4 py-7 sm:px-8">
          {/* Page Header & Global Actions */}
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#7a582f]">
                  Operasional • Antrian Langsung
                </span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7a582f]" />
              </div>
              <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-[#182519]">
                {activeSection === 'pesanan'
                  ? 'Dashboard Operasional'
                  : activeSection === 'kelola-menu'
                    ? 'Kelola Menu & Stok'
                    : activeSection === 'reservasi'
                      ? 'Reservasi Meja Dine-In'
                      : 'Laporan Transaksi & Aktivitas Real-Time'}
              </h1>
              <p className="mt-1 text-sm text-[#444842]">
                Pantau antrian pesanan, status pembayaran Stripe/QRIS/Kasir, reservasi meja, dan
                aktivitas pengguna secara real-time.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2.5 whitespace-nowrap">
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-[#f6f3ec] px-4 py-2 text-xs font-semibold text-[#182519] shadow-sm transition-colors hover:bg-[#ebe8e1] whitespace-nowrap"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>Muat Ulang Data</span>
              </button>
              <button
                type="button"
                onClick={() => void handleExportCsv()}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-full bg-[#2d3b2d] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#182519] whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{exporting ? 'Menyiapkan CSV...' : 'Unduh Laporan CSV'}</span>
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-[#ffdad6] px-4 py-3 text-sm font-medium text-[#93000a]"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          {/* 4 KPI Cards matching HTML */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(45,59,45,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#444842]">Pesanan Aktif</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6f3ec] text-[#182519]">
                  <ChefHat className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-serif text-4xl font-semibold leading-none text-[#182519] tabular-nums">
                  {overview.activeOrdersCount}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#f1eee7] px-2.5 py-0.5 text-[11px] font-medium text-[#182519]">
                  Sedang Berjalan
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(45,59,45,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#444842]">Menunggu Kasir</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fecf9d]/35 text-[#7a582f]">
                  <Timer className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-serif text-4xl font-semibold leading-none text-[#182519] tabular-nums">
                  {overview.pendingCashierCount}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#fecf9d] px-2.5 py-0.5 text-[11px] font-semibold text-[#79562e]">
                  Perlu Konfirmasi
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(45,59,45,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#444842]">Reservasi Aktif</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6f3ec] text-[#182519]">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-serif text-4xl font-semibold leading-none text-[#182519] tabular-nums">
                  {overview.todayReservationsCount}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#f1eee7] px-2.5 py-0.5 text-[11px] font-medium text-[#444842]">
                  Meja Terjadwal
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(45,59,45,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#444842]">Pendapatan Sukses</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d7e7d3]/60 text-[#182519]">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-1.5">
                <span className="font-serif text-2xl font-bold leading-none text-[#182519] tabular-nums">
                  {formatRupiah(overview.totalRevenueIdr)}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[#d7e7d3] px-2 py-0.5 font-semibold text-[#111f12] tabular-nums">
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    {overview.activeSubscriptionsCount} Stripe Club
                  </span>
                  <span className="text-[#444842] tabular-nums">
                    MRR {formatRupiah(overview.mrrIdr)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: PESANAN (Antrian Dapur & Kasir) */}
          {activeSection === 'pesanan' && (
            <div className="flex flex-col gap-6">
              {/* Filter Tabs & Search / Sort */}
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
                  {(
                    [
                      { id: 'all', label: `Semua (${queueCounts.all})` },
                      {
                        id: 'pending_payment',
                        label: `Menunggu Kasir (${queueCounts.pending_payment})`,
                      },
                      { id: 'preparing', label: `Diproses (${queueCounts.preparing})` },
                      { id: 'ready', label: `Siap Diambil (${queueCounts.ready})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOrderTab(tab.id)}
                      className={`rounded-full px-5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                        orderTab === tab.id
                          ? 'bg-[#2d3b2d] text-white shadow-sm'
                          : 'bg-[#f1eee7] text-[#444842] hover:text-[#182519]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#444842]"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Cari No. Invoice / Nama..."
                      aria-label="Cari pesanan"
                      className="w-full rounded-full bg-white py-2 pr-4 pl-10 text-xs text-[#1c1c18] shadow-sm placeholder:text-[#747872] focus:ring-1 focus:ring-[#2d3b2d] focus:outline-none"
                    />
                  </div>
                  <select
                    value={orderSort}
                    onChange={(e) =>
                      setOrderSort(e.target.value as 'oldest' | 'newest' | 'highest')
                    }
                    aria-label="Urutkan pesanan"
                    className="rounded-full bg-white px-4 py-2 text-xs font-medium text-[#1c1c18] shadow-sm focus:outline-none"
                  >
                    <option value="newest">Terbaru ke Terlama</option>
                    <option value="oldest">Terlama ke Terbaru</option>
                    <option value="highest">Nominal Tertinggi</option>
                  </select>
                </div>
              </div>

              {/* 3-Column Order Cards Grid */}
              {queueOrders.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#444842] shadow-sm">
                  Belum ada pesanan pada kategori antrian ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {queueOrders.map((ord) => {
                    const isBusy = busyOrderId === ord.id;
                    const paymentBadge =
                      ord.status === 'pending_payment'
                        ? {
                            text:
                              ord.paymentMethod === 'cash'
                                ? 'Belum Bayar • Kasir'
                                : 'Menunggu Konfirmasi',
                            cls: 'bg-[#fecf9d]/45 text-[#79562e]',
                          }
                        : ord.status === 'ready'
                          ? {
                              text: 'Siap Diambil • Meja Pickup',
                              cls: 'bg-[#d4e8d2] text-[#3a4b3b]',
                            }
                          : ord.status === 'completed'
                            ? {
                                text: 'Selesai',
                                cls: 'bg-[#ebe8e1] text-[#444842]',
                              }
                            : {
                                text:
                                  ord.paymentMethod === 'qris'
                                    ? 'Lunas • QRIS'
                                    : ord.paymentMethod === 'stripe_card'
                                      ? 'Lunas • Stripe'
                                      : 'Lunas • Kasir',
                                cls: 'bg-[#d7e7d3] text-[#111f12]',
                              };

                    return (
                      <article
                        key={ord.id}
                        className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-[0_8px_24px_rgba(45,59,45,0.04)] transition-shadow hover:shadow-lg"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-mono text-xs font-semibold tracking-wide text-[#182519]">
                                #{ord.orderCode}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1 text-xs text-[#444842]">
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                {new Date(ord.createdAt).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                WIB
                              </span>
                            </div>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f6f3ec] text-[#2d3b2d]">
                              {ord.status === 'pending_payment' ? (
                                <Timer className="h-4 w-4 text-[#7a582f]" aria-hidden="true" />
                              ) : ord.status === 'ready' ? (
                                <PackageCheck className="h-4 w-4 text-[#182519]" aria-hidden="true" />
                              ) : (
                                <ChefHat className="h-4 w-4 text-[#2d3b2d]" aria-hidden="true" />
                              )}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-serif text-lg font-semibold text-[#182519]">
                                {ord.customerName}
                              </h3>
                              <span className="rounded-full bg-[#f1eee7] px-3 py-0.5 text-[11px] font-medium text-[#444842]">
                                {ord.fulfillmentMode}
                                {ord.tableOrNote && ord.fulfillmentMode === 'Dine-In'
                                  ? ` • ${ord.tableOrNote.split('·')[0].trim()}`
                                  : ''}
                              </span>
                            </div>
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentBadge.cls}`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                {paymentBadge.text}
                              </span>
                            </div>
                          </div>

                          {/* Item List */}
                          <div className="flex flex-col gap-2.5 rounded-xl bg-[#f6f3ec] p-4">
                            {ord.items.map((item, idx) => (
                              <div key={`${item.productId}-${idx}`} className="space-y-0.5">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-xs font-semibold text-[#1c1c18]">
                                    {item.quantity}x {item.name}
                                  </span>
                                  <span className="font-mono text-xs text-[#182519] whitespace-nowrap tabular-nums">
                                    {formatRupiah(item.unitPriceIdr * item.quantity)}
                                  </span>
                                </div>
                                {item.customization && (
                                  <p className="text-[11px] text-[#444842]">{item.customization}</p>
                                )}
                                {item.note && (
                                  <p className="text-[11px] italic text-[#7a582f]">
                                    Catatan: “{item.note}”
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#444842]">
                              Total Tagihan
                            </span>
                            <span className="font-mono text-base font-bold text-[#182519] tabular-nums">
                              {formatRupiah(ord.totalIdr)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-5 flex flex-col gap-2">
                          {ord.status === 'pending_payment' && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleAdvanceOrder(ord.id, 'preparing')}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2d3b2d] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#182519] disabled:opacity-60"
                              >
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                <span>Konfirmasi Pembayaran</span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleAdvanceOrder(ord.id, 'canceled')}
                                className="w-full rounded-full px-4 py-2 text-center text-xs font-semibold text-[#444842] transition-colors hover:bg-[#ffdad6]/40 hover:text-[#ba1a1a]"
                              >
                                Batalkan
                              </button>
                            </>
                          )}

                          {ord.status === 'preparing' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleAdvanceOrder(ord.id, 'ready')}
                              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2d3b2d] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#182519] disabled:opacity-60"
                            >
                              <PackageCheck className="h-4 w-4" aria-hidden="true" />
                              <span>Tandai Siap Diambil</span>
                            </button>
                          )}

                          {ord.status === 'ready' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleAdvanceOrder(ord.id, 'completed')}
                              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#ebe8e1] px-4 py-2.5 text-xs font-semibold text-[#182519] transition-colors hover:bg-[#2d3b2d] hover:text-white disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              <span>Selesaikan Pesanan</span>
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: KELOLA MENU */}
          {activeSection === 'kelola-menu' && (
            <div className="rounded-2xl border border-[#e5e2db] bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-3 border-b border-[#e5e2db] p-5 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-[#182519]">
                    Ketersediaan Menu &amp; Add-On ({products.length})
                  </h2>
                  <p className="text-xs text-[#444842]">
                    Perubahan status stok langsung tersinkronisasi ke halaman Daftar Menu pelanggan.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#444842]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Cari item menu..."
                    aria-label="Cari item menu"
                    className="w-full rounded-full border border-[#c4c8c0] bg-[#fcf9f2] py-2 pr-4 pl-9 text-xs text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e5e2db] bg-[#f6f3ec] text-[#444842]">
                      <th className="px-4 py-3 font-semibold">Menu</th>
                      <th className="px-4 py-3 font-semibold">Kategori</th>
                      <th className="px-4 py-3 font-semibold">Subkategori</th>
                      <th className="px-4 py-3 text-right font-semibold">Harga</th>
                      <th className="px-4 py-3 font-semibold">Status Stok</th>
                      <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e2db]">
                    {filteredMenuProducts.map((prod) => (
                      <tr key={prod.id} className="hover:bg-[#f6f3ec]/50">
                        <td className="px-4 py-3 font-semibold text-[#182519]">{prod.name}</td>
                        <td className="px-4 py-3 text-[#444842]">{prod.category}</td>
                        <td className="px-4 py-3 text-[#444842]">{prod.subcategory}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-[#182519] tabular-nums">
                          {formatRupiah(prod.priceIdr)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              prod.inStock
                                ? 'bg-[#d7e7d3] text-[#111f12]'
                                : 'bg-[#ffdad6] text-[#93000a]'
                            }`}
                          >
                            {prod.inStock ? 'Tersedia' : 'Habis'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={busyProductId === prod.id}
                            onClick={() => void handleToggleProductStock(prod)}
                            className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
                              prod.inStock
                                ? 'border border-[#c4c8c0] bg-white text-[#444842] hover:bg-[#ffdad6]/50 hover:text-[#93000a]'
                                : 'bg-[#2d3b2d] text-white hover:bg-[#182519]'
                            }`}
                          >
                            {prod.inStock ? 'Tandai Habis' : 'Aktifkan Stok'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 3: RESERVASI MEJA */}
          {activeSection === 'reservasi' && (
            <div className="rounded-2xl border border-[#e5e2db] bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-[#182519]">
                    Daftar Reservasi Dine-In ({reservations.length})
                  </h2>
                  <p className="text-xs text-[#444842]">
                    Kelola kedatangan tamu dan ketersediaan meja di lantai kafe.
                  </p>
                </div>
              </div>

              {reservations.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#444842]">
                  Belum ada reservasi meja yang tercatat.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reservations.map((resv) => {
                    const badge = RESERVATION_STATUS_BADGE[resv.status];
                    const isBusy = busyResId === resv.id;
                    return (
                      <article
                        key={resv.id}
                        className="flex flex-col justify-between rounded-2xl border border-[#e5e2db] bg-[#fcf9f2] p-5"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-[#182519]">
                              {resv.reservationCode}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-serif text-lg font-semibold text-[#182519]">
                              {resv.customerName}
                            </h3>
                            <p className="text-xs text-[#444842]">
                              {resv.phone} • {resv.customerEmail}
                            </p>
                          </div>
                          <div className="rounded-xl bg-white p-3 text-xs text-[#1c1c18]">
                            <p className="font-semibold text-[#182519]">{resv.tableNumber}</p>
                            <p className="mt-1 text-[#444842]">
                              {resv.guests} Tamu • {resv.reservationDate} pukul {resv.reservationTime}{' '}
                              WIB
                            </p>
                            {resv.notes && (
                              <p className="mt-1 italic text-[#7a582f]">Catatan: {resv.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {resv.status === 'confirmed' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleReservationStatus(resv.id, 'seated')}
                              className="flex-1 rounded-full bg-[#2d3b2d] py-2 text-xs font-semibold text-white hover:bg-[#182519]"
                            >
                              Tamu Sudah Duduk
                            </button>
                          )}
                          {resv.status === 'seated' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleReservationStatus(resv.id, 'completed')}
                              className="flex-1 rounded-full bg-[#182519] py-2 text-xs font-semibold text-white hover:bg-[#2d3b2d]"
                            >
                              Selesaikan Kunjungan
                            </button>
                          )}
                          {(resv.status === 'confirmed' || resv.status === 'seated') && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleReservationStatus(resv.id, 'canceled')}
                              className="rounded-full border border-[#c4c8c0] px-3.5 py-2 text-xs font-semibold text-[#444842] hover:text-[#ba1a1a]"
                            >
                              Batalkan
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: LAPORAN REAL-TIME & AKTIVITAS PENGGUNA */}
          {activeSection === 'laporan' && (
            <div className="space-y-6">
              {/* Transaction Ledger */}
              <div className="rounded-2xl border border-[#e5e2db] bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-[#e5e2db] p-5 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:max-w-xs">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#444842]"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={txSearchQuery}
                      onChange={(e) => setTxSearchQuery(e.target.value)}
                      placeholder="Cari referensi, nama, email..."
                      aria-label="Cari transaksi"
                      className="w-full rounded-full border border-[#c4c8c0] bg-[#fcf9f2] py-2 pr-4 pl-9 text-xs text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={txStatusFilter}
                      onChange={(e) =>
                        setTxStatusFilter(e.target.value as TransactionStatus | 'all')
                      }
                      aria-label="Filter status transaksi"
                      className="rounded-full border border-[#c4c8c0] bg-white px-3.5 py-2 text-xs font-medium text-[#1c1c18]"
                    >
                      <option value="all">Semua Status</option>
                      <option value="succeeded">Berhasil</option>
                      <option value="pending">Menunggu</option>
                      <option value="failed">Gagal</option>
                    </select>

                    <select
                      value={txTypeFilter}
                      onChange={(e) =>
                        setTxTypeFilter(e.target.value as TransactionType | 'all')
                      }
                      aria-label="Filter tipe transaksi"
                      className="rounded-full border border-[#c4c8c0] bg-white px-3.5 py-2 text-xs font-medium text-[#1c1c18]"
                    >
                      <option value="all">Semua Tipe</option>
                      <option value="order">Pesanan Kafe</option>
                      <option value="subscription">Langganan Stripe</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e5e2db] bg-[#f6f3ec] text-[#444842]">
                        <th className="px-4 py-3 font-semibold">Referensi</th>
                        <th className="px-4 py-3 font-semibold">Waktu</th>
                        <th className="px-4 py-3 font-semibold">Pelanggan</th>
                        <th className="px-4 py-3 font-semibold">Keterangan</th>
                        <th className="px-4 py-3 font-semibold">Metode</th>
                        <th className="px-4 py-3 text-right font-semibold">Nominal</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e2db]">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#444842]">
                            Tidak ada transaksi yang cocok dengan filter saat ini.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx) => {
                          const st = TX_STATUS_LABELS[tx.status];
                          return (
                            <tr key={tx.id} className="hover:bg-[#f6f3ec]/50">
                              <td className="px-4 py-3 font-mono font-semibold text-[#182519] whitespace-nowrap">
                                {tx.referenceCode}
                              </td>
                              <td className="px-4 py-3 text-[#444842] tabular-nums whitespace-nowrap">
                                {new Date(tx.createdAt).toLocaleString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-[#182519]">{tx.customerName}</div>
                                <div className="text-[11px] text-[#444842]">{tx.customerEmail}</div>
                              </td>
                              <td className="px-4 py-3 text-[#1c1c18]">
                                <span className="font-medium text-[#7a582f]">
                                  {tx.type === 'subscription' ? 'Langganan' : 'Pesanan'}
                                </span>
                                {' · '}
                                {tx.description}
                              </td>
                              <td className="px-4 py-3 font-medium text-[#182519] whitespace-nowrap">
                                {tx.paymentProvider}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-[#182519] tabular-nums whitespace-nowrap">
                                {formatRupiah(tx.amountIdr)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.className}`}
                                >
                                  {st.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Activity Feed & Stripe Subscriptions */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="rounded-2xl border border-[#e5e2db] bg-white lg:col-span-7">
                  <div className="border-b border-[#e5e2db] px-5 py-4">
                    <h2 className="font-serif text-xl font-semibold text-[#182519]">
                      Aktivitas Pengguna Real-Time ({activities.length})
                    </h2>
                    <p className="mt-0.5 text-xs text-[#444842]">
                      Pemantauan langsung pendaftaran Supabase Auth, pesanan, reservasi, dan Stripe.
                    </p>
                  </div>
                  <ul className="divide-y divide-[#e5e2db]">
                    {activities.slice(0, 20).map((act) => (
                      <li
                        key={act.id}
                        className="flex items-start justify-between gap-4 px-5 py-3.5"
                      >
                        <div>
                          <p className="text-xs font-medium text-[#7a582f]">
                            {ACTIVITY_CATEGORY_LABELS[act.category]} · {act.actorName} (
                            {act.actorEmail})
                          </p>
                          <p className="mt-0.5 text-sm text-[#182519]">{act.action}</p>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-[#444842] tabular-nums">
                          {new Date(act.createdAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-[#e5e2db] bg-white lg:col-span-5">
                  <div className="border-b border-[#e5e2db] px-5 py-4">
                    <h2 className="font-serif text-xl font-semibold text-[#182519]">
                      Anggota Langganan Stripe
                    </h2>
                    <p className="mt-0.5 text-xs text-[#444842]">
                      Status penagihan berulang Green Club ({overview.activeSubscriptionsCount}{' '}
                      aktif).
                    </p>
                  </div>
                  <ul className="divide-y divide-[#e5e2db]">
                    {subscriptions.length === 0 ? (
                      <li className="px-5 py-8 text-center text-sm text-[#444842]">
                        Belum ada pelanggan langganan.
                      </li>
                    ) : (
                      subscriptions.map((sub) => (
                        <li key={sub.id} className="px-5 py-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-[#182519]">
                              {sub.userName}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                sub.status === 'active'
                                  ? 'bg-[#d7e7d3] text-[#111f12]'
                                  : 'bg-[#ebe8e1] text-[#444842]'
                              }`}
                            >
                              {sub.status === 'active' ? 'Aktif' : 'Dibatalkan'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#444842]">
                            {sub.planName} · {formatRupiah(sub.amountIdr)}/bln
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#747872]">{sub.userEmail}</p>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Roastery Station Footer Strip matching HTML */}
          <div className="mt-2 flex flex-col items-start justify-between gap-4 rounded-2xl bg-[#f6f3ec] p-5 text-xs text-[#444842] md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2d3b2d] text-white">
                <Coffee className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-[#182519]">
                  Status Stasiun Barista &amp; Infrastruktur
                </p>
                <p>
                  Mesin Espresso Ready • Supabase (
                  {publicConfig.supabaseConfigured ? 'Terhubung' : 'Mode Persisten Lokal'}) • Stripe
                  ({publicConfig.stripeConfigured ? 'Live Checkout' : 'Sandbox Aktif'})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span>
                Tingkat Sukses Transaksi:{' '}
                <strong className="text-[#182519] tabular-nums">
                  {overview.succeededRatePct}%
                </strong>
              </span>
              <span className="text-[#c4c8c0]">|</span>
              <span>
                Pengguna Terdaftar:{' '}
                <strong className="text-[#182519] tabular-nums">
                  {overview.registeredUsersCount}
                </strong>
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
