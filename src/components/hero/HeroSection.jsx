import React from 'react';

export default function HeroSection() {
  const handleHeroClick = (e) => {
    // If the click is on an interactive child (e.g. CTA link or button), let it handle its own navigation
    if (e.target.closest('a') || e.target.closest('button') || e.target.closest('input')) {
      return;
    }
    window.location.reload();
  };

  return (
    <section
      id="hero-section"
      onClick={handleHeroClick}
      title="Click to refresh page"
      className="relative pt-12 pb-16 md:pt-16 md:pb-24 overflow-hidden cursor-pointer"
    >
      {/* Subtle background ambient gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-yellow-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-6">
            Transform From A Tool User Into A{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 underline decoration-yellow-400/30 decoration-wavy decoration-2">
              High-Value Visual Director
            </span>
          </h1>

          {/* Subtitle / Value Proposition */}
          <p className="text-lg sm:text-xl md:text-2xl text-neutral-300 max-w-3xl mx-auto leading-relaxed font-normal mb-10">
            A comprehensive, rigorous design masterclass built for designers who want to dominate commercial brand systems, editorial typography, spatial layout, and lucrative client contracts.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <a
              href="#pricing-section"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const el = document.getElementById('pricing-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-base sm:text-lg transition-all transform hover:-translate-y-0.5 shadow-[0_0_28px_rgba(250,204,21,0.3)] active:translate-y-0 flex items-center justify-center gap-3 focus:outline-none cursor-pointer"
            >
              <span>Enroll Now - Choose Tier</span>
              <svg
                className="w-5 h-5 flex-shrink-0"
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
            </a>

            <a
              href="#curriculum-section"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const el = document.getElementById('curriculum-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="w-full sm:w-auto px-7 py-4 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white font-semibold text-base border border-neutral-800 hover:border-neutral-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Explore Curriculum</span>
              <svg
                className="w-4 h-4 text-neutral-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </a>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-10 border-t border-neutral-800/80 text-left">
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/60">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white mb-1">10+ Years</div>
              <div className="text-xs sm:text-sm text-neutral-400 font-medium">Commercial Studio Experience</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/60">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-yellow-400 mb-1">Full Suite</div>
              <div className="text-xs sm:text-sm text-neutral-400 font-medium">Photoshop, Illustrator, InDesign, Figma</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/60">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white mb-1">100% Practical</div>
              <div className="text-xs sm:text-sm text-neutral-400 font-medium">Commercial Client Deliverables</div>
            </div>
            <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800/60">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mb-1">Instant</div>
              <div className="text-xs sm:text-sm text-neutral-400 font-medium">WhatsApp Community Direct Access</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
