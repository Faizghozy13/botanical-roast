import {
  ArrowRight,
  Banknote,
  Camera,
  ChevronRight,
  Coffee,
  CreditCard,
  Edit3,
  Leaf,
  Lock,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  calculateCartTotals,
  formatRupiah,
  resolvePromoDiscountPct,
} from '../shared/pricing';
import type {
  CartItem,
  FulfillmentMode,
  OrderRecord,
  PaymentMethod,
  SubscriptionRecord,
  UserProfile,
} from '../shared/types';

interface CheckoutViewProps {
  items: CartItem[];
  user: UserProfile | null;
  fulfillmentMode: FulfillmentMode;
  tableOrNote: string;
  activeSubscription: SubscriptionRecord | null;
  subscriberDiscountPct: number;
  submitting: boolean;
  errorMessage: string | null;
  onChangeFulfillmentMode: (mode: FulfillmentMode) => void;
  onChangeTableOrNote: (value: string) => void;
  onUpdateQty: (productId: string, delta: number) => void;
  onUpdateNote: (productId: string, note: string) => void;
  onRemoveItem: (productId: string) => void;
  onNavigateWelcome: () => void;
  onNavigateMenu: () => void;
  onSubmitOrder: (payload: {
    customerName: string;
    customerEmail: string;
    fulfillmentMode: FulfillmentMode;
    tableOrNote: string;
    paymentMethod: PaymentMethod;
    promoCode?: string;
  }) => Promise<OrderRecord | null>;
  onOrderConfirmedNavigate: (order: OrderRecord) => void;
}

export function CheckoutView({
  items,
  user,
  fulfillmentMode,
  tableOrNote,
  activeSubscription,
  subscriberDiscountPct,
  submitting,
  errorMessage,
  onChangeFulfillmentMode,
  onChangeTableOrNote,
  onUpdateQty,
  onUpdateNote,
  onRemoveItem,
  onNavigateWelcome,
  onNavigateMenu,
  onSubmitOrder,
  onOrderConfirmedNavigate,
}: CheckoutViewProps) {
  const [customerName, setCustomerName] = useState(user?.fullName ?? '');
  const [customerEmail, setCustomerEmail] = useState(user?.email ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | undefined>(undefined);
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);
  const [qrisModalOrder, setQrisModalOrder] = useState<OrderRecord | null>(null);
  const [countdownSec, setCountdownSec] = useState(14 * 60 + 59);
  const [verifyingQris, setVerifyingQris] = useState(false);

  useEffect(() => {
    if (user?.fullName && !customerName) setCustomerName(user.fullName);
    if (user?.email && !customerEmail) setCustomerEmail(user.email);
  }, [user, customerName, customerEmail]);

  useEffect(() => {
    if (!qrisModalOrder && paymentMethod !== 'qris') return;
    const timer = setInterval(() => {
      setCountdownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [qrisModalOrder, paymentMethod]);

  const mins = String(Math.floor(countdownSec / 60)).padStart(2, '0');
  const secs = String(countdownSec % 60).padStart(2, '0');
  const timerLabel = `${mins}:${secs}`;

  const totals = calculateCartTotals(
    items.map((item) => ({ quantity: item.quantity, unitPriceIdr: item.product.priceIdr })),
    subscriberDiscountPct,
    appliedPromo,
  );
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleApplyPromo = () => {
    const pct = resolvePromoDiscountPct(promoInput);
    if (pct > 0) {
      const code = promoInput.trim().toUpperCase();
      setAppliedPromo(code);
      setPromoFeedback(`Voucher ${code} aktif (diskon ${pct}%).`);
    } else {
      setAppliedPromo(undefined);
      setPromoFeedback('Kode tidak dikenali. Coba kode GREENCLUB atau KOPIALAMI.');
    }
  };

  const handleCheckout = async () => {
    const created = await onSubmitOrder({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      fulfillmentMode,
      tableOrNote: tableOrNote.trim(),
      paymentMethod,
      promoCode: appliedPromo,
    });
    if (!created) return;

    if (paymentMethod === 'qris') {
      setCountdownSec(14 * 60 + 59);
      setQrisModalOrder(created);
    } else if (paymentMethod === 'cash') {
      onOrderConfirmedNavigate(created);
    }
  };

  const handleVerifyQrisAndTrack = () => {
    if (!qrisModalOrder) return;
    setVerifyingQris(true);
    setTimeout(() => {
      const confirmed = qrisModalOrder;
      setVerifyingQris(false);
      setQrisModalOrder(null);
      onOrderConfirmedNavigate(confirmed);
    }, 550);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#fcf9f2] pt-24 pb-20">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10">
        {/* Breadcrumb & Hero Header */}
        <div className="pt-2 pb-6">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-[#444842]"
          >
            <button
              type="button"
              onClick={onNavigateWelcome}
              className="hover:text-[#182519] transition-colors"
            >
              Beranda
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-[#c4c8c0]" aria-hidden="true" />
            <button
              type="button"
              onClick={onNavigateMenu}
              className="hover:text-[#182519] transition-colors"
            >
              Daftar Menu
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-[#c4c8c0]" aria-hidden="true" />
            <span className="text-[#444842]">Keranjang</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#c4c8c0]" aria-hidden="true" />
            <span className="font-semibold text-[#182519]">Pembayaran</span>
          </nav>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#ebe8e1] px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-[#3c4a3c]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#182519]" />
                <span>Langkah Terakhir Pemesanan</span>
              </div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#182519]">
                Pembayaran
              </h1>
              <p className="mt-1 text-sm text-[#444842]">
                Periksa kembali pesanan Anda sebelum melanjutkan ke transaksi aman.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f6f3ec] px-4 py-2.5 text-xs font-medium text-[#444842]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#182519]" aria-hidden="true" />
                Enkripsi 256-bit
              </span>
              <span className="h-1 w-1 rounded-full bg-[#c4c8c0]" />
              <span className="flex items-center gap-1.5">
                <Leaf className="h-4 w-4 text-[#182519]" aria-hidden="true" />
                100% Organik &amp; Eco-friendly
              </span>
            </div>
          </div>
        </div>

        {/* Empty Cart State */}
        {items.length === 0 ? (
          <div className="rounded-3xl border border-[#e5e2db] bg-white p-10 text-center shadow-sm">
            <ShoppingBag className="mx-auto h-10 w-10 text-[#2d3b2d]" aria-hidden="true" />
            <h2 className="mt-3 font-serif text-2xl font-semibold text-[#182519]">
              Keranjang Pesanan Masih Kosong
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#444842]">
              Pilih kopi seduhan segar, mocktail, atau makanan hangat dari daftar menu Green Cafe
              terlebih dahulu.
            </p>
            <button
              type="button"
              onClick={onNavigateMenu}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#182519] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2d3b2d]"
            >
              <span>Jelajahi Daftar Menu</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          /* 60 / 40 Split Layout */
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* LEFT COLUMN (7 cols): Daftar Pesanan + Promo + Eco Card */}
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div className="flex flex-col rounded-2xl bg-white p-5 shadow-[0_4px_20px_rgba(24,37,25,0.03)] sm:p-7">
                <div className="flex items-center justify-between pb-5">
                  <div className="flex items-center gap-3">
                    <h2 className="font-serif text-xl font-semibold text-[#182519]">
                      Daftar Pesanan
                    </h2>
                    <span className="rounded-full bg-[#f1eee7] px-2.5 py-0.5 text-xs font-semibold text-[#182519] tabular-nums">
                      {itemCount} Item
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onNavigateMenu}
                    className="flex items-center gap-1 text-xs font-semibold text-[#7a582f] hover:text-[#5f401a]"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Tambah Menu</span>
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="rounded-xl bg-[#f6f3ec]/60 p-4 transition-colors hover:bg-[#f6f3ec]"
                    >
                      <div className="flex items-start gap-4">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="h-16 w-16 shrink-0 rounded-xl object-cover shadow-sm sm:h-20 sm:w-20"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#ebe8e1] text-[#747872] sm:h-20 sm:w-20">
                            <Camera className="h-5 w-5 opacity-70" aria-hidden="true" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-serif text-base font-semibold text-[#182519]">
                                {item.product.name}
                              </h3>
                              <p className="mt-0.5 text-xs text-[#444842] line-clamp-1">
                                {item.product.subcategory} • {item.product.description}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.product.id)}
                              aria-label={`Hapus ${item.product.name}`}
                              className="p-1 text-[#747872] transition-colors hover:text-[#ba1a1a]"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>

                          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                            <div className="inline-flex items-center rounded-full bg-white p-1 shadow-sm">
                              <button
                                type="button"
                                onClick={() => onUpdateQty(item.product.id, -1)}
                                aria-label={`Kurangi jumlah ${item.product.name}`}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-[#182519] hover:bg-[#f1eee7]"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-bold text-[#182519] tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQty(item.product.id, 1)}
                                aria-label={`Tambah jumlah ${item.product.name}`}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-[#182519] hover:bg-[#f1eee7]"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="text-base font-bold text-[#182519] tabular-nums">
                              {formatRupiah(item.product.priceIdr * item.quantity)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 border-t border-[#e5e2db]/70 pt-2.5">
                        <Edit3 className="h-3.5 w-3.5 shrink-0 text-[#747872]" aria-hidden="true" />
                        <input
                          type="text"
                          value={item.note ?? ''}
                          onChange={(e) => onUpdateNote(item.product.id, e.target.value)}
                          placeholder="Tambah catatan untuk barista (opsional)..."
                          className="w-full bg-transparent text-xs text-[#1c1c18] placeholder:text-[#747872] focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={onNavigateMenu}
                    className="inline-flex items-center gap-2 rounded-full bg-[#f1eee7] px-6 py-2.5 text-sm font-semibold text-[#182519] transition-colors hover:bg-[#ebe8e1]"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Tambah Menu Lainnya</span>
                  </button>
                </div>
              </div>

              {/* Promo Code & Biodegradable Bento Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
                  <div>
                    <div className="mb-1 flex items-center gap-2 font-serif text-base font-semibold text-[#182519]">
                      <Ticket className="h-4 w-4 text-[#7a582f]" aria-hidden="true" />
                      <span>Kode Promo</span>
                    </div>
                    <p className="text-xs text-[#444842]">
                      Gunakan voucher diskon Green Club (<span className="font-mono font-semibold">GREENCLUB</span>).
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Ketik kode promo..."
                      className="flex-1 rounded-xl bg-[#f6f3ec] px-3.5 py-2.5 text-xs font-semibold text-[#1c1c18] uppercase focus:bg-[#f1eee7] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="rounded-xl bg-[#2d3b2d] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#182519]"
                    >
                      Terapkan
                    </button>
                  </div>
                  {promoFeedback && (
                    <p className="mt-2 text-[11px] font-medium text-[#2d3b2d]">{promoFeedback}</p>
                  )}
                </div>

                <div className="flex flex-col justify-between rounded-2xl bg-[#f6f3ec] p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#182519] text-[#fcf9f2]">
                      <Coffee className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#182519]">
                        Kemasan 100% Biodegradable
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-[#444842]">
                        Semua kemasan take away terbuat dari serat singkong dan bambu organik tanpa
                        plastik sekali pakai.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-[#3a4b3b]">
                    <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Bebas biaya kemasan tambahan</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (5 cols): Sticky Summary + Payment Selector */}
            <div className="flex flex-col gap-4 lg:sticky lg:top-22 lg:col-span-5">
              <div className="rounded-2xl bg-white p-5 shadow-[0_6px_24px_rgba(24,37,25,0.04)]">
                {/* Service Option Banner */}
                <div className="mb-4 flex items-center justify-between rounded-xl bg-[#f6f3ec] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5e2db] text-[#182519]">
                      <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="block text-[11px] uppercase tracking-wide text-[#444842]">
                        Pilihan Layanan
                      </span>
                      <span className="text-xs font-bold text-[#182519]">
                        {fulfillmentMode === 'Dine-In'
                          ? 'Dine-In (Makan di Tempat)'
                          : 'Take Away (Bawa Pulang)'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeFulfillmentMode(
                        fulfillmentMode === 'Take Away' ? 'Dine-In' : 'Take Away',
                      )
                    }
                    className="text-xs font-semibold text-[#7a582f] hover:underline"
                  >
                    Ubah
                  </button>
                </div>

                {/* Customer Info */}
                <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="checkout-name"
                      className="block text-[11px] font-semibold uppercase tracking-wide text-[#444842]"
                    >
                      Nama Pemesan
                    </label>
                    <input
                      id="checkout-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Siti Aminah"
                      className="mt-1 w-full rounded-xl border border-[#c4c8c0] bg-[#fcf9f2] px-3 py-1.5 text-xs text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="checkout-email"
                      className="block text-[11px] font-semibold uppercase tracking-wide text-[#444842]"
                    >
                      Email Struk
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="siti@email.com"
                      className="mt-1 w-full rounded-xl border border-[#c4c8c0] bg-[#fcf9f2] px-3 py-1.5 text-xs text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="checkout-note"
                      className="block text-[11px] font-semibold uppercase tracking-wide text-[#444842]"
                    >
                      {fulfillmentMode === 'Dine-In' ? 'Nomor Meja / Catatan' : 'Catatan Pengambilan'}
                    </label>
                    <input
                      id="checkout-note"
                      type="text"
                      value={tableOrNote}
                      onChange={(e) => onChangeTableOrNote(e.target.value)}
                      placeholder={
                        fulfillmentMode === 'Dine-In'
                          ? 'Contoh: Meja 04 · Teras Taman'
                          : 'Contoh: Ambil di Bar Kasir pukul 15.00'
                      }
                      className="mt-1 w-full rounded-xl border border-[#c4c8c0] bg-[#fcf9f2] px-3 py-1.5 text-xs text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="mb-4">
                  <h3 className="mb-2.5 font-serif text-base font-semibold text-[#182519]">
                    Metode Pembayaran
                  </h3>
                  <div className="space-y-2">
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all ${
                        paymentMethod === 'qris'
                          ? 'bg-[#f1eee7] ring-1 ring-[#182519]'
                          : 'bg-[#f6f3ec]/60 hover:bg-[#f6f3ec]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value="qris"
                        checked={paymentMethod === 'qris'}
                        onChange={() => setPaymentMethod('qris')}
                        className="mt-0.5 accent-[#182519]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-[#182519]">
                            QRIS Instan
                            <span className="rounded-full bg-[#ffddba] px-2 py-0.5 text-[10px] font-semibold text-[#2b1700]">
                              Terverifikasi
                            </span>
                          </span>
                          <QrCode className="h-4 w-4 text-[#182519]" aria-hidden="true" />
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#444842]">
                          BCA, GoPay, OVO, ShopeePay, Dana, Livin
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all ${
                        paymentMethod === 'stripe_card'
                          ? 'bg-[#f1eee7] ring-1 ring-[#182519]'
                          : 'bg-[#f6f3ec]/60 hover:bg-[#f6f3ec]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value="stripe_card"
                        checked={paymentMethod === 'stripe_card'}
                        onChange={() => setPaymentMethod('stripe_card')}
                        className="mt-0.5 accent-[#182519]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#182519]">
                            Kartu Kredit / Debit (Stripe)
                          </span>
                          <CreditCard className="h-4 w-4 text-[#747872]" aria-hidden="true" />
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#444842]">
                          Visa, Mastercard, Stripe Checkout aman
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all ${
                        paymentMethod === 'cash'
                          ? 'bg-[#f1eee7] ring-1 ring-[#182519]'
                          : 'bg-[#f6f3ec]/60 hover:bg-[#f6f3ec]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={() => setPaymentMethod('cash')}
                        className="mt-0.5 accent-[#182519]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#182519]">Bayar di Kasir</span>
                          <Banknote className="h-4 w-4 text-[#747872]" aria-hidden="true" />
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#444842]">
                          Tunjukkan nomor pesanan ke barista saat mengambil
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Price Calculation Summary */}
                <div className="mb-4 space-y-1.5 rounded-xl bg-[#f6f3ec]/50 p-3.5 text-xs text-[#444842]">
                  <div className="flex items-center justify-between">
                    <span>Subtotal ({itemCount} item)</span>
                    <span className="font-semibold text-[#182519] tabular-nums">
                      {formatRupiah(totals.subtotalIdr)}
                    </span>
                  </div>
                  {totals.discountIdr > 0 && (
                    <div className="flex items-center justify-between text-[#2d3b2d]">
                      <span>
                        Diskon{' '}
                        {activeSubscription ? `Green Club (${subscriberDiscountPct}%)` : ''}{' '}
                        {appliedPromo ? `+ ${appliedPromo}` : ''}
                      </span>
                      <span className="font-semibold tabular-nums">
                        -{formatRupiah(totals.discountIdr)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Pajak Restoran (10%)</span>
                    <span className="font-semibold text-[#182519] tabular-nums">
                      {formatRupiah(totals.taxIdr)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Kemasan Ramah Lingkungan</span>
                    <span className="font-bold text-[#7a582f]">Gratis (Rp 0)</span>
                  </div>

                  <div className="mt-1.5 flex items-baseline justify-between border-t border-[#e5e2db] pt-2.5">
                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-[#444842]">
                        Total Pembayaran
                      </span>
                      <span className="font-serif text-2xl font-bold text-[#182519] tabular-nums">
                        {formatRupiah(totals.totalIdr)}
                      </span>
                    </div>
                    <span className="rounded-full bg-[#d7e7d3] px-2.5 py-1 text-[11px] font-semibold text-[#111f12]">
                      Termasuk Pajak
                    </span>
                  </div>
                </div>

                {errorMessage && (
                  <p
                    role="alert"
                    className="mb-3 rounded-xl bg-[#ffdad6] px-3.5 py-2 text-xs font-medium text-[#93000a]"
                  >
                    {errorMessage}
                  </p>
                )}

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleCheckout()}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#182519] py-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_-4px_rgba(24,37,25,0.3)] transition-all hover:bg-[#162517] disabled:opacity-60"
                >
                  <span className="tabular-nums">
                    {submitting
                      ? 'Memproses Pesanan...'
                      : `Bayar Sekarang • ${formatRupiah(totals.totalIdr)}`}
                  </span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </button>

                <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#747872]">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Pembayaran aman &amp; terenkripsi • Konfirmasi instan</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QRIS Scan Modal matching HTML */}
      {qrisModalOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qris-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#182519]/45 p-4 backdrop-blur-sm"
        >
          <div className="relative flex w-full max-w-md flex-col items-center rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <button
              type="button"
              onClick={() => setQrisModalOrder(null)}
              aria-label="Tutup Modal QRIS"
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-[#f1eee7] text-[#444842] hover:text-[#182519]"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#ffddba] px-3 py-1 text-xs font-semibold text-[#2b1700]">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#7a582f]" />
              <span>Menunggu Pembayaran</span>
            </span>

            <p id="qris-modal-title" className="font-mono text-xs text-[#444842]">
              Invoice #{qrisModalOrder.orderCode}
            </p>

            <div className="my-4 flex items-center gap-2 rounded-full bg-[#ebe8e1] px-5 py-2 text-xs font-medium text-[#182519]">
              <Timer className="h-4 w-4 text-[#7a582f]" aria-hidden="true" />
              <span>
                Selesaikan dalam <strong className="font-mono text-sm font-bold">{timerLabel}</strong>
              </span>
            </div>

            <div className="flex flex-col items-center rounded-2xl border border-[#f1eee7] bg-white p-4 shadow-sm">
              <div className="mb-2 flex w-full items-center justify-between px-1">
                <span className="font-serif text-base font-bold text-[#182519]">Green Cafe</span>
                <span className="rounded bg-[#e5e2db] px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-[#182519]">
                  QRIS
                </span>
              </div>
              <div className="flex h-48 w-48 items-center justify-center rounded-xl p-2">
                <svg className="h-full w-full text-[#182519]" fill="currentColor" viewBox="0 0 160 160">
                  <rect height="40" rx="6" width="40" x="10" y="10" />
                  <rect fill="#ffffff" height="28" rx="3" width="28" x="16" y="16" />
                  <rect height="16" rx="2" width="16" x="22" y="22" />
                  <rect height="40" rx="6" width="40" x="110" y="10" />
                  <rect fill="#ffffff" height="28" rx="3" width="28" x="116" y="16" />
                  <rect height="16" rx="2" width="16" x="122" y="22" />
                  <rect height="40" rx="6" width="40" x="10" y="110" />
                  <rect fill="#ffffff" height="28" rx="3" width="28" x="16" y="116" />
                  <rect height="16" rx="2" width="16" x="22" y="122" />
                  <rect height="8" rx="1.5" width="8" x="60" y="12" />
                  <rect height="8" rx="1.5" width="14" x="74" y="12" />
                  <rect height="16" rx="1.5" width="8" x="94" y="12" />
                  <rect height="6" rx="1.5" width="12" x="60" y="26" />
                  <rect height="12" rx="1.5" width="10" x="78" y="26" />
                  <rect height="14" rx="1.5" width="8" x="12" y="60" />
                  <rect height="8" rx="1.5" width="14" x="26" y="60" />
                  <rect height="8" rx="1.5" width="8" x="46" y="60" />
                  <rect height="10" rx="1.5" width="10" x="62" y="56" />
                  <rect height="8" rx="1.5" width="16" x="78" y="52" />
                  <rect height="16" rx="1.5" width="8" x="100" y="56" />
                  <rect height="8" rx="1.5" width="12" x="114" y="60" />
                  <rect height="10" rx="1.5" width="18" x="132" y="60" />
                  <rect fill="#ffffff" height="32" rx="8" width="32" x="64" y="64" />
                  <rect fill="#182519" height="26" rx="6" width="26" x="67" y="67" />
                  <path
                    d="M80 72C77 75 75 78 75 81C75 84 77 86 80 86C83 86 85 84 85 81C85 78 83 75 80 72Z"
                    fill="#fcf9f2"
                  />
                  <rect height="10" rx="1.5" width="18" x="12" y="80" />
                  <rect height="18" rx="1.5" width="8" x="36" y="76" />
                  <rect height="16" rx="1.5" width="10" x="104" y="80" />
                  <rect height="10" rx="1.5" width="8" x="120" y="76" />
                  <rect height="10" rx="1.5" width="16" x="134" y="80" />
                  <rect height="8" rx="1.5" width="14" x="60" y="104" />
                  <rect height="18" rx="1.5" width="8" x="80" y="102" />
                  <rect height="10" rx="1.5" width="16" x="94" y="106" />
                  <rect height="8" rx="1.5" width="10" x="116" y="102" />
                  <rect height="14" rx="1.5" width="18" x="132" y="104" />
                  <rect height="14" rx="1.5" width="8" x="60" y="126" />
                  <rect height="8" rx="1.5" width="16" x="74" y="126" />
                  <rect height="18" rx="1.5" width="12" x="96" y="122" />
                  <rect height="14" rx="1.5" width="8" x="114" y="124" />
                  <rect height="12" rx="1.5" width="22" x="128" y="124" />
                </svg>
              </div>
              <p className="mt-2 max-w-[240px] text-center text-xs text-[#444842]">
                Scan dengan BCA Mobile, GoPay, OVO, ShopeePay, atau m-Banking pilihan Anda.
              </p>
            </div>

            <div className="mt-4 flex w-full items-center justify-between rounded-xl bg-[#f1eee7] p-3">
              <span className="text-xs text-[#444842]">Total Tagihan:</span>
              <span className="font-serif text-base font-bold text-[#182519] tabular-nums">
                {formatRupiah(qrisModalOrder.totalIdr)}
              </span>
            </div>

            <div className="mt-4 flex w-full flex-col gap-2">
              <button
                type="button"
                disabled={verifyingQris}
                onClick={handleVerifyQrisAndTrack}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#182519] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#162517]"
              >
                <RefreshCw
                  className={`h-4 w-4 ${verifyingQris ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>
                  {verifyingQris ? 'Memverifikasi Pembayaran...' : 'Cek Status Pembayaran'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setQrisModalOrder(null)}
                className="w-full py-2 text-xs font-medium text-[#747872] hover:text-[#ba1a1a]"
              >
                Tutup Jendela QRIS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
