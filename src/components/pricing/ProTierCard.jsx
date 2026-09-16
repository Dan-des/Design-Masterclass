import React from 'react';
import { useApp } from '../../context/AppContext';
import { TIERS } from '../../utils/security';

export default function ProTierCard() {
  const { openCheckout } = useApp();
  const tier = TIERS.pro;

  return (
    <div
      onClick={() => openCheckout('pro')}
      className="relative rounded-2xl bg-neutral-900/90 border-2 border-yellow-400/80 shadow-[0_0_28px_rgba(250,204,21,0.18)] hover:shadow-[0_0_40px_rgba(250,204,21,0.28)] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 transform lg:scale-[1.03] z-10 cursor-pointer group"
    >
      {/* Top Floating Pill Badge */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <span className="px-4 py-1.5 rounded-full bg-yellow-400 text-black text-xs font-extrabold tracking-wider font-mono uppercase shadow-md flex items-center gap-1.5 whitespace-nowrap">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          MOST POPULAR - ₦150 OFF
        </span>
      </div>

      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4 pt-1">
          <span className="text-xs font-mono uppercase tracking-widest text-yellow-400 font-bold">
            Full Commercial License
          </span>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded font-semibold">
            Complete Curriculum
          </span>
        </div>

        <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 group-hover:text-yellow-400 transition-colors">
          {tier.name}
        </h3>
        <p className="text-sm text-neutral-300 mb-6 leading-relaxed">
          {tier.description}
        </p>

        {/* Strikethrough Pricing Display */}
        <div className="flex items-baseline gap-3 mb-6 pb-6 border-b border-neutral-800">
          <span className="text-5xl sm:text-6xl font-extrabold font-mono text-white tracking-tight">
            ₦350
          </span>
          <div className="flex flex-col">
            <span className="text-lg font-mono text-neutral-500 line-through">
              ₦500
            </span>
            <span className="text-xs font-mono text-yellow-400 font-bold">
              Save ₦150 Today
            </span>
          </div>
        </div>

        {/* Software Scope Callout */}
        <div className="mb-6 p-4 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-xs">
          <span className="text-yellow-400 font-mono uppercase font-bold block mb-1">
            Software Scope
          </span>
          <span className="text-neutral-100 font-semibold leading-relaxed block">
            Full Adobe Creative Cloud (Photoshop, Illustrator, InDesign, After Effects) &amp; Figma
          </span>
        </div>

        {/* Curriculum Perks */}
        <div className="space-y-3.5 mb-8">
          <span className="text-xs font-mono uppercase text-neutral-300 tracking-wider font-semibold block mb-2">
            Included Perks &amp; Assets
          </span>
          {tier.perks.map((perk, index) => (
            <div key={index} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-200">
              <svg
                className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className={index < 4 ? 'font-medium text-white' : ''}>{perk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Button: High-visibility, solid vibrant yellow primary CTA */}
      <div>
        <button
          type="button"
          onClick={() => openCheckout('pro')}
          className="w-full py-4 px-6 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold text-base transition-all transform hover:-translate-y-0.5 shadow-[0_0_24px_rgba(250,204,21,0.35)] active:translate-y-0 text-center focus:outline-none focus:ring-2 focus:ring-yellow-300 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Claim Best Value Access - ₦350</span>
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
        <span className="block text-[11px] text-center text-neutral-400 mt-2.5 font-mono">
          Instant WhatsApp invite &amp; source files dispatch upon confirmation
        </span>
      </div>
    </div>
  );
}
