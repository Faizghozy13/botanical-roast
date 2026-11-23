export type UserRole = 'member' | 'admin';

export type ProductCategory = 'Kopi' | 'Non-Kopi' | 'Makanan';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  subcategory: string;
  description: string;
  priceIdr: number;
  imageUrl?: string;
  badge?: string;
  isAddon?: boolean;
  inStock: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  audience: string;
  description: string;
  intervalLabel: string;
  priceIdr: number;
  bagsPerMonth: number;
  cafeDiscountPct: number;
  features: string[];
  isPopular: boolean;
  stripePriceId?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  stripeCustomerId?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface SubscriptionRecord {
  id: string;
  userId: string | null;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  status: 'active' | 'pending' | 'past_due' | 'canceled';
  stripeSubscriptionId: string;
  stripeCheckoutSessionId: string;
  amountIdr: number;
  currentPeriodEnd: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customization?: string;
  note?: string;
}

export interface OrderItemSummary {
  productId: string;
  name: string;
  quantity: number;
  unitPriceIdr: number;
  customization?: string;
  note?: string;
}

export type FulfillmentMode = 'Dine-In' | 'Take Away';
export type PaymentMethod = 'qris' | 'stripe_card' | 'cash';
export type OrderStatus = 'pending_payment' | 'preparing' | 'ready' | 'completed' | 'canceled';

export interface OrderRecord {
  id: string;
  orderCode: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  fulfillmentMode: FulfillmentMode;
  tableOrNote: string;
  items: OrderItemSummary[];
  promoCode?: string;
  subtotalIdr: number;
  discountIdr: number;
  taxIdr: number;
  totalIdr: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
}

export interface ReservationRecord {
  id: string;
  reservationCode: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  phone: string;
  guests: number;
  tableNumber: string;
  reservationDate: string;
  reservationTime: string;
  notes?: string;
  status: 'confirmed' | 'seated' | 'completed' | 'canceled';
  createdAt: string;
}

export type TransactionStatus = 'succeeded' | 'pending' | 'failed' | 'refunded';
export type TransactionType = 'order' | 'subscription';
export type PaymentProvider = 'QRIS' | 'Stripe' | 'Cash';

export interface TransactionRecord {
  id: string;
  referenceCode: string;
  orderCode?: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  type: TransactionType;
  paymentProvider: PaymentProvider;
  amountIdr: number;
  status: TransactionStatus;
  stripeSessionId?: string;
  description: string;
  createdAt: string;
}

export type ActivityCategory = 'auth' | 'order' | 'reservation' | 'subscription' | 'payment' | 'admin';

export interface ActivityLog {
  id: string;
  userId: string | null;
  actorEmail: string;
  actorName: string;
  action: string;
  category: ActivityCategory;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface AdminOverview {
  totalRevenueIdr: number;
  todayRevenueIdr: number;
  activeOrdersCount: number;
  pendingCashierCount: number;
  readyOrdersCount: number;
  todayReservationsCount: number;
  activeSubscriptionsCount: number;
  mrrIdr: number;
  totalOrdersCount: number;
  registeredUsersCount: number;
  succeededRatePct: number;
}

export interface PublicConfig {
  supabaseConfigured: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  stripeConfigured: boolean;
  hasAdminClaimed: boolean;
}
