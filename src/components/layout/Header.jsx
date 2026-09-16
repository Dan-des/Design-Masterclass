import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function Header() {
  const { openSupport } = useApp();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#0d0d0d]/85 backdrop-blur-md border-b border-neutral-800/80 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.6)]'
          : 'bg-[#0d0d0d]/40 backdrop-blur-sm border-b border-neutral-800/30 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <a
          href="#hero-section"
          onClick={(e) => {
            e.preventDefault();
            window.location.reload();
          }}
          className="flex items-center gap-3 group focus:outline-none cursor-pointer"
        >
          <div className="relative w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-700/80 flex items-center justify-center transition-all group-hover:border-yellow-400/80 group-hover:shadow-[0_0_16px_rgba(250,204,21,0.25)] flex-shrink-0">
            {/* Handcrafted inline SVG logo mark */}
            <svg
              className="w-6 h-6 text-yellow-400"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
              <path
                d="M8 8H16C20.4183 8 24 11.5817 24 16C24 20.4183 20.4183 24 16 24H8V8Z"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="16" r="3" fill="currentColor" />
              <line x1="8" y1="28" x2="24" y2="28" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold tracking-tight text-white group-hover:text-yellow-400 transition-colors leading-tight">
              Olatunde Daniel
            </span>
            <span className="text-[10px] sm:text-xs font-mono tracking-wider text-neutral-400 uppercase">
              Graphics Design Masterclass
            </span>
          </div>
        </a>

        {/* Right Action Trigger Buttons */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={openSupport}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-neutral-300 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-md backdrop-blur-sm transition-all focus:outline-none focus:ring-1 focus:ring-yellow-400"
            aria-label="Open Support Desk"
          >
            <svg
              className="w-4 h-4 text-yellow-400 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Support</span>
          </button>

          <a
            href="#pricing-section"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('pricing-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-black bg-yellow-400 hover:bg-yellow-300 rounded-md transition-all shadow-[0_0_18px_rgba(250,204,21,0.22)] active:scale-95 focus:outline-none cursor-pointer"
          >
            <span>Enroll Now</span>
            <svg
              className="w-3.5 h-3.5"
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
        </div>
      </div>
    </header>
  );
}
