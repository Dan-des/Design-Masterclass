import React from 'react';
import { useApp } from '../../context/AppContext';
import { TIERS } from '../../utils/security';

export default function StarterTierCard() {
  const { openCheckout } = useApp();
  const tier = TIERS.starter;

  return (
    <div
      onClick={() => openCheckout('starter')}
      className="relative rounded-2xl bg-neutral-900/60 border border-neutral-800 p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 hover:border-neutral-700 cursor-pointer group z-10"
    >
      <div>
        {/* Tier Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-semibold">
            {tier.badge}
          </span>
          <span className="text-xs font-mono text-neutral-500 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700">
            Limited Scope
          </span>
        </div>

        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">
          {tier.name}
        </h3>
        <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
          {tier.description}
        </p>

        {/* Pricing Display */}
        <div className="flex items-baseline gap-2 mb-6 pb-6 border-b border-neutral-800">
          <span className="text-4xl sm:text-5xl font-extrabold font-mono text-white tracking-tight">
            ₦200
          </span>
          <span className="text-xs text-neutral-400 font-mono">One-time enrollment</span>
        </div>

        {/* Software Scope Callout */}
        <div className="mb-6 p-3.5 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs">
          <span className="text-neutral-500 font-mono uppercase block mb-1">Software Scope</span>
          <span className="text-neutral-300 font-medium">
            Photoshop and Camera Raw only
          </span>
        </div>

        {/* Curriculum Perks */}
        <div className="space-y-3 mb-8">
          <span className="text-xs font-mono uppercase text-neutral-400 tracking-wider block mb-2">
            Included Curriculum
          </span>
          {tier.perks.map((perk, index) => (
            <div key={index} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-300">
              <svg
                className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{perk}</span>
            </div>
          ))}

          {/* Excluded Perks */}
          <div className="pt-4 mt-4 border-t border-neutral-800/60 space-y-2.5">
            <span className="text-xs font-mono uppercase text-neutral-500 tracking-wider block mb-2">
              Not Included In Starter
            </span>
            {tier.excludedPerks.map((perk, index) => (
              <div key={index} className="flex items-start gap-2.5 text-xs text-neutral-500">
                <svg
                  className="w-3.5 h-3.5 text-neutral-600 mt-0.5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>{perk}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Button: Understated outline button style */}
      <div>
        <button
          type="button"
          onClick={() => openCheckout('starter')}
          className="w-full py-3.5 px-6 rounded-lg border border-neutral-600 hover:border-neutral-400 text-neutral-300 hover:text-white font-semibold text-sm transition-all text-center focus:outline-none focus:ring-1 focus:ring-neutral-400 active:scale-[0.99] cursor-pointer"
        >
          Enroll in Starter Tier - ₦200
        </button>
        <span className="block text-[11px] text-center text-neutral-500 mt-2.5 font-mono">
          Includes standard email support
        </span>
      </div>
    </div>
  );
}
