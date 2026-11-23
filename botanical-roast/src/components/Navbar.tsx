import { Menu, ShoppingBag, Sparkles, User, X } from 'lucide-react';
import { useState } from 'react';
import type { FulfillmentMode, UserProfile } from '../shared/types';

export type AppView =
  | 'welcome'
  | 'menu'
  | 'checkout'
  | 'tracking'
  | 'subscriptions'
  | 'admin';

interface NavbarProps {
  activeView: AppView;
  fulfillmentMode: FulfillmentMode;
  cartCount: number;
  user: UserProfile | null;
  onNavigate: (view: AppView) => void;
  onOpenReservation: () => void;
  onOpenAuth: () => void;
  onOpenAccount: () => void;
}

export function Navbar({
  activeView,
  fulfillmentMode,
  cartCount,
  user,
  onNavigate,
  onOpenReservation,
  onOpenAuth,
  onOpenAccount,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (activeView === 'admin') {
    return null;
  }

  const navItemClass = (isActive: boolean) =>
    `px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
      isActive
        ? 'bg-[#2d3b2d] text-white shadow-sm'
        : 'text-[#444842] hover:text-[#182519] hover:bg-[#ebe8e1]/70'
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#e5e2db]/80 bg-[#fcf9f2]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        {/* Brand + Mode Pill */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('welcome');
            }}
            className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d3b2d]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#182519] text-[#fcf9f2] shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight text-[#182519] sm:text-2xl whitespace-nowrap">
              Green Cafe
            </span>
          </button>

          <span className="hidden sm:inline-flex items-center rounded-full bg-[#ebe8e1] px-3 py-1 text-xs font-medium tracking-wide text-[#444842] whitespace-nowrap">
            {fulfillmentMode}
          </span>
        </div>

        {/* Desktop Pill Nav */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden lg:flex items-center gap-1 rounded-full bg-[#f6f3ec] p-1 border border-[#e5e2db]"
        >
          <button
            type="button"
            onClick={() => onNavigate('menu')}
            className={navItemClass(activeView === 'menu')}
          >
            Daftar Menu
          </button>
          <button
            type="button"
            onClick={onOpenReservation}
            className={navItemClass(false)}
          >
            Reservasi
          </button>
          <button
            type="button"
            onClick={() => onNavigate('tracking')}
            className={navItemClass(activeView === 'tracking')}
          >
            Pesanan Saya
          </button>
          <button
            type="button"
            onClick={() => onNavigate('subscriptions')}
            className={navItemClass(activeView === 'subscriptions')}
          >
            Langganan
          </button>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={navItemClass(false)}
          >
            Dasbor Admin
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('checkout');
            }}
            aria-label={`Keranjang (${cartCount} item)`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#f1eee7] px-3.5 py-2 text-xs font-semibold text-[#182519] transition-colors hover:bg-[#ebe8e1] sm:px-4 sm:text-sm whitespace-nowrap tabular-nums"
          >
            <ShoppingBag className="h-4 w-4 text-[#2d3b2d]" aria-hidden="true" />
            <span className="hidden xs:inline sm:inline">Keranjang</span>
            <span>({cartCount})</span>
          </button>

          {user ? (
            <button
              type="button"
              onClick={onOpenAccount}
              aria-label="Profil Pengguna"
              className="inline-flex items-center gap-2 rounded-full border border-[#c4c8c0] bg-[#ebe8e1] px-3 py-1.5 text-xs font-semibold text-[#182519] transition-colors hover:bg-[#e5e2db]"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2d3b2d] text-[11px] font-bold text-white">
                {user.fullName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[96px] truncate sm:inline">{user.fullName}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              aria-label="Masuk atau Daftar Akun"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#c4c8c0] bg-[#ebe8e1] px-3 text-xs font-semibold text-[#182519] transition-colors hover:bg-[#e5e2db]"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Masuk</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Menu Navigasi"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c4c8c0] bg-[#f6f3ec] text-[#182519] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Nav */}
      {mobileMenuOpen && (
        <div className="border-t border-[#e5e2db] bg-[#fcf9f2] px-4 py-4 shadow-lg lg:hidden">
          <div className="flex flex-col gap-2">
            <div className="mb-1 flex items-center justify-between px-2 text-xs text-[#444842]">
              <span>Mode Layanan Aktif</span>
              <span className="rounded-full bg-[#ebe8e1] px-2.5 py-0.5 font-semibold text-[#182519]">
                {fulfillmentMode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('welcome');
              }}
              className="rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#182519] hover:bg-[#f1eee7]"
            >
              Beranda Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('menu');
              }}
              className="rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#182519] hover:bg-[#f1eee7]"
            >
              Daftar Menu
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenReservation();
              }}
              className="rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#182519] hover:bg-[#f1eee7]"
            >
              Reservasi Dine-In
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('tracking');
              }}
              className="rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#182519] hover:bg-[#f1eee7]"
            >
              Pesanan Saya (Pelacakan)
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('subscriptions');
              }}
              className="rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#182519] hover:bg-[#f1eee7]"
            >
              Langganan Kopi Stripe
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('admin');
              }}
              className="rounded-xl bg-[#2d3b2d] px-3 py-2.5 text-left text-sm font-semibold text-white"
            >
              Dasbor Barista &amp; Admin
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
