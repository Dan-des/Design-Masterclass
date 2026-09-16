import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { generateSessionId, generateTransactionId } from '../utils/crypto';
import {
  TIERS,
  resolveTierPricing,
  validateEmail,
  validatePhone,
  validateName,
  validateAppConfig,
  logSecurityEvent,
  checkDuplicateEnrollment,
  getRateLimitStatus,
  recordCheckoutAttempt,
  resetRateLimit,
  formatRemainingCooldown
} from '../utils/security';
import {
  KEYS,
  getSessionStorage,
  setSessionStorage,
  saveAbandonedLead,
  loadAbandonedLead,
  recordCompletedTransaction,
  getCompletedTransactions
} from '../utils/storage';
import { initiatePayment, verifyPayment, verifyStripeSession, validateStudent } from '../utils/api';

const AppContext = createContext(null);

const DEFAULT_CONFIG = {
  COURSE_TITLE: 'Olatunde Daniel',
  SUB_TITLE: 'Graphics Design Masterclass',
  INSTRUCTOR_NAME: 'Olatunde Daniel',
  CURRENCY: 'NGN',
  WHATSAPP_INVITE_URL: 'https://chat.whatsapp.com/invite/olatunde-masterclass-2026'
};

export function AppProvider({ children }) {
  // Session ID for request tracking and telemetry
  const [sessionId] = useState(() => {
    const existing = getSessionStorage(KEYS.SESSION_ID);
    if (existing) return existing;
    const fresh = generateSessionId();
    setSessionStorage(KEYS.SESSION_ID, fresh);
    return fresh;
  });

  // Cached student contact info so returning users do not have to retype info
  const cachedLead = loadAbandonedLead();

  const [transactionId, setTransactionId] = useState(null);
  const [selectedTierId, setSelectedTierId] = useState('pro');
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const [studentInfo, setStudentInfo] = useState(() => ({
    fullName: cachedLead?.fullName || '',
    email: cachedLead?.email || '',
    whatsapp: cachedLead?.whatsapp || ''
  }));

  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [paymentResult, setPaymentResult] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  // Rate limit and lockout state (5 uncompleted request lockout)
  const [rateLimitState, setRateLimitState] = useState(() => getRateLimitStatus());

  // Real-time continuous sync for rate limit cooldown countdown
  useEffect(() => {
    const syncRateLimit = () => {
      setRateLimitState(getRateLimitStatus());
    };
    syncRateLimit();
    const interval = setInterval(syncRateLimit, 1000);
    return () => clearInterval(interval);
  }, []);

  // System validation on boot
  useEffect(() => {
    validateAppConfig(DEFAULT_CONFIG);
    logSecurityEvent('APP_BOOT_SUCCESS', { sessionId });
  }, [sessionId]);

  // Network state listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logSecurityEvent('NETWORK_RESTORED');
      showToast('Connection restored. System online.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      logSecurityEvent('NETWORK_DISCONNECTED');
      showToast('Network connection lost. Offline state active.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Toast notification helper
  const showToast = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4500);
  }, []);

  // Handle payment return redirect (Paystack ?reference=... / ?trxref=... or Stripe ?session_id=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const paymentRef = params.get('reference') || params.get('trxref') || params.get('ref') || params.get('session_id');
    const status = params.get('status');

    if (paymentRef && status !== 'cancelled') {
      // Clean query parameters from address bar immediately so refresh doesn't re-trigger
      window.history.replaceState({}, document.title, window.location.pathname);

      setIsCheckoutOpen(true);
      setPaymentStatus('processing');

      verifyPayment(paymentRef)
        .then((res) => {
          if (res.success) {
            setPaymentResult({
              success: true,
              receiptNumber: res.receiptNumber,
              transactionId: res.transactionId || paymentRef,
              paidAt: res.paidAt,
              tier: res.tier || TIERS.pro,
              method: 'paystack'
            });
            if (res.studentInfo) {
              setStudentInfo((prev) => ({
                ...prev,
                fullName: res.studentInfo.fullName || prev.fullName,
                email: res.studentInfo.email || prev.email,
                whatsapp: res.studentInfo.whatsapp || prev.whatsapp
              }));
            }
            setPaymentStatus('completed');
            setCheckoutStep(3);

            recordCompletedTransaction({
              transactionId: res.transactionId || paymentRef,
              sessionId,
              tier: res.tier || TIERS.pro,
              studentInfo: res.studentInfo || studentInfo,
              paidAt: res.paidAt,
              receiptNumber: res.receiptNumber
            });

            resetRateLimit();
            setRateLimitState({ isLocked: false, remainingMs: 0, attempts: 0, maxAttempts: 5 });

            showToast('Payment confirmed. Masterclass access unlocked.', 'success');
          } else {
            setPaymentStatus('failed');
            showToast(res.error || 'Could not verify payment. Please contact support.', 'error');
          }
        })
        .catch((err) => {
          console.error('[Payment Return Verification] Error:', err);
          setPaymentStatus('failed');
          showToast('Payment verification interrupted. Please contact support.', 'error');
        });
    } else if (status === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname);
      showToast('Checkout was cancelled. You can complete your enrollment at any time.', 'info');
    }
  }, [sessionId, studentInfo, showToast]);

  // Real-time Abandoned Lead Capture
  const updateStudentField = useCallback((field, value) => {
    setStudentInfo((prev) => {
      const updated = { ...prev, [field]: value };
      saveAbandonedLead(updated);
      return updated;
    });
  }, []);

  // Real-time duplicate check against completed transactions
  const duplicateCheck = checkDuplicateEnrollment(studentInfo, getCompletedTransactions());

  // Open Checkout Drawer cleanly for the selected tier (starts fresh at Step 1)
  const openCheckout = useCallback((tierId = 'pro') => {
    // Check rate limit on opening
    const rateCheck = getRateLimitStatus();
    setRateLimitState(rateCheck);

    setSelectedTierId(tierId);
    setCheckoutStep(1);
    setPaymentStatus('idle');
    setPaymentResult(null);
    setTransactionId(generateTransactionId());
    setIsCheckoutOpen(true);
    logSecurityEvent('CHECKOUT_OPENED', { tierId });
  }, []);

  // Cancel / Close checkout drawer cleanly without side effects
  const closeCheckout = useCallback(() => {
    if (paymentStatus === 'processing') return;
    setIsCheckoutOpen(false);
  }, [paymentStatus]);

  // Support Modal Toggles
  const openSupport = useCallback(() => {
    setIsSupportOpen(true);
    logSecurityEvent('SUPPORT_OPENED');
  }, []);

  const closeSupport = useCallback(() => {
    setIsSupportOpen(false);
  }, []);

  // Step 1 Submission: Validate inputs via backend, enforce duplicate guard & rate limit
  const submitStep1 = useCallback(async (formData, explicitTierId) => {
    const activeTierId = explicitTierId || selectedTierId || 'pro';
    if (explicitTierId && explicitTierId !== selectedTierId) {
      setSelectedTierId(explicitTierId);
    }
    const { fullName, email, whatsapp } = formData;

    // 1. Rate Limit Enforcement
    const rateCheck = getRateLimitStatus();
    if (rateCheck.isLocked) {
      showToast(`Checkout temporarily locked for security. Cooldown: ${formatRemainingCooldown(rateCheck.remainingMs)} remaining.`, 'error');
      logSecurityEvent('RATE_LIMITED_SUBMIT_BLOCKED', { remainingMs: rateCheck.remainingMs });
      return false;
    }

    // 2. Duplicate Enrollment Guard (same email & name or phone number)
    const history = getCompletedTransactions();
    const dupCheck = checkDuplicateEnrollment(formData, history);
    if (dupCheck.isDuplicate) {
      showToast('User Exist', 'error');
      logSecurityEvent('DUPLICATE_PURCHASE_FLAGGED', {
        student: formData,
        reason: dupCheck.reason,
        matchedTxn: dupCheck.matchedTransactionId,
        matchedReceipt: dupCheck.matchedReceiptNumber
      });
      return false;
    }

    // 3. Backend criteria validation (11-digit phone, domain structure e.g. @gmail.com)
    try {
      const serverCheck = await validateStudent(formData);
      if (!serverCheck.success) {
        showToast(serverCheck.error || 'Please provide valid enrollment information.', 'error');
        return false;
      }
    } catch (err) {
      console.warn('[Validation] Endpoint check warning:', err.message);
    }

    // 4. Rate Limit Counter: record attempt
    const attemptStatus = recordCheckoutAttempt();
    setRateLimitState(attemptStatus);
    if (attemptStatus.isLocked) {
      showToast('Multiple uncompleted requests detected (5 attempts). Checkout locked for 30 seconds.', 'error');
      return false;
    }

    const currentTxnId = transactionId || generateTransactionId();
    setTransactionId(currentTxnId);
    setStudentInfo({ fullName, email, whatsapp });

    // Save lead snapshot
    saveAbandonedLead({ fullName, email, whatsapp, tierId: activeTierId, txnId: currentTxnId });

    logSecurityEvent('STEP1_COMPLETED', {
      transactionId: currentTxnId,
      tierId: activeTierId,
      email
    });

    setCheckoutStep(2);
    return true;
  }, [transactionId, selectedTierId, showToast]);

  // Step 2 Submission: Payment Execution with Price Tamper, Duplicate Guard & Rate Limit
  const submitPayment = useCallback(async (paymentMethod, claimedPrice, explicitTierId) => {
    const activeTierId = explicitTierId || selectedTierId || 'pro';
    if (!isOnline) {
      showToast('Cannot process payment while offline. Check internet connection.', 'error');
      return false;
    }

    // Rate Limit Check
    const rateCheck = getRateLimitStatus();
    if (rateCheck.isLocked) {
      showToast(`Checkout locked due to rate limit. Cooldown: ${formatRemainingCooldown(rateCheck.remainingMs)} remaining.`, 'error');
      return false;
    }

    // Strict Duplicate Enrollment Guard
    const history = getCompletedTransactions();
    const dupCheck = checkDuplicateEnrollment(studentInfo, history);
    if (dupCheck.isDuplicate) {
      showToast('User Exist', 'error');
      logSecurityEvent('DUPLICATE_PURCHASE_FLAGGED', { studentInfo, reason: dupCheck.reason });
      setPaymentStatus('failed');
      return false;
    }

    // Enforce strict price tamper defense
    const verification = resolveTierPricing(activeTierId, claimedPrice);
    if (!verification.isValid) {
      showToast(verification.error, 'error');
      logSecurityEvent('PAYMENT_TAMPER_BLOCKED', { tierId: activeTierId, claimedPrice });
      return false;
    }

    setPaymentStatus('processing');

    try {
      // Step A: Initiate payment with backend — server validates tier, checks duplicates,
      // and creates the Paystack session (or confirms mock mode).
      const initResult = await initiatePayment({
        tierId: activeTierId,
        fullName: studentInfo.fullName,
        email: studentInfo.email,
        whatsapp: studentInfo.whatsapp,
        sessionId,
        clientTransactionId: transactionId
      });

      if (!initResult.success) {
        setPaymentStatus('failed');
        showToast(initResult.error || 'Payment initialization failed. Please try again.', 'error');
        return false;
      }

      // Step B: If live Paystack — redirect to hosted payment page.
      // If mock mode — skip redirect and verify immediately.
      if (!initResult.mock && initResult.authorizationUrl) {
        // Live Paystack: redirect browser to hosted checkout.
        // On return, the app reads ?ref=TXN-xxxxx from the URL and calls verifyPayment.
        window.location.href = initResult.authorizationUrl;
        return true;
      }

      // Mock mode: verify immediately (no real redirect needed).
      const confirmTxnId = initResult.transactionId || transactionId;
      const verifyResult = await verifyPayment(confirmTxnId, {
        tierId: selectedTierId,
        fullName: studentInfo.fullName,
        whatsapp: studentInfo.whatsapp
      });

      if (!verifyResult.success && !verifyResult.alreadyProcessed) {
        setPaymentStatus('failed');
        showToast(verifyResult.error || 'Payment could not be confirmed. Please try again.', 'error');
        return false;
      }

      setPaymentResult({
        success: true,
        receiptNumber: verifyResult.receiptNumber,
        transactionId: confirmTxnId,
        paidAt: verifyResult.paidAt,
        tier: verification.tier,
        method: paymentMethod
      });

      setPaymentStatus('completed');
      setCheckoutStep(3);

      // Record locally (for duplicate guard and receipt display)
      recordCompletedTransaction({
        transactionId: confirmTxnId,
        sessionId,
        tier: verification.tier,
        studentInfo,
        paidAt: verifyResult.paidAt,
        receiptNumber: verifyResult.receiptNumber
      });

      // Clear rate limit on confirmed payment
      resetRateLimit();
      setRateLimitState({ isLocked: false, remainingMs: 0, attempts: 0, maxAttempts: 5 });

      showToast('Payment verified. Masterclass enrollment active.', 'success');
      return true;
    } catch (err) {
      console.error('Payment processing fault', err);
      setPaymentStatus('failed');
      showToast('Payment authorization interrupted. Please try again.', 'error');
      return false;
    }
  }, [isOnline, selectedTierId, transactionId, sessionId, studentInfo, showToast]);

  // Restart / Reset checkout
  const resetCheckout = useCallback(() => {
    setCheckoutStep(1);
    setPaymentStatus('idle');
    setPaymentResult(null);
    const newTxn = generateTransactionId();
    setTransactionId(newTxn);
  }, []);

  const value = {
    config: DEFAULT_CONFIG,
    sessionId,
    transactionId,
    selectedTierId,
    setSelectedTierId,
    selectedTier: TIERS[selectedTierId] || TIERS.pro,
    checkoutStep,
    setCheckoutStep,
    isCheckoutOpen,
    isSupportOpen,
    studentInfo,
    paymentStatus,
    paymentResult,
    isOnline,
    toast,
    rateLimitState,
    duplicateCheck,
    formatRemainingCooldown,
    openCheckout,
    closeCheckout,
    openSupport,
    closeSupport,
    updateStudentField,
    submitStep1,
    submitPayment,
    resetCheckout,
    showToast
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be utilized within an AppProvider');
  }
  return context;
}
