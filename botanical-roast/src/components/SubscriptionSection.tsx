import { Check, Coffee } from 'lucide-react';
import { useState } from 'react';
import { formatRupiah } from '../shared/pricing';
import type { SubscriptionPlan, SubscriptionRecord } from '../shared/types';

interface SubscriptionSectionProps {
  plans: SubscriptionPlan[];
  activeSubscription: SubscriptionRecord | null;
  subscribingPlanId: string | null;
  onSelectPlan: (plan: SubscriptionPlan) => void;
}

export function SubscriptionSection({
  plans,
  activeSubscription,
  subscribingPlanId,
  onSelectPlan,
}: SubscriptionSectionProps) {
  const [bagImgFailed, setBagImgFailed] = useState(false);

  return (
    <section
      id="subscriptions"
      className="min-h-[calc(100vh-80px)] bg-[#fcf9f2] pt-24 pb-20"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10">
        {/* Editorial Intro Banner */}
        <div className="grid grid-cols-1 items-center gap-8 rounded-3xl bg-[#f6f3ec] p-6 sm:p-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold tracking-[0.04em] uppercase text-[#7a582f]">
              Green Club Roastery • Pembayaran Otomatis Stripe
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-[#182519] sm:text-4xl">
              Ritual Kopi Pagi, Dikirim Segar Setiap Bulan
            </h1>
            <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-[#444842] sm:text-base">
              Pilih paket langganan biji kopi sangrai mingguan dengan penagihan aman melalui
              Stripe Subscriptions. Nikmati diskon otomatis di seluruh menu Green Cafe selama
              langganan Anda aktif.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#e5e2db] bg-[#ebe8e1]">
              {!bagImgFailed ? (
                <img
                  src="/src/assets/images/subscription_roast_bag_1795446998777.jpg"
                  alt="Kemasan biji kopi spesialti Green Cafe dengan sendok kuningan di atas meja linen"
                  onError={() => setBagImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                  <Coffee className="h-9 w-9 text-[#2d3b2d]" aria-hidden="true" />
                  <p className="mt-2 font-serif text-base font-semibold text-[#182519]">
                    Green Cafe Reserve Beans
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3 Subscription Plan Tiers */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan =
              activeSubscription?.status === 'active' && activeSubscription.planId === plan.id;
            const isBusy = subscribingPlanId === plan.id;

            return (
              <article
                key={plan.id}
                className={`flex flex-col justify-between rounded-3xl border p-6 transition-all sm:p-7 ${
                  plan.isPopular
                    ? 'border-[#182519] bg-white shadow-ambient'
                    : 'border-[#e5e2db] bg-white'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold text-[#7a582f]">
                    {plan.isPopular ? 'Paling Diminati • ' : ''}
                    {plan.audience}
                  </p>
                  <h2 className="mt-1.5 font-serif text-2xl font-semibold text-[#182519] whitespace-nowrap">
                    {plan.name}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-[#444842]">{plan.description}</p>

                  <div className="mt-5 flex items-baseline gap-1.5 border-y border-[#e5e2db] py-4">
                    <span className="text-2xl font-bold text-[#182519] tabular-nums">
                      {formatRupiah(plan.priceIdr)}
                    </span>
                    <span className="text-xs text-[#444842]">/ {plan.intervalLabel}</span>
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm text-[#1c1c18]">
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#2d3b2d]"
                          aria-hidden="true"
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-7">
                  <button
                    type="button"
                    disabled={isCurrentPlan || isBusy}
                    onClick={() => onSelectPlan(plan)}
                    className={`w-full rounded-full py-3.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                      isCurrentPlan
                        ? 'cursor-default border border-[#2d3b2d] bg-[#d7e7d3]/50 text-[#182519]'
                        : plan.isPopular
                          ? 'bg-[#182519] text-white hover:bg-[#2d3b2d]'
                          : 'border-[1.5px] border-[#182519] text-[#182519] hover:bg-[#182519]/5'
                    } disabled:opacity-70`}
                  >
                    {isCurrentPlan
                      ? 'Langganan Aktif'
                      : isBusy
                        ? 'Menyiapkan Stripe...'
                        : 'Berlangganan via Stripe'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
