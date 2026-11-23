import { LogOut, ShieldCheck, X } from 'lucide-react';
import { formatRupiah } from '../shared/pricing';
import type { SubscriptionRecord, UserProfile } from '../shared/types';

interface AccountDrawerProps {
  open: boolean;
  user: UserProfile | null;
  subscriptions: SubscriptionRecord[];
  cancelingId: string | null;
  onClose: () => void;
  onCancelSubscription: (subscriptionId: string) => Promise<void>;
  onOpenAdmin: () => void;
  onLogout: () => Promise<void>;
}

export function AccountDrawer({
  open,
  user,
  subscriptions,
  cancelingId,
  onClose,
  onCancelSubscription,
  onOpenAdmin,
  onLogout,
}: AccountDrawerProps) {
  if (!open || !user) return null;

  const activeSub = subscriptions.find((s) => s.status === 'active') ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-[#1c1c18]/40 backdrop-blur-[2px]"
    >
      <div className="flex h-full w-full max-w-md flex-col justify-between overflow-y-auto border-l border-[#e2ddd2] bg-[#fcf9f2] p-6 shadow-ambient">
        <div>
          <div className="flex items-start justify-between border-b border-[#e2ddd2] pb-4">
            <div>
              <p className="text-xs font-semibold text-[#7a582f]">
                {user.role === 'admin' ? 'Akun Administrator Green Cafe' : 'Anggota Green Club'}
              </p>
              <h2
                id="account-drawer-title"
                className="mt-1 font-serif text-2xl font-semibold text-[#1c1c18]"
              >
                {user.fullName}
              </h2>
              <p className="text-sm text-[#5c6659]">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup panel akun"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2ddd2] bg-white text-[#1c1c18] hover:bg-[#ece7dd]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {user.role === 'admin' && (
            <div className="mt-5 rounded-xl border border-[#2d3b2d]/20 bg-[#f1eee7] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-[#2d3b2d]" aria-hidden="true" />
                  <span className="text-sm font-semibold text-[#1c1c18]">Akses Dasbor Admin</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdmin();
                  }}
                  className="rounded-full bg-[#2d3b2d] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#182519]"
                >
                  Buka Dasbor
                </button>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-serif text-lg font-semibold text-[#1c1c18]">
              Langganan Kopi Stripe
            </h3>

            {activeSub ? (
              <div className="mt-3 rounded-[1.25rem] border border-[#e2ddd2] bg-[#faf8f5] p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[#2d3b2d]">Status: Aktif</p>
                    <p className="mt-1 font-serif text-xl font-semibold text-[#1c1c18]">
                      {activeSub.planName}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#1c1c18] tabular-nums">
                    {formatRupiah(activeSub.amountIdr)}/bln
                  </span>
                </div>

                <p className="mt-3 text-xs text-[#5c6659]">
                  Perpanjangan otomatis berikutnya:{' '}
                  {new Date(activeSub.currentPeriodEnd).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>

                <p className="mt-1 font-mono text-[11px] text-[#5c6659]">
                  ID: {activeSub.stripeSubscriptionId}
                </p>

                <button
                  type="button"
                  disabled={cancelingId === activeSub.id}
                  onClick={() => void onCancelSubscription(activeSub.id)}
                  className="mt-4 w-full rounded-full border border-[#ba1a1a]/40 py-2 text-xs font-semibold text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]/40 disabled:opacity-60"
                >
                  {cancelingId === activeSub.id ? 'Membatalkan...' : 'Batalkan Langganan'}
                </button>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-[#e2ddd2] bg-[#faf8f5] p-5 text-sm text-[#5c6659]">
                Belum ada langganan bulanan aktif. Pilih paket langganan di beranda untuk mendapat
                diskon menu dan kiriman biji kopi segar.
              </div>
            )}

            {subscriptions.filter((s) => s.status !== 'active').length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-[#5c6659]">Riwayat Langganan</p>
                <ul className="mt-2 divide-y divide-[#e2ddd2] rounded-xl border border-[#e2ddd2] bg-[#faf8f5] px-4">
                  {subscriptions
                    .filter((s) => s.status !== 'active')
                    .map((sub) => (
                      <li key={sub.id} className="flex items-center justify-between py-3 text-xs">
                        <span className="font-medium text-[#1c1c18]">{sub.planName}</span>
                        <span className="text-[#5c6659]">Dibatalkan</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-[#e2ddd2] pt-4">
          <button
            type="button"
            onClick={() => void onLogout()}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[#d7d1c4] bg-white py-2.5 text-sm font-semibold text-[#1c1c18] hover:bg-[#f1eee7]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </div>
    </div>
  );
}
