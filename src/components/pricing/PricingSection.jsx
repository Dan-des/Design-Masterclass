import React from 'react';
import StarterTierCard from './StarterTierCard';
import ProTierCard from './ProTierCard';

export default function PricingSection() {
  return (
    <section id="pricing-section" className="py-24 md:py-32 bg-[#0d0d0d] border-t border-neutral-900 relative">
      {/* Background glowing ambient light under Pro tier */}
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-yellow-400 text-xs font-mono font-semibold uppercase mb-4">
            Transparent Investment
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-5">
            Choose Your Creative Tier
          </h2>
          <p className="text-base sm:text-lg text-neutral-400 leading-relaxed">
            Gain immediate lifetime access to the exact workflows, project files, and mentorship designed to elevate your design career into international standards.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-8 items-stretch max-w-5xl mx-auto">
          <StarterTierCard />
          <ProTierCard />
        </div>
      </div>
    </section>
  );
}
