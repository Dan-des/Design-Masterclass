import React from 'react';
import { useApp } from '../../context/AppContext';
import { sanitizeInput, TIERS } from '../../utils/security';

export default function Step1StudentInfo() {
  const {
    studentInfo,
    updateStudentField,
    submitStep1,
    selectedTierId,
    setSelectedTierId,
    selectedTier,
    duplicateCheck,
    rateLimitState,
    formatRemainingCooldown
  } = useApp();

  const handleInputChange = (field, rawValue) => {
    const sanitized = sanitizeInput(rawValue);
    updateStudentField(field, sanitized);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rateLimitState?.isLocked || duplicateCheck?.isDuplicate) return;

    await submitStep1({
      fullName: studentInfo.fullName,
      email: studentInfo.email,
      whatsapp: studentInfo.whatsapp
    }, selectedTier.id);
  };

  const isFormBlocked = Boolean(rateLimitState?.isLocked || duplicateCheck?.isDuplicate);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn">
      {/* Interactive Tier Selection Switcher */}
      <div>
        <div className="text-xs font-mono uppercase text-neutral-400 mb-2 flex items-center justify-between">
          <span>Choose Enrollment Tier</span>
          <span className="text-[11px] text-yellow-400">Click to switch</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Starter Tier Option */}
          <button
            type="button"
            onClick={() => setSelectedTierId('starter')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedTier.id === 'starter'
                ? 'bg-neutral-900 border-yellow-400/90 shadow-[0_0_16px_rgba(250,204,21,0.18)]'
                : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold ${selectedTier.id === 'starter' ? 'text-white' : 'text-neutral-300'}`}>
                Starter
              </span>
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                selectedTier.id === 'starter' ? 'border-yellow-400 bg-yellow-400' : 'border-neutral-700'
              }`}>
                {selectedTier.id === 'starter' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
              </div>
            </div>
            <div className="font-mono text-sm font-extrabold text-yellow-400">₦200</div>
            <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Photoshop &amp; Raw</div>
          </button>

          {/* Pro / Best Value Tier Option */}
          <button
            type="button"
            onClick={() => setSelectedTierId('pro')}
            className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
              selectedTier.id === 'pro'
                ? 'bg-neutral-900 border-yellow-400/90 shadow-[0_0_16px_rgba(250,204,21,0.22)]'
                : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-400'
            }`}
          >
            <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-yellow-400 text-black text-[9px] font-mono font-black uppercase rounded">
              Popular
            </span>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold ${selectedTier.id === 'pro' ? 'text-white' : 'text-neutral-300'}`}>
                Best Value
              </span>
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                selectedTier.id === 'pro' ? 'border-yellow-400 bg-yellow-400' : 'border-neutral-700'
              }`}>
                {selectedTier.id === 'pro' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-sm font-extrabold text-yellow-400">₦350</span>
              <span className="font-mono text-[10px] text-neutral-500 line-through">₦500</span>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Full Adobe &amp; Figma</div>
          </button>
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

      {/* Field: Full Name */}
      <div>
        <label htmlFor="student-full-name" className="block text-xs font-medium text-neutral-300 mb-1.5">
          Student Full Name <span className="text-yellow-400">*</span>
        </label>
        <div className="relative">
          <input
            id="student-full-name"
            type="text"
            required
            autoComplete="name"
            placeholder="e.g. Ayomide Daniel"
            value={studentInfo.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-yellow-400 focus:ring-yellow-400 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 transition-colors"
          />
        </div>
      </div>

      {/* Field: Email Address */}
      <div>
        <label htmlFor="student-email" className="block text-xs font-medium text-neutral-300 mb-1.5">
          Email Address <span className="text-yellow-400">*</span>
        </label>
        <div className="relative">
          <input
            id="student-email"
            type="email"
            required
            autoComplete="email"
            placeholder="e.g. ayomide@example.com"
            value={studentInfo.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-yellow-400 focus:ring-yellow-400 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 transition-colors"
          />
        </div>
        <p className="mt-1 text-[11px] text-neutral-400">
          Course access links and official receipt will be dispatched to this address.
        </p>
      </div>

      {/* Field: WhatsApp Phone Number */}
      <div>
        <label htmlFor="student-phone" className="block text-xs font-medium text-neutral-300 mb-1.5">
          WhatsApp Phone Number <span className="text-yellow-400">*</span>
        </label>
        <div className="relative">
          <input
            id="student-phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="e.g. 08012345678"
            value={studentInfo.whatsapp}
            onChange={(e) => handleInputChange('whatsapp', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 focus:border-yellow-400 focus:ring-yellow-400 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 transition-colors"
          />
        </div>
        <p className="mt-1 text-[11px] text-neutral-400">
          Required for direct invite to the exclusive student mentorship WhatsApp group.
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isFormBlocked}
        className={`w-full py-3.5 px-6 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 focus:outline-none ${
          isFormBlocked
            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
            : 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_0_18px_rgba(250,204,21,0.25)] active:scale-[0.99]'
        }`}
      >
        {rateLimitState?.isLocked ? (
          <span>Rate Limit Active ({formatRemainingCooldown(rateLimitState.remainingMs)})</span>
        ) : duplicateCheck?.isDuplicate ? (
          <span>User Exist</span>
        ) : (
          <>
            <span>Continue to Payment Method</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
