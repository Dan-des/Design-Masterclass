import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { sanitizeInput, validateEmail, validateName, validateMessage } from '../../utils/security';
import { submitSupportTicket } from '../../utils/api';

export default function SupportModal() {
  const { isSupportOpen, closeSupport, sessionId, transactionId, studentInfo } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketResult, setTicketResult] = useState(null);

  // Sync student info if available from checkout
  useEffect(() => {
    if (studentInfo?.fullName && !fullName) setFullName(studentInfo.fullName);
    if (studentInfo?.email && !email) setEmail(studentInfo.email);
  }, [studentInfo, isSupportOpen]);

  // Escape key closes modal unless submitting
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        closeSupport();
      }
    };
    if (isSupportOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSupportOpen, isSubmitting, closeSupport]);

  if (!isSupportOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const sanitizedName = sanitizeInput(fullName);
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedMsg = sanitizeInput(message);

    const newErrors = {};
    if (!validateName(sanitizedName)) {
      newErrors.fullName = 'Please provide your valid full name.';
    }
    if (!validateEmail(sanitizedEmail)) {
      newErrors.email = 'Please provide a valid email address.';
    }
    if (!validateMessage(sanitizedMsg)) {
      newErrors.message = 'Please provide a detailed description (minimum 10 characters).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      // Auto-attaches active Session ID and Transaction ID
      const result = await submitSupportTicket({
        fullName: sanitizedName,
        email: sanitizedEmail,
        message: sanitizedMsg,
        sessionId,
        transactionId: transactionId || null
      });

      setTicketResult(result);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Support ticket dispatch failed', err);
      setErrors({ global: 'Unable to submit ticket. Please check connection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setMessage('');
    setTicketResult(null);
    closeSupport();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-drawer-title"
      className="support-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleResetAndClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 id="support-drawer-title" className="text-sm sm:text-base font-bold text-white tracking-tight">
              Olatunde Daniel Support Desk
            </h2>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleResetAndClose}
            aria-label="Close support desk"
            className="w-8 h-8 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700/60 flex items-center justify-center transition-colors focus:outline-none"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-grow overscroll-contain">
          {isSubmitted ? (
            <div className="space-y-6 text-center py-6 animate-fadeIn">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Ticket Received — Support will reach out via email
                </h3>
                <p className="text-sm text-neutral-400 max-w-sm mx-auto">
                  Your inquiry has been queued for Olatunde Daniel and our technical team.
                </p>
              </div>

              {/* Ticket metadata audit */}
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono space-y-2 text-left max-w-sm mx-auto">
                <div className="flex justify-between">
                  <span className="text-neutral-500">TICKET REF</span>
                  <span className="text-yellow-400 font-bold">{ticketResult?.ticketId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">ACTIVE SESSION</span>
                  <span className="text-neutral-300">{sessionId}</span>
                </div>
                {transactionId && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">LINKED TRANSACTION</span>
                    <span className="text-neutral-300">{transactionId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-500">RECIPIENT EMAIL</span>
                  <span className="text-white">{email}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-3.5 px-6 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm transition-all focus:outline-none shadow-[0_0_18px_rgba(250,204,21,0.2)]"
              >
                Return to Browsing
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-neutral-400 mb-4">
                Have questions about curriculum requirements, software setup, or payment status? Submit your request below.
              </p>

              {/* Auto-Attached Metadata Pill */}
              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-400 space-y-1">
                <div className="text-neutral-500 uppercase font-semibold">Auto-Attached Session Telemetry</div>
                <div className="flex justify-between">
                  <span>Session ID:</span>
                  <span className="text-neutral-300">{sessionId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transaction ID:</span>
                  <span className={transactionId ? 'text-yellow-400' : 'text-neutral-500'}>
                    {transactionId || 'Not yet generated'}
                  </span>
                </div>
              </div>

              {/* Student Full Name */}
              <div>
                <label htmlFor="support-name" className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Student Full Name <span className="text-yellow-400">*</span>
                </label>
                <input
                  id="support-name"
                  type="text"
                  required
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-lg bg-neutral-900 border text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 transition-colors ${
                    errors.fullName ? 'border-rose-500' : 'border-neutral-800 focus:border-yellow-400'
                  }`}
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-rose-400">{errors.fullName}</p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="support-email" className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Email Address <span className="text-yellow-400">*</span>
                </label>
                <input
                  id="support-email"
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-lg bg-neutral-900 border text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 transition-colors ${
                    errors.email ? 'border-rose-500' : 'border-neutral-800 focus:border-yellow-400'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-400">{errors.email}</p>
                )}
              </div>

              {/* Description of Issue */}
              <div>
                <label htmlFor="support-message" className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Description of Issue / Complaint <span className="text-yellow-400">*</span>
                </label>
                <textarea
                  id="support-message"
                  required
                  rows={4}
                  placeholder="Provide detailed information regarding your inquiry, question, or transaction..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-lg bg-neutral-900 border text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 transition-colors resize-none ${
                    errors.message ? 'border-rose-500' : 'border-neutral-800 focus:border-yellow-400'
                  }`}
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-rose-400">{errors.message}</p>
                )}
              </div>

              {errors.global && (
                <p className="text-xs text-rose-400 text-center">{errors.global}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm transition-all shadow-[0_0_18px_rgba(250,204,21,0.25)] flex items-center justify-center gap-2 focus:outline-none disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="4" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="4" />
                    </svg>
                    <span>Dispatching Ticket...</span>
                  </span>
                ) : (
                  <span>Submit Support Ticket</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
