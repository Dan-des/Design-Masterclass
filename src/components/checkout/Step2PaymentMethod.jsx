import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentProcessingSkeleton } from './Skeletons';

export default function Step2PaymentMethod() {
  const {
    selectedTier,
    selectedTierId,
    setSelectedTierId,
    transactionId,
    sessionId,
    studentInfo,
    submitPayment,
    paymentStatus,
    setCheckoutStep,
    rateLimitState,
    duplicateCheck,
    formatRemainingCooldown
  } = useApp();

  const paymentMethod = 'paystack';
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (rateLimitState?.isLocked || duplicateCheck?.isDuplicate) return;
    setIsProcessing(true);
    // Explicitly pass both price and active tier ID to ensure zero mismatch
    await submitPayment(paymentMethod, selectedTier.price, selectedTier.id);
    setIsProcessing(false);
  };

  if (isProcessing || paymentStatus === 'processing') {
    return <PaymentProcessingSkeleton />;
  }

  const isBlocked = Boolean(rateLimitState?.isLocked || duplicateCheck?.isDuplicate);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Transaction & Session Audit Header */}
      <div className="p-3 rounded-lg bg-neutral-900/90 border border-neutral-800 text-[11px] font-mono flex flex-wrap items-center justify-between gap-2 text-neutral-400">
        <div>
          <span className="text-neutral-500">TXN: </span>
          <span className="text-yellow-400 font-semibold">{transactionId}</span>
        </div>
        <div>
          <span className="text-neutral-500">SES: </span>
          <span className="text-neutral-300">{sessionId}</span>
        </div>
      </div>

      {/* Duplicate Enrollment Guard Warning Banner */}
      {duplicateCheck?.isDuplicate && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-500 flex items-center gap-2 animate-fadeIn">
          <svg className="w-4 h-4 text-rose-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>User Exist</span>
        </div>
      )}

      {/* Itemized Order Breakdown */}
      <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono uppercase text-neutral-400 font-semibold">
            Order Summary
          </span>
          <button
            type="button"
            onClick={() => setSelectedTierId(selectedTier.id === 'pro' ? 'starter' : 'pro')}
            className="text-[11px] font-mono text-yellow-400 hover:text-yellow-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            {selectedTier.id === 'pro' ? 'Switch to Starter (₦200)' : 'Upgrade to Best Value (₦350)'}
          </button>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-white font-medium">{selectedTier.name}</span>
          <span className="font-mono text-white">₦{selectedTier.originalPrice}</span>
        </div>

        {selectedTier.discount > 0 && (
          <div className="flex justify-between text-xs text-yellow-400">
            <span>Special Cohort Discount</span>
            <span className="font-mono">-₦{selectedTier.discount}</span>
          </div>
        )}

        <div className="flex justify-between text-xs text-neutral-400">
          <span>Processing &amp; Delivery Fee</span>
          <span className="font-mono text-emerald-400">FREE</span>
        </div>

        <div className="pt-3 border-t border-neutral-800 flex justify-between items-baseline">
          <span className="text-sm font-bold text-white">Total Amount Due</span>
          <span className="text-2xl font-bold font-mono text-yellow-400">
            ₦{selectedTier.price}
          </span>
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-2.5">
        <label className="block text-xs font-medium text-neutral-300">
          Payment Method
        </label>

        {/* Paystack Payment Gateway */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border bg-yellow-400/5 border-yellow-400/80 shadow-[0_0_15px_rgba(250,204,21,0.1)]">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-yellow-400 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">
                Paystack Checkout (Card / Bank Transfer / USSD)
              </span>
              <span className="text-[11px] text-neutral-400">
                Official secured Nigerian gateway &amp; instant verification
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          type="button"
          disabled={isBlocked}
          onClick={handlePay}
          className={`w-full py-4 px-6 rounded-lg font-extrabold text-sm transition-all flex items-center justify-center gap-2 focus:outline-none ${
            isBlocked
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
              : 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_0_20px_rgba(250,204,21,0.3)] active:scale-[0.99]'
          }`}
        >
          {rateLimitState?.isLocked ? (
            <span>Rate Limit Active ({formatRemainingCooldown(rateLimitState.remainingMs)})</span>
          ) : duplicateCheck?.isDuplicate ? (
            <span>User Exist</span>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Complete Payment - ₦{selectedTier.price}</span>
            </>
          )}
        </button>

        {/* Legal Chargeback Shield micro-copy */}
        <p className="text-center text-[11px] text-neutral-400 font-medium leading-relaxed">
          Digital masterclass access is delivered instantly and is final sale.
        </p>

        {/* Back to Step 1 */}
        <button
          type="button"
          onClick={() => setCheckoutStep(1)}
          className="w-full py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-1 focus:outline-none"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Back to Student Information</span>
        </button>
      </div>
    </div>
  );
}
