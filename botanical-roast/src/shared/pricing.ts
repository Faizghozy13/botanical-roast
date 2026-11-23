import type {
  AdminOverview,
  OrderItemSummary,
  OrderRecord,
  ReservationRecord,
  TransactionRecord,
  TransactionStatus,
  TransactionType,
} from './types';

export interface CartTotals {
  subtotalIdr: number;
  discountIdr: number;
  taxIdr: number;
  totalIdr: number;
}

const PROMO_CODES: Record<string, number> = {
  GREENCLUB: 10,
  KOPIALAMI: 15,
};

export function resolvePromoDiscountPct(code?: string): number {
  if (!code) return 0;
  return PROMO_CODES[code.trim().toUpperCase()] ?? 0;
}

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `Rp ${safe.toLocaleString('id-ID')}`;
}

export function calculateCartTotals(
  items: Pick<OrderItemSummary, 'quantity' | 'unitPriceIdr'>[],
  subscriberDiscountPct = 0,
  promoCode?: string,
): CartTotals {
  const subtotalIdr = items.reduce(
    (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitPriceIdr),
    0,
  );
  const promoPct = resolvePromoDiscountPct(promoCode);
  const combinedPct = Math.min(50, Math.max(0, subscriberDiscountPct) + promoPct);
  const discountIdr = Math.round((subtotalIdr * combinedPct) / 100);
  const taxable = Math.max(0, subtotalIdr - discountIdr);
  const taxIdr = taxable > 0 ? Math.round(taxable * 0.1) : 0;
  const totalIdr = taxable + taxIdr;

  return {
    subtotalIdr,
    discountIdr,
    taxIdr,
    totalIdr,
  };
}

export function filterTransactions(
  transactions: TransactionRecord[],
  options: {
    query?: string;
    status?: TransactionStatus | 'all';
    type?: TransactionType | 'all';
  },
): TransactionRecord[] {
  const q = (options.query ?? '').trim().toLowerCase();
  const statusFilter = options.status ?? 'all';
  const typeFilter = options.type ?? 'all';

  return transactions.filter((tx) => {
    if (statusFilter !== 'all' && tx.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'all' && tx.type !== typeFilter) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      tx.referenceCode.toLowerCase().includes(q) ||
      (tx.orderCode ?? '').toLowerCase().includes(q) ||
      tx.customerName.toLowerCase().includes(q) ||
      tx.customerEmail.toLowerCase().includes(q) ||
      tx.description.toLowerCase().includes(q) ||
      tx.paymentProvider.toLowerCase().includes(q)
    );
  });
}

export function computeAdminOverview(params: {
  transactions: TransactionRecord[];
  activeSubscriptions: { amountIdr: number; status: string }[];
  orders: Pick<OrderRecord, 'status'>[];
  reservations: Pick<ReservationRecord, 'status'>[];
  usersCount: number;
  now?: Date;
}): AdminOverview {
  const now = params.now ?? new Date();
  const todayIsoDate = now.toISOString().slice(0, 10);

  const succeededTxs = params.transactions.filter((tx) => tx.status === 'succeeded');
  const totalRevenueIdr = succeededTxs.reduce((acc, tx) => acc + tx.amountIdr, 0);
  const todayRevenueIdr = succeededTxs
    .filter((tx) => tx.createdAt.slice(0, 10) === todayIsoDate)
    .reduce((acc, tx) => acc + tx.amountIdr, 0);

  const activeOrdersCount = params.orders.filter(
    (o) => o.status === 'pending_payment' || o.status === 'preparing' || o.status === 'ready',
  ).length;
  const pendingCashierCount = params.orders.filter((o) => o.status === 'pending_payment').length;
  const readyOrdersCount = params.orders.filter((o) => o.status === 'ready').length;
  const todayReservationsCount = params.reservations.filter(
    (r) => r.status === 'confirmed' || r.status === 'seated',
  ).length;

  const activeSubs = params.activeSubscriptions.filter((s) => s.status === 'active');
  const mrrIdr = activeSubs.reduce((acc, s) => acc + s.amountIdr, 0);

  const settledTxs = params.transactions.filter(
    (tx) => tx.status === 'succeeded' || tx.status === 'failed',
  );
  const succeededRatePct =
    settledTxs.length === 0
      ? 100
      : Math.round(
          (settledTxs.filter((tx) => tx.status === 'succeeded').length / settledTxs.length) * 100,
        );

  return {
    totalRevenueIdr,
    todayRevenueIdr,
    activeOrdersCount,
    pendingCashierCount,
    readyOrdersCount,
    todayReservationsCount,
    activeSubscriptionsCount: activeSubs.length,
    mrrIdr,
    totalOrdersCount: params.orders.length,
    registeredUsersCount: params.usersCount,
    succeededRatePct,
  };
}

export function buildTransactionsCsv(transactions: TransactionRecord[]): string {
  const header = [
    'Reference',
    'Timestamp',
    'Customer',
    'Email',
    'Type',
    'Provider',
    'AmountIDR',
    'Status',
    'Description',
  ].join(',');

  const escapeCsv = (val: string | number): string => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = transactions.map((tx) =>
    [
      escapeCsv(tx.referenceCode),
      escapeCsv(tx.createdAt),
      escapeCsv(tx.customerName),
      escapeCsv(tx.customerEmail),
      escapeCsv(tx.type),
      escapeCsv(tx.paymentProvider),
      escapeCsv(tx.amountIdr),
      escapeCsv(tx.status),
      escapeCsv(tx.description),
    ].join(','),
  );

  return [header, ...rows].join('\n');
}
