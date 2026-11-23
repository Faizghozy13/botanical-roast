import { CreditCard, Lock, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { formatRupiah } from '../shared/pricing';

interface StripeCheckoutModalProps {
  session: {
    sessionId: string;
    title: string;
    description: string;
    amountIdr: number;
    customerEmail: string;
    isSubscription: boolean;
  } | null;
  processing: boolean;
  onClose: () => void;
  onConfirmPayment: (sessionId: string) => Promise<void>;
}

export function StripeCheckoutModal({
  session,
  processing,
  onClose,
  onConfirmPayment,
}: StripeCheckoutModalProps) {
  const [cardholderName, setCardholderName] = useState('Pelanggan Green Cafe');
  const [cardLast4, setCardLast4] = useState('4242 •••• •••• 4242');
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (cardholderName.trim().length < 2) {
      setError('Nama pemegang kartu wajib diisi.');
      return;
    }
    try {
      await onConfirmPayment(session.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyelesaikan pembayaran Stripe.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stripe-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1c18]/50 p-4 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-md rounded-[1.5rem] border border-[#e2ddd2] bg-[#fcf9f2] p-6 shadow-ambient sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#e2ddd2] pb-4">
          <div>
            <p className="text-xs font-semibold text-[#7a582f]">
              Stripe Checkout · Mode Uji Sandbox
            </p>
            <h2
              id="stripe-modal-title"
              className="mt-1 font-serif text-2xl font-semibold text-[#1c1c18]"
            >
              {session.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Batalkan sesi pembayaran Stripe"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2ddd2] bg-white text-[#1c1c18] hover:bg-[#ece7dd]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-[#e2ddd2] bg-[#faf8f5] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1c1c18]">{session.description}</p>
              <p className="mt-0.5 text-xs text-[#5c6659]">{session.customerEmail}</p>
            </div>
            <p className="text-lg font-bold text-[#1c1c18] tabular-nums">
              {formatRupiah(session.amountIdr)}
              {session.isSubscription ? <span className="text-xs font-normal">/bln</span> : null}
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          <div>
            <label htmlFor="stripe-card-number" className="block text-xs font-semibold text-[#1c1c18]">
              Kartu Pembayaran (Stripe Test Card)
            </label>
            <div className="relative mt-1">
              <CreditCard
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#5c6659]"
                aria-hidden="true"
              />
              <input
                id="stripe-card-number"
                type="text"
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value)}
                className="w-full rounded-lg border border-[#d7d1c4] bg-white py-2.5 pr-3.5 pl-10 font-mono text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="stripe-cardholder" className="block text-xs font-semibold text-[#1c1c18]">
              Nama pada Kartu
            </label>
            <input
              id="stripe-cardholder"
              type="text"
              required
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#d7d1c4] bg-white px-3.5 py-2.5 text-sm text-[#1c1c18] focus:border-[#2d3b2d] focus:outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-[#ffdad6] px-3 py-2 text-xs font-medium text-[#93000a]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={processing}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2d3b2d] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#182519] disabled:opacity-60"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span>
              {processing
                ? 'Mengonfirmasi dengan Stripe...'
                : `Bayar ${formatRupiah(session.amountIdr)}`}
            </span>
          </button>

          <p className="text-center text-[11px] text-[#5c6659]">
            Tambahkan STRIPE_SECRET_KEY pada environment untuk mengalihkan langsung ke Stripe
            Hosted Checkout.
          </p>
        </form>
      </div>
    </div>
  );
}
