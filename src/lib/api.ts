import type {
  ActivityLog,
  AdminOverview,
  FulfillmentMode,
  OrderItemSummary,
  OrderRecord,
  OrderStatus,
  PaymentMethod,
  Product,
  PublicConfig,
  ReservationRecord,
  SubscriptionPlan,
  SubscriptionRecord,
  TransactionRecord,
  UserProfile,
} from '../shared/types';

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (token) {
    mergedHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...rest,
    headers: mergedHeaders,
  });

  if (!res.ok) {
    let errorMessage = `Permintaan gagal (${res.status})`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody.error) errorMessage = errBody.error;
    } catch {
      // Ignore parse failure
    }
    throw new Error(errorMessage);
  }

  return (await res.json()) as T;
}

export function fetchPublicConfig(): Promise<PublicConfig> {
  return apiFetch<PublicConfig>('/api/config/public');
}

export function fetchMenu(): Promise<{ products: Product[] }> {
  return apiFetch<{ products: Product[] }>('/api/menu');
}

export function fetchPlans(): Promise<{ plans: SubscriptionPlan[] }> {
  return apiFetch<{ plans: SubscriptionPlan[] }>('/api/plans');
}

export function registerAccount(payload: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{ user: UserProfile; token: string }> {
  return apiFetch<{ user: UserProfile; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginAccount(payload: {
  email: string;
  password: string;
}): Promise<{ user: UserProfile; token: string }> {
  return apiFetch<{ user: UserProfile; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function bootstrapAdminAccount(payload: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{ user: UserProfile; token: string }> {
  return apiFetch<{ user: UserProfile; token: string }>('/api/auth/bootstrap-admin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchCurrentUser(token: string): Promise<{
  user: UserProfile;
  subscriptions: SubscriptionRecord[];
  orders: OrderRecord[];
  reservations: ReservationRecord[];
}> {
  return apiFetch('/api/auth/me', { token });
}

export function logoutAccount(token: string | null): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/api/auth/logout', {
    method: 'POST',
    token,
  });
}

export function createReservation(
  payload: {
    customerName: string;
    customerEmail: string;
    phone: string;
    guests: number;
    tableNumber: string;
    reservationDate: string;
    reservationTime: string;
    notes?: string;
  },
  token: string | null,
): Promise<{ reservation: ReservationRecord }> {
  return apiFetch('/api/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function fetchOrderByCode(orderCode: string): Promise<{ order: OrderRecord }> {
  return apiFetch(`/api/orders/${encodeURIComponent(orderCode)}`);
}

export function createOrder(
  payload: {
    customerName: string;
    customerEmail: string;
    fulfillmentMode: FulfillmentMode;
    tableOrNote: string;
    paymentMethod: PaymentMethod;
    promoCode?: string;
    items: OrderItemSummary[];
  },
  token: string | null,
): Promise<{
  order: OrderRecord;
  transaction: TransactionRecord;
  checkoutMode: 'stripe_live' | 'stripe_sandbox' | 'instant';
  checkoutUrl?: string;
  sessionId?: string;
}> {
  return apiFetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export function createSubscriptionCheckout(
  planId: string,
  token: string,
): Promise<{
  checkoutMode: 'stripe_live' | 'stripe_sandbox';
  checkoutUrl?: string;
  sessionId: string;
  plan?: SubscriptionPlan;
}> {
  return apiFetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ planId }),
    token,
  });
}

export function confirmSandboxStripeSession(
  sessionId: string,
  token: string | null,
): Promise<{
  ok: boolean;
  transaction: TransactionRecord | null;
  subscription?: SubscriptionRecord;
  order?: OrderRecord;
}> {
  return apiFetch('/api/stripe/confirm-sandbox-session', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
    token,
  });
}

export function cancelSubscription(
  subscriptionId: string,
  token: string,
): Promise<{ subscription: SubscriptionRecord }> {
  return apiFetch(`/api/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: 'POST',
    token,
  });
}

export function fetchAdminOverview(token: string): Promise<{
  overview: AdminOverview;
  transactions: TransactionRecord[];
  activities: ActivityLog[];
  subscriptions: SubscriptionRecord[];
  orders: OrderRecord[];
  reservations: ReservationRecord[];
  products: Product[];
  users: UserProfile[];
}> {
  return apiFetch('/api/admin/overview', { token });
}

export function updateAdminOrderStatus(
  orderId: string,
  status: OrderStatus,
  token: string,
): Promise<{ order: OrderRecord; transaction: TransactionRecord | null }> {
  return apiFetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    token,
  });
}

export function updateAdminReservationStatus(
  reservationId: string,
  status: ReservationRecord['status'],
  token: string,
): Promise<{ reservation: ReservationRecord }> {
  return apiFetch(`/api/admin/reservations/${encodeURIComponent(reservationId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    token,
  });
}

export function updateAdminProduct(
  productId: string,
  patch: { inStock?: boolean; priceIdr?: number },
  token: string,
): Promise<{ product: Product }> {
  return apiFetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    token,
  });
}

export function requestAdminStreamTicket(token: string): Promise<{ ticket: string }> {
  return apiFetch('/api/admin/stream-ticket', {
    method: 'POST',
    token,
  });
}

export async function downloadTransactionsCsv(token: string): Promise<string> {
  const res = await fetch('/api/admin/export.csv', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Gagal mengunduh laporan CSV.');
  }
  return res.text();
}
