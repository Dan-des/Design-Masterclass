import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Step3Confirmation() {
  const {
    transactionId,
    sessionId,
    studentInfo,
    selectedTier,
    paymentResult,
    config,
    closeCheckout
  } = useApp();

  const handlePrint = () => {
    window.print();
  };

  const receiptNumber = paymentResult?.receiptNumber || 'RCP-00001';
  const paidDate = paymentResult?.paidAt
    ? new Date(paymentResult.paidAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

  return (
    <div className="space-y-6 animate-fadeIn py-2">
      {/* Verified Header Badge */}
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.2)]">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-semibold uppercase tracking-wider mb-2">
          Payment Verified &amp; Secured
        </span>
        <h3 className="text-2xl font-extrabold text-white">
          Welcome to Olatunde Daniel Masterclass
        </h3>
        <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-sm mx-auto">
          Enrollment confirmed for <span className="text-white font-medium">{studentInfo.fullName}</span>.
        </p>
      </div>

      {/* Transaction & Audit Metadata Card */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5 text-xs font-mono">
        <div className="flex justify-between items-center text-neutral-400">
          <span>TRANSACTION ID</span>
          <span className="text-yellow-400 font-bold">{transactionId}</span>
        </div>
        <div className="flex justify-between items-center text-neutral-400">
          <span>RECEIPT NUMBER</span>
          <span className="text-white">{receiptNumber}</span>
        </div>
        <div className="flex justify-between items-center text-neutral-400">
          <span>SESSION ID</span>
          <span className="text-neutral-400">{sessionId}</span>
        </div>
        <div className="flex justify-between items-center text-neutral-400">
          <span>CONFIRMED TIER</span>
          <span className="text-white font-bold">{selectedTier.name} (₦{selectedTier.price})</span>
        </div>
        <div className="flex justify-between items-center text-neutral-400">
          <span>TIMESTAMP</span>
          <span className="text-neutral-300">{paidDate}</span>
        </div>
      </div>

      {/* Email Notification Notice */}
      <div className="p-3.5 rounded-lg bg-yellow-400/5 border border-yellow-400/20 flex items-start gap-3 text-xs text-neutral-300">
        <svg className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <div>
          <span className="font-semibold text-white block">Official Receipt &amp; Credentials Dispatched</span>
          <span>A copy of your payment receipt and personal onboarding link have been sent to <strong className="text-yellow-400">{studentInfo.email}</strong>.</span>
        </div>
      </div>

      {/* Primary Action 1: Resilient Access Guarantee (WhatsApp Community) */}
      <div className="space-y-3 pt-2">
        <a
          href={config.WHATSAPP_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 px-6 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm sm:text-base transition-all shadow-[0_0_24px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2.5 focus:outline-none"
        >
          {/* Handcrafted WhatsApp icon */}
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.78 14.15c-.24.68-1.4 1.25-1.92 1.33-.5.08-1.13.11-3.64-.93-2.14-.89-3.53-3.08-3.64-3.23-.11-.15-.87-1.16-.87-2.21 0-1.05.55-1.57.75-1.78.2-.21.43-.26.58-.26.15 0 .3 0 .43.01.14.01.32-.05.5.38.19.45.64 1.57.7 1.69.06.12.1.26.02.42-.08.16-.12.26-.24.4-.12.14-.25.31-.36.42-.12.12-.25.25-.11.49.14.24.62 1.02 1.33 1.65.92.81 1.69 1.07 1.93 1.19.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.6-.18 1.28z"/>
          </svg>
          <span>Join WhatsApp Community Now</span>
        </a>

        {/* Primary Action 2: Print Official Receipt */}
        <button
          type="button"
          onClick={handlePrint}
          className="w-full py-3 px-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-sm border border-neutral-700 transition-all flex items-center justify-center gap-2 focus:outline-none"
        >
          <svg className="w-4 h-4 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          <span>Print Official Receipt (PDF)</span>
        </button>

        {/* Dismiss / Return to Portal */}
        <button
          type="button"
          onClick={closeCheckout}
          className="w-full py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          Close and Return to Course Overview
        </button>
      </div>
    </div>
  );
}
