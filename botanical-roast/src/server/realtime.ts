import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import type {
  ActivityLog,
  OrderRecord,
  Product,
  ReservationRecord,
  SubscriptionRecord,
  TransactionRecord,
} from '../shared/types';

export type RealtimeEvent =
  | { event: 'transaction:created'; data: TransactionRecord }
  | { event: 'transaction:updated'; data: TransactionRecord }
  | { event: 'activity:created'; data: ActivityLog }
  | { event: 'subscription:updated'; data: SubscriptionRecord }
  | { event: 'order:created'; data: OrderRecord }
  | { event: 'order:updated'; data: OrderRecord }
  | { event: 'reservation:created'; data: ReservationRecord }
  | { event: 'reservation:updated'; data: ReservationRecord }
  | { event: 'product:updated'; data: Product };

class RealtimeBroker extends EventEmitter {
  private tickets = new Map<string, { userId: string; expiresAt: number }>();

  createTicket(userId: string): string {
    const ticket = crypto.randomBytes(24).toString('hex');
    this.tickets.set(ticket, {
      userId,
      expiresAt: Date.now() + 60_000,
    });
    return ticket;
  }

  consumeTicket(ticket: string): string | null {
    const entry = this.tickets.get(ticket);
    this.tickets.delete(ticket);
    if (!entry || entry.expiresAt < Date.now()) {
      return null;
    }
    return entry.userId;
  }

  publish(payload: RealtimeEvent): void {
    this.emit('message', payload);
  }
}

export const realtimeBroker = new RealtimeBroker();
