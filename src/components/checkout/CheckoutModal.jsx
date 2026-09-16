import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import Step1StudentInfo from './Step1StudentInfo';
import Step2PaymentMethod from './Step2PaymentMethod';
import Step3Confirmation from './Step3Confirmation';

export default function CheckoutModal() {
  const {
    isCheckoutOpen,
    closeCheckout,
    checkoutStep,
    setCheckoutStep,
    paymentStatus,
    rateLimitState,
    formatRemainingCooldown
  } = useApp();

  // Escape key closes modal unless processing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && paymentStatus !== 'processing') {
        closeCheckout();
      }
    };
    if (isCheckoutOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCheckoutOpen, paymentStatus, closeCheckout]);

  if (!isCheckoutOpen) return null;

  const steps = [
    { num: 1, label: 'Student Info' },
    { num: 2, label: 'Payment' },
    { num: 3, label: 'Instant Access' }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      className="checkout-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && paymentStatus !== 'processing') {
          closeCheckout();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]">
        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <h2 id="checkout-title" className="text-sm sm:text-base font-bold text-white tracking-tight">
              Express Enrollment Desk
            </h2>
          </div>
          <button
            type="button"
            disabled={paymentStatus === 'processing'}
            onClick={closeCheckout}
            aria-label="Close checkout"
            className="w-8 h-8 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700/60 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Rate Limit Security Lockout Banner */}
        {rateLimitState?.isLocked && (
          <div className="px-5 py-3 bg-rose-500/10 border-b border-rose-500/30 flex items-start gap-3 text-xs text-rose-300 animate-fadeIn flex-shrink-0">
            <svg className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Multiple Requests Lockout Active
                </span>
                <span className="font-mono text-rose-400 font-bold bg-black/60 px-2 py-0.5 rounded border border-rose-500/30">
                  {formatRemainingCooldown(rateLimitState.remainingMs)}
                </span>
              </div>
              <p className="mt-1 text-neutral-300">
                Rate limit triggered after 5 repeated uncompleted checkout attempts. Checkout is temporarily suspended for system protection.
              </p>
            </div>
          </div>
        )}

        {/* Step Progress Stepper */}
        <div className="px-5 py-3 bg-black/40 border-b border-neutral-800/60 flex-shrink-0">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => {
              const isCurrent = checkoutStep === s.num;
              const isPast = checkoutStep > s.num;
              const canNavigate = isPast && paymentStatus !== 'processing' && checkoutStep !== 3;

              return (
                <div
                  key={s.num}
                  onClick={() => {
                    if (canNavigate) {
                      setCheckoutStep(s.num);
                    }
                  }}
                  className={`flex items-center gap-2 ${canNavigate ? 'cursor-pointer hover:opacity-85' : ''}`}
                  title={canNavigate ? `Go back to ${s.label}` : undefined}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-colors ${
                      isCurrent
                        ? 'bg-yellow-400 text-black shadow-[0_0_12px_rgba(250,204,21,0.4)]'
                        : isPast
                        ? 'bg-emerald-500 text-black'
                        : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                    }`}
                  >
                    {isPast ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      s.num
                    )}
                  </div>
                  <span
                    className={`text-xs hidden sm:inline font-medium ${
                      isCurrent ? 'text-white' : isPast ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    {s.label}
                  </span>
                  {index < steps.length - 1 && (
                    <div className="w-8 sm:w-12 h-[1px] bg-neutral-800 mx-1 sm:mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Container with dvh resilience */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-grow overscroll-contain">
          {checkoutStep === 1 && <Step1StudentInfo />}
          {checkoutStep === 2 && <Step2PaymentMethod />}
          {checkoutStep === 3 && <Step3Confirmation />}
        </div>
      </div>
    </div>
  );
}
