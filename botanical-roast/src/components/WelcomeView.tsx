import { ArrowRight, Coffee, Sparkles, UtensilsCrossed } from 'lucide-react';

interface WelcomeViewProps {
  onSelectDineIn: () => void;
  onSelectTakeAway: () => void;
  onOpenSubscriptions: () => void;
}

export function WelcomeView({
  onSelectDineIn,
  onSelectTakeAway,
  onOpenSubscriptions,
}: WelcomeViewProps) {
  return (
    <div className="relative flex min-h-[calc(100vh-80px)] flex-col justify-between overflow-hidden pt-20">
      {/* Ambient Subtle Botanical SVG Accents */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <svg
          className="absolute -top-10 -left-10 h-64 w-64 -rotate-12 text-[#182519] opacity-[0.12] md:h-96 md:w-96"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <path d="M10,190 C30,140 60,110 110,90 C80,95 50,110 30,135 C15,155 10,190 10,190 Z" />
          <path d="M30,135 C50,90 90,60 150,40 C110,55 80,80 60,115 C45,140 30,135 30,135 Z" />
          <path d="M70,85 C110,45 160,25 190,10 C165,35 130,65 100,95 C85,110 70,85 70,85 Z" />
          <path d="M20,180 C60,130 110,80 185,20 C140,65 95,120 50,175 C35,190 20,180 20,180 Z" />
          <path d="M80,140 C110,115 145,95 175,85 C145,105 120,130 100,160 C90,175 80,140 80,140 Z" />
          <circle cx="145" cy="55" r="4" opacity="0.6" />
          <circle cx="170" cy="35" r="3" opacity="0.5" />
        </svg>
        <svg
          className="absolute -right-12 -bottom-14 h-72 w-72 rotate-180 text-[#182519] opacity-[0.11] md:h-96 md:w-96"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <path d="M10,190 C35,135 70,105 120,85 C85,95 55,115 35,140 C18,160 10,190 10,190 Z" />
          <path d="M35,135 C60,85 105,50 165,30 C120,50 85,80 65,120 C50,145 35,135 35,135 Z" />
          <path d="M75,80 C115,40 165,20 195,5 C170,30 135,60 105,90 C90,105 75,80 75,80 Z" />
          <path d="M20,180 C65,125 115,75 190,15 C145,60 100,115 55,170 C40,185 20,180 20,180 Z" />
          <circle cx="150" cy="45" r="4" opacity="0.6" />
          <circle cx="175" cy="25" r="3.5" opacity="0.5" />
        </svg>
        <svg
          className="absolute top-24 -right-8 h-44 w-44 rotate-45 text-[#7a582f] opacity-[0.10] md:h-60 md:w-60"
          viewBox="0 0 160 160"
          fill="currentColor"
        >
          <path d="M15,145 C35,100 70,70 130,40 C95,55 65,80 45,110 C30,130 15,145 15,145 Z" />
          <path d="M20,140 C55,95 95,55 145,25 C110,55 75,100 40,135 Z" />
          <path d="M60,65 C95,30 130,15 155,5 C135,25 105,50 80,75 Z" />
        </svg>
      </div>

      {/* Hero & Dual Service Selection */}
      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-5 py-12 md:py-20 lg:px-12">
        <div className="mx-auto mb-12 flex max-w-2xl flex-col items-center px-2 text-center md:mb-14">
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-[#182519] md:text-5xl">
            Selamat Datang di Green Cafe
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base font-normal leading-relaxed text-[#444842] md:text-lg">
            Pilih metode layanan untuk memulai pengalaman kopi Anda.
          </p>
        </div>

        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-7 md:grid-cols-2 md:gap-8">
          {/* Card 1: Reservasi Dine-In */}
          <article className="flex flex-col justify-between rounded-3xl border border-[#c4c8c0]/40 bg-white p-8 transition-all duration-300 hover:shadow-lg md:p-10 lg:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6f3ec] text-[#182519]">
                <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="mb-2 text-xs font-semibold tracking-widest uppercase text-[#7a582f]">
                Pengalaman Santai
              </span>
              <h2 className="mb-3 font-serif text-2xl font-semibold text-[#182519]">
                Reservasi Dine-In
              </h2>
              <p className="mb-9 text-sm leading-relaxed text-[#444842]">
                Pesan meja lebih dulu untuk menikmati seduhan kopi segar, hidangan khas, dan
                suasana teduh alami langsung di tempat.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onSelectDineIn}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#182519] px-7 py-3.5 text-sm font-medium tracking-wide text-white shadow-sm transition-all duration-200 hover:bg-[#2d3b2d]"
              >
                <span>Reservasi Meja</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </article>

          {/* Card 2: Pesan Take Away */}
          <article className="flex flex-col justify-between rounded-3xl border border-[#c4c8c0]/40 bg-white p-8 transition-all duration-300 hover:shadow-lg md:p-10 lg:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6f3ec] text-[#182519]">
                <Coffee className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="mb-2 text-xs font-semibold tracking-widest uppercase text-[#7a582f]">
                Cepat &amp; Praktis
              </span>
              <h2 className="mb-3 font-serif text-2xl font-semibold text-[#182519]">
                Pesan Take Away
              </h2>
              <p className="mb-9 text-sm leading-relaxed text-[#444842]">
                Pesan lebih awal dari mana saja dan ambil langsung pesanan Anda di konter barista
                tanpa perlu mengantre.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onSelectTakeAway}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#182519] px-7 py-3.5 text-sm font-medium tracking-wide text-[#182519] transition-all duration-200 hover:bg-[#182519] hover:text-white"
              >
                <span>Pesan Sekarang</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </article>
        </div>

        {/* Subtle Stripe Roastery Club Strip */}
        <div className="mx-auto mt-10 flex w-full max-w-4xl flex-col items-center justify-between gap-4 rounded-2xl border border-[#e5e2db] bg-[#f6f3ec]/90 px-6 py-4 sm:flex-row">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d7e7d3] text-[#182519] sm:flex">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#182519]">
                Green Club · Langganan Biji Kopi Bulanan via Stripe
              </p>
              <p className="text-xs text-[#444842]">
                Nikmati kiriman biji kopi segar &amp; diskon anggota otomatis hingga 20% di kafe.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSubscriptions}
            className="shrink-0 rounded-full bg-[#ebe8e1] px-5 py-2 text-xs font-semibold text-[#182519] transition-colors hover:bg-[#d7e7d3]"
          >
            Lihat Paket Langganan
          </button>
        </div>
      </section>

      {/* Footer matching HTML */}
      <footer className="relative z-10 w-full py-10 text-center text-[13px] font-normal tracking-wide text-[#444842]">
        <p>Buka Setiap Hari 08.00 – 22.00 WIB • Jl. Kopi Alami No. 12</p>
      </footer>
    </div>
  );
}
