import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTransactionsCsv,
  calculateCartTotals,
  computeAdminOverview,
  filterTransactions,
  formatRupiah,
  resolvePromoDiscountPct,
} from './pricing';
import type { TransactionRecord } from './types';

test('formatRupiah formats Indonesian currency without decimals', () => {
  assert.equal(formatRupiah(27000), 'Rp 27.000');
  assert.equal(formatRupiah(85800), 'Rp 85.800');
  assert.equal(formatRupiah(0), 'Rp 0');
});

test('calculateCartTotals applies 10% restaurant tax matching Green Cafe checkout', () => {
  const totals = calculateCartTotals([
    { quantity: 1, unitPriceIdr: 27000 },
    { quantity: 1, unitPriceIdr: 24000 },
    { quantity: 1, unitPriceIdr: 27000 },
  ]);
  // Subtotal = 78,000; Tax 10% = 7,800; Total = 85,800
  assert.equal(totals.subtotalIdr, 78000);
  assert.equal(totals.discountIdr, 0);
  assert.equal(totals.taxIdr, 7800);
  assert.equal(totals.totalIdr, 85800);
});

test('calculateCartTotals stacks member discount and promo code before 10% tax', () => {
  assert.equal(resolvePromoDiscountPct('GREENCLUB'), 10);
  const totals = calculateCartTotals([{ quantity: 2, unitPriceIdr: 50000 }], 10, 'GREENCLUB');
  // Subtotal 100,000; 20% discount = 20,000; taxable = 80,000; 10% tax = 8,000; total = 88,000
  assert.equal(totals.subtotalIdr, 100000);
  assert.equal(totals.discountIdr, 20000);
  assert.equal(totals.taxIdr, 8000);
  assert.equal(totals.totalIdr, 88000);
});

test('filterTransactions filters by status, type, and search query', () => {
  const sample: TransactionRecord[] = [
    {
      id: '1',
      referenceCode: 'TX-INV-2026-089',
      orderCode: 'INV-2026-089',
      userId: 'u1',
      customerName: 'Siti Aminah',
      customerEmail: 'siti@contoh.id',
      type: 'order',
      paymentProvider: 'QRIS',
      amountIdr: 85800,
      status: 'succeeded',
      description: 'Pesanan INV-2026-089',
      createdAt: '2026-11-23T08:00:00.000Z',
    },
    {
      id: '2',
      referenceCode: 'TX-SUB-1002',
      userId: 'u2',
      customerName: 'Nadia Putri',
      customerEmail: 'nadia@contoh.id',
      type: 'subscription',
      paymentProvider: 'Stripe',
      amountIdr: 249000,
      status: 'pending',
      description: 'Langganan Botanical Explorer',
      createdAt: '2026-11-23T08:15:00.000Z',
    },
  ];

  assert.equal(filterTransactions(sample, { status: 'succeeded' }).length, 1);
  assert.equal(filterTransactions(sample, { type: 'subscription' }).length, 1);
  assert.equal(filterTransactions(sample, { query: 'INV-2026-089' })[0]?.customerName, 'Siti Aminah');
});

test('computeAdminOverview calculates operational queues, revenue, MRR, and success rate', () => {
  const overview = computeAdminOverview({
    transactions: [
      {
        id: '1',
        referenceCode: 'TX-1',
        userId: null,
        customerName: 'A',
        customerEmail: 'a@test.com',
        type: 'order',
        paymentProvider: 'Stripe',
        amountIdr: 50000,
        status: 'succeeded',
        description: 'Order 1',
        createdAt: '2026-11-23T05:00:00.000Z',
      },
    ],
    activeSubscriptions: [{ amountIdr: 249000, status: 'active' }],
    orders: [
      { status: 'pending_payment' },
      { status: 'preparing' },
      { status: 'ready' },
      { status: 'completed' },
    ],
    reservations: [{ status: 'confirmed' }, { status: 'canceled' }],
    usersCount: 8,
    now: new Date('2026-11-23T10:00:00.000Z'),
  });

  assert.equal(overview.totalRevenueIdr, 50000);
  assert.equal(overview.activeOrdersCount, 3);
  assert.equal(overview.pendingCashierCount, 1);
  assert.equal(overview.readyOrdersCount, 1);
  assert.equal(overview.todayReservationsCount, 1);
  assert.equal(overview.mrrIdr, 249000);
});

test('buildTransactionsCsv escapes commas and quotes cleanly', () => {
  const csv = buildTransactionsCsv([
    {
      id: '1',
      referenceCode: 'TX-1',
      userId: null,
      customerName: 'Sari, Dewi',
      customerEmail: 'sari@example.com',
      type: 'order',
      paymentProvider: 'QRIS',
      amountIdr: 85800,
      status: 'succeeded',
      description: 'Coffee "Aren" Latte',
      createdAt: '2026-11-23T07:00:00.000Z',
    },
  ]);

  assert.match(csv, /^Reference,Timestamp,Customer/);
  assert.match(csv, /"Sari, Dewi"/);
  assert.match(csv, /"Coffee ""Aren"" Latte"/);
});
