import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Coffee,
  Download,
  Edit3,
  ExternalLink,
  Headphones,
  History,
  Hourglass,
  Leaf,
  QrCode,
  ReceiptText,
  Search,
  Store,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchOrderByCode } from '../lib/api';
import { formatRupiah } from '../shared/pricing';
import type { OrderRecord, OrderStatus } from '../shared/types';

interface OrderTrackingViewProps {
  initialOrder: OrderRecord | null;
  pastOrders: OrderRecord[];
  onBackHome: () => void;
  onOrderAgain: () => void;
}

const STEP_LABELS: { key: OrderStatus; title: string; subtitle: string }[] = [
  { key: 'pending_payment', title: '1. Menunggu Bayar', subtitle: 'Verifikasi pembayaran' },
  { key: 'preparing', title: '2. Diproses Barista', subtitle: 'Sedang diracik' },
  { key: 'ready', title: '3. Siap Diambil', subtitle: 'Menunggu diambil' },
  { key: 'completed', title: '4. Selesai', subtitle: 'Pengambilan tuntas' },
];

function getStepIndex(status: OrderStatus): number {
  if (status === 'pending_payment') return 0;
  if (status === 'preparing') return 1;
  if (status === 'ready') return 2;
  if (status === 'completed') return 3;
  return -1;
}

export function OrderTrackingView({
  initialOrder,
  pastOrders,
  onBackHome,
  onOrderAgain,
}: OrderTrackingViewProps) {
  const [trackedOrder, setTrackedOrder] = useState<OrderRecord | null>(initialOrder);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [receiptDownloaded, setReceiptDownloaded] = useState(false);

  // Fallback to default INV-2026-089 demo order if none active yet
  useEffect(() => {
    if (initialOrder) {
      setTrackedOrder(initialOrder);
      return;
    }
    let active = true;
    fetchOrderByCode('INV-2026-089')
      .then((res) => {
        if (active) setTrackedOrder(res.order);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [initialOrder]);

  // Live SSE connection for instant Barista status updates
  useEffect(() => {
    if (!trackedOrder) return;
    const source = new EventSource(
      `/api/orders/stream/${encodeURIComponent(trackedOrder.orderCode)}`,
    );
    source.addEventListener('order:snapshot', (ev) => {
      const updated = JSON.parse((ev as MessageEvent).data) as OrderRecord;
      setTrackedOrder(updated);
    });
    source.addEventListener('order:updated', (ev) => {
      const updated = JSON.parse((ev as MessageEvent).data) as OrderRecord;
      setTrackedOrder(updated);
    });
    return () => {
      source.close();
    };
  }, [trackedOrder?.orderCode]);

  const handleLookup = async () => {
    const code = lookupCode.replace(/^#/, '').trim();
    if (!code) return;
    setLookupError(null);
    try {
      const res = await fetchOrderByCode(code);
      setTrackedOrder(res.order);
      setLookupCode('');
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Nomor invoice tidak ditemukan.');
    }
  };

  const handleDownloadReceipt = () => {
    if (!trackedOrder) return;
    const lines = [
      'GREEN CAFE — STRUK DIGITAL RESMI',
      `Order ID   : #${trackedOrder.orderCode}`,
      `Pelanggan  : ${trackedOrder.customerName} (${trackedOrder.customerEmail})`,
      `Layanan    : ${trackedOrder.fulfillmentMode} (${trackedOrder.tableOrNote})`,
      `Tanggal    : ${new Date(trackedOrder.createdAt).toLocaleString('id-ID')} WIB`,
      '----------------------------------------',
      ...trackedOrder.items.map(
        (item) =>
          `${item.quantity}x ${item.name} — ${formatRupiah(item.unitPriceIdr * item.quantity)}${
            item.note ? ` [Catatan: ${item.note}]` : ''
          }`,
      ),
      '----------------------------------------',
      `Subtotal   : ${formatRupiah(trackedOrder.subtotalIdr)}`,
      `Diskon     : -${formatRupiah(trackedOrder.discountIdr)}`,
      `Pajak 10%  : ${formatRupiah(trackedOrder.taxIdr)}`,
      `TOTAL      : ${formatRupiah(trackedOrder.totalIdr)}`,
      `Pembayaran : ${trackedOrder.paymentMethod.toUpperCase()}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `struk-${trackedOrder.orderCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setReceiptDownloaded(true);
    setTimeout(() => setReceiptDownloaded(false), 2500);
  };

  const currentStepIdx = trackedOrder ? getStepIndex(trackedOrder.status) : 1;
  const progressPct =
    currentStepIdx <= 0 ? 12 : currentStepIdx === 1 ? 42 : currentStepIdx === 2 ? 75 : 100;

  const paymentBadgeText =
    trackedOrder?.paymentMethod === 'qris'
      ? 'LUNAS • QRIS'
      : trackedOrder?.paymentMethod === 'stripe_card'
        ? trackedOrder.status === 'pending_payment'
          ? 'MENUNGGU • STRIPE'
          : 'LUNAS • STRIPE'
        : trackedOrder?.status === 'pending_payment'
          ? 'BAYAR DI KASIR'
          : 'LUNAS • KASIR';

  const statusHeading = !trackedOrder
    ? 'Memuat Pesanan...'
    : trackedOrder.status === 'pending_payment'
      ? 'Menunggu Konfirmasi Pembayaran'
      : trackedOrder.status === 'preparing'
        ? 'Pesanan Sedang Dipersiapkan'
        : trackedOrder.status === 'ready'
          ? 'Pesanan Siap Diambil!'
          : trackedOrder.status === 'completed'
            ? 'Pesanan Telah Selesai'
            : 'Pesanan Dibatalkan';

  const historyList =
    pastOrders.length > 0
      ? pastOrders
      : [
          {
            id: 'hist-1',
            orderCode: 'INV-2026-074',
            createdAt: '2026-11-15T07:20:00.000Z',
            totalIdr: 49500,
            items: [{ productId: '1', name: 'V60 & Mix Platter', quantity: 2, unitPriceIdr: 22500 }],
          },
        ];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#fcf9f2] pt-24 pb-20">
      <div className="mx-auto max-w-3xl space-y-7 px-4 sm:px-6 lg:px-8">
        {/* Top Navigation & Invoice Search */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onBackHome}
            className="group inline-flex items-center gap-2 text-xs font-semibold text-[#444842] transition-colors hover:text-[#182519]"
          >
            <ArrowLeft
              className="h-4 w-4 transition-transform group-hover:-translate-x-1"
              aria-hidden="true"
            />
            <span>Kembali ke Beranda</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-52">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#747872]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleLookup();
                }}
                placeholder="Lacak #INV-2026-..."
                aria-label="Lacak kode invoice"
                className="w-full rounded-full border border-[#c4c8c0] bg-white py-1.5 pr-3 pl-8 text-xs text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleLookup()}
              className="rounded-full bg-[#2d3b2d] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#182519]"
            >
              Cek
            </button>
          </div>
        </div>

        {lookupError && (
          <p role="alert" className="rounded-xl bg-[#ffdad6] px-4 py-2 text-xs font-medium text-[#93000a]">
            {lookupError}
          </p>
        )}

        {trackedOrder && (
          <>
            {/* Header Status Card */}
            <div className="relative overflow-hidden rounded-3xl bg-[#f6f3ec] p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#444842]">
                      Status Pesanan Langsung
                    </span>
                    <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#182519] sm:text-3xl">
                      {statusHeading}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#444842]">
                      <span className="font-mono font-semibold text-[#182519]">
                        #{trackedOrder.orderCode}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-[#c4c8c0]" />
                      <span>
                        {new Date(trackedOrder.createdAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        WIB
                      </span>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#d7e7d3] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#182519] shadow-sm">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>{paymentBadgeText}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                  <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-sm">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fecf9d] text-[#79562e]">
                      <Hourglass className="h-5 w-5" aria-hidden="true" />
                      {trackedOrder.status !== 'completed' && trackedOrder.status !== 'canceled' && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7a582f] opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-[#7a582f]" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#444842]">
                        Estimasi Siap
                      </p>
                      <p className="font-serif text-base font-semibold text-[#182519]">
                        {trackedOrder.status === 'ready'
                          ? 'Sudah Siap di Konter'
                          : trackedOrder.status === 'completed'
                            ? 'Pesanan Selesai'
                            : '10 - 15 Menit'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d4e8d2] text-[#162517]">
                      <Store className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#444842]">
                        Metode Pengambilan
                      </p>
                      <p className="font-serif text-base font-semibold text-[#182519]">
                        {trackedOrder.fulfillmentMode} ({trackedOrder.tableOrNote})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Linear 4-Step Horizontal Stepper */}
            <div className="rounded-3xl bg-[#f6f3ec] p-6 shadow-sm sm:p-8">
              <div className="relative">
                <div className="absolute top-5 right-10 left-10 hidden h-0.5 bg-[#e5e2db] sm:block">
                  <div
                    className="h-full bg-[#182519] transition-all duration-700 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="relative z-10 grid grid-cols-1 gap-5 sm:grid-cols-4 sm:gap-2">
                  {STEP_LABELS.map((step, index) => {
                    const isDone = currentStepIdx > index || trackedOrder.status === 'completed';
                    const isCurrent = currentStepIdx === index && trackedOrder.status !== 'completed';
                    return (
                      <div
                        key={step.key}
                        className={`flex items-center gap-4 text-left sm:flex-col sm:gap-3 sm:text-center ${
                          !isDone && !isCurrent ? 'opacity-50' : ''
                        }`}
                      >
                        <div
                          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
                            isDone
                              ? 'bg-[#182519] text-white'
                              : isCurrent
                                ? 'bg-[#2d3b2d] text-white'
                                : 'bg-[#e5e2db] text-[#444842]'
                          }`}
                        >
                          {isDone ? (
                            <Check className="h-4 w-4" aria-hidden="true" />
                          ) : isCurrent ? (
                            <>
                              <Coffee className="h-4 w-4" aria-hidden="true" />
                              <span className="absolute inset-0 animate-ping rounded-full bg-[#2d3b2d] opacity-25" />
                            </>
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#182519]">{step.title}</p>
                          <p className="text-[11px] text-[#444842]">
                            {isCurrent ? 'Sedang berlangsung' : step.subtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Visual Botanical Mood Banner (using verified local asset) */}
            <div className="relative flex h-44 items-end overflow-hidden rounded-3xl bg-[#f1eee7] shadow-sm sm:h-52">
              <img
                src="/src/assets/images/hero_botanical_coffee_1795446999616.jpg"
                alt="Barista Green Cafe menyeduh kopi organik di meja kayu alami"
                className="absolute inset-0 h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#182519]/90 via-[#182519]/40 to-transparent" />
              <div className="relative z-10 flex w-full items-center justify-between p-6 text-white sm:p-8">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#bbcbb8]">
                    Green Cafe Kitchen
                  </span>
                  <p className="font-serif text-lg font-semibold text-white">
                    Dibuat dari Biji Kopi Organik Pilihan
                  </p>
                </div>
                <div className="hidden items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md sm:flex">
                  <Leaf className="h-4 w-4" aria-hidden="true" />
                  <span>Earth-Friendly Kitchen</span>
                </div>
              </div>
            </div>

            {/* Digital Receipt Card */}
            <div className="space-y-6 rounded-3xl bg-white p-6 shadow-md sm:p-9">
              <div className="-mx-6 -mt-6 flex items-center justify-between rounded-t-3xl bg-[#f6f3ec]/60 p-6 sm:-mx-9 sm:-mt-9 sm:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d7e7d3] text-[#182519]">
                    <ReceiptText className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-[#182519]">
                      Rincian Pesanan
                    </h2>
                    <p className="text-xs text-[#444842]">
                      Struk Digital • Order ID: #{trackedOrder.orderCode}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[#e5e2db] px-3 py-1 text-xs font-semibold text-[#1c1c18] tabular-nums">
                  {trackedOrder.items.reduce((s, i) => s + i.quantity, 0)} Item
                </span>
              </div>

              <div className="space-y-4">
                {trackedOrder.items.map((item, idx) => (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="flex items-start justify-between gap-4 rounded-2xl bg-[#f6f3ec] p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[#182519] px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
                          {item.quantity}x
                        </span>
                        <h3 className="font-serif text-base font-semibold text-[#182519]">
                          {item.name}
                        </h3>
                      </div>
                      {item.customization && (
                        <p className="text-xs text-[#444842]">{item.customization}</p>
                      )}
                      {item.note && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#f1eee7] px-2.5 py-1 text-[11px] text-[#444842]">
                          <Edit3 className="h-3 w-3 text-[#182519]" aria-hidden="true" />
                          <span>Catatan: {item.note}</span>
                        </div>
                      )}
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold text-[#182519] tabular-nums">
                      {formatRupiah(item.unitPriceIdr * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 rounded-2xl bg-[#f1eee7] p-5 text-sm">
                <div className="flex items-center justify-between text-[#444842]">
                  <span>Subtotal Produk</span>
                  <span className="font-medium text-[#1c1c18] tabular-nums">
                    {formatRupiah(trackedOrder.subtotalIdr)}
                  </span>
                </div>
                {trackedOrder.discountIdr > 0 && (
                  <div className="flex items-center justify-between text-[#2d3b2d]">
                    <span>Diskon Anggota / Promo</span>
                    <span className="font-semibold tabular-nums">
                      -{formatRupiah(trackedOrder.discountIdr)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[#444842]">
                  <span>Pajak Restoran (10%)</span>
                  <span className="font-medium text-[#1c1c18] tabular-nums">
                    {formatRupiah(trackedOrder.taxIdr)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#444842]">
                  <span>Kemasan Ramah Lingkungan</span>
                  <span className="font-semibold text-[#182519]">Gratis</span>
                </div>
                <div className="-mx-5 -mb-5 mt-3 flex items-baseline justify-between rounded-b-2xl bg-white p-5 shadow-inner">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#444842]">
                      Total Tagihan
                    </span>
                    <p className="text-xs text-[#747872]">Termasuk Pajak &amp; Biaya Layanan</p>
                  </div>
                  <span className="font-serif text-2xl font-bold text-[#182519] tabular-nums">
                    {formatRupiah(trackedOrder.totalIdr)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-[#444842]">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-[#182519]" aria-hidden="true" />
                  <span>
                    Metode:{' '}
                    <strong className="text-[#182519]">
                      {trackedOrder.paymentMethod === 'qris'
                        ? 'QRIS Instan'
                        : trackedOrder.paymentMethod === 'stripe_card'
                          ? 'Stripe Card'
                          : 'Bayar di Kasir'}
                    </strong>
                  </span>
                </div>
                <span className="font-mono text-[#747872]">
                  REF: TX-{trackedOrder.orderCode}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ebe8e1] px-7 py-3.5 text-sm font-semibold text-[#182519] shadow-sm transition-colors hover:bg-[#e5e2db] sm:w-auto"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>
                  {receiptDownloaded ? 'Struk Terunduh!' : 'Unduh Struk Digital'}
                </span>
              </button>
              <button
                type="button"
                onClick={onOrderAgain}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#182519] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#2d3b2d] sm:w-auto"
              >
                <Store className="h-4 w-4" aria-hidden="true" />
                <span>Pesan Lagi</span>
              </button>
            </div>
          </>
        )}

        {/* Collapsible Riwayat Pesanan Terakhir */}
        <div className="rounded-2xl bg-[#f6f3ec] p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setHistoryOpen((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              <History className="h-5 w-5 text-[#182519]" aria-hidden="true" />
              <span className="text-sm font-semibold text-[#182519]">
                Riwayat Pesanan Terakhir
              </span>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-[#444842] transition-transform duration-300 ${
                historyOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {historyOpen && (
            <div className="mt-3 space-y-2.5 pt-2">
              {historyList.slice(0, 4).map((hist) => (
                <button
                  key={hist.id}
                  type="button"
                  onClick={() => {
                    fetchOrderByCode(hist.orderCode)
                      .then((r) => setTrackedOrder(r.order))
                      .catch(() => undefined);
                  }}
                  className="flex w-full items-center justify-between rounded-xl bg-white p-3.5 text-left text-sm transition-colors hover:bg-[#f1eee7]"
                >
                  <div>
                    <span className="font-mono font-semibold text-[#182519]">
                      #{hist.orderCode}
                    </span>
                    <p className="text-xs text-[#444842]">
                      {new Date(hist.createdAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      • {hist.items.length} Item
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-[#f1eee7] px-2.5 py-0.5 text-[11px] font-medium text-[#1c1c18]">
                      Lihat Status
                    </span>
                    <p className="mt-1 text-xs font-bold text-[#182519] tabular-nums">
                      {formatRupiah(hist.totalIdr)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Support Bar */}
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-[#f6f3ec] p-5 shadow-sm sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fecf9d] text-[#79562e]">
              <Headphones className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#182519]">Butuh bantuan langsung?</p>
              <p className="text-xs text-[#444842]">
                Hubungi tim barista Green Cafe untuk perubahan pesanan.
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#182519] shadow-sm hover:bg-[#f1eee7]"
          >
            <span>Chat Barista</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
