import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { generateSessionId, generateTransactionId } from '../utils/crypto';
import {
  TIERS,
  resolveTierPricing,
  validateAppConfig,
  logSecurityEvent,
  getRateLimitStatus,
  recordCheckoutAttempt,
  resetRateLimit,
  formatRemainingCooldown,
  validateName,
  validateEmail,
  validatePhone
} from '../utils/security';
import {
  KEYS,
  getSessionStorage,
  setSessionStorage,
  purgeAllLegacyStorage
} from '../utils/storage';
import { initiatePayment, verifyPayment, validateStudent, checkUserExists } from '../utils/api';

const AppContext = createContext(null);

const DEFAULT_CONFIG = {
  COURSE_TITLE: 'Olatunde Daniel',
  SUB_TITLE: 'Graphics Design Masterclass',
  INSTRUCTOR_NAME: 'Olatunde Daniel',
  CURRENCY: 'NGN',
  WHATSAPP_INVITE_URL: import.meta.env.VITE_WHATSAPP_INVITE_URL || 'https://bit.ly/4rjaE67'
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

  const [transactionId, setTransactionId] = useState(null);
  const [selectedTierId, setSelectedTierId] = useState('pro');
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Student info always starts completely clean and fresh (zero localStorage caching)
  const [studentInfo, setStudentInfo] = useState({
    fullName: '',
    email: '',
    whatsapp: ''
  });

  // Dynamic duplicate status retrieved strictly from the live database
  const [isUserExist, setIsUserExist] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [paymentResult, setPaymentResult] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  // Rate limit and lockout state (5 uncompleted request lockout)
  const [rateLimitState, setRateLimitState] = useState(() => getRateLimitStatus());

  // Purge any legacy localStorage user data on boot so testing starts 100% afresh
  useEffect(() => {
    purgeAllLegacyStorage();
    validateAppConfig(DEFAULT_CONFIG);
    logSecurityEvent('APP_BOOT_SUCCESS', { sessionId });
  }, [sessionId]);

  // Real-time continuous sync for rate limit cooldown countdown
  useEffect(() => {
    const syncRateLimit = () => {
      setRateLimitState(getRateLimitStatus());
    };
    syncRateLimit();
    const interval = setInterval(syncRateLimit, 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Fast real-time duplicate check querying live MongoDB database (200ms responsive debounce)
  useEffect(() => {
    const email = (studentInfo.email || '').trim();
    const whatsapp = (studentInfo.whatsapp || '').trim();

    const hasValidEmail = email.includes('@') && email.includes('.') && email.indexOf('@') < email.lastIndexOf('.');
    const cleanPhone = whatsapp.replace(/[^0-9]/g, '');
    const hasValidPhone = cleanPhone.length >= 10;

    if (!hasValidEmail && !hasValidPhone) {
      setIsUserExist(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await checkUserExists({
          email: hasValidEmail ? email : '',
          whatsapp: hasValidPhone ? cleanPhone : ''
        });
        if (res && res.exists) {
          setIsUserExist(true);
        } else {
          setIsUserExist(false);
        }
      } catch {
        // Silently handle network interruption
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [studentInfo.email, studentInfo.whatsapp]);

  // Handle payment return redirect (Paystack ?reference=... / ?trxref=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const paymentRef = params.get('reference') || params.get('trxref') || params.get('ref') || params.get('session_id');
    const status = params.get('status');

    if (paymentRef && status !== 'cancelled') {
      // Clean query parameters from address bar immediately
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
              setStudentInfo({
                fullName: res.studentInfo.fullName || '',
                email: res.studentInfo.email || '',
                whatsapp: res.studentInfo.whatsapp || ''
              });
            }
            setPaymentStatus('completed');
            setCheckoutStep(3);

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
  }, [showToast]);

  // Update student field in memory
  const updateStudentField = useCallback((field, value) => {
    setStudentInfo((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Open Checkout Drawer cleanly for the selected tier
  const openCheckout = useCallback((tierId = 'pro') => {
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

  // Cancel / Close checkout drawer
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

  // Step 1 Submission: Instant validation and immediate transition to Step 2
  const submitStep1 = useCallback((formData, explicitTierId) => {
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

    // 2. Instant Client Validation (0ms delay)
    if (!validateName(fullName)) {
      showToast('Please enter a valid student full name.', 'error');
      return false;
    }
    if (!validateEmail(email)) {
      showToast('Please enter a valid email address (e.g. name@domain.com).', 'error');
      return false;
    }
    if (!validatePhone(whatsapp)) {
      showToast('Please enter a valid phone number (at least 10 digits).', 'error');
      return false;
    }

    // 3. Duplicate Block Guard
    if (isUserExist) {
      showToast('User Exist', 'error');
      return false;
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

    logSecurityEvent('STEP1_COMPLETED', {
      transactionId: currentTxnId,
      tierId: activeTierId,
      email
    });

    // Instant transition to payment breakdown (0ms delay)
    setCheckoutStep(2);
    return true;
  }, [transactionId, selectedTierId, isUserExist, showToast]);

  // Step 2 Submission: Payment Execution with Database Duplicate Guard
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

    // Live Database Duplicate Guard
    if (isUserExist) {
      showToast('User Exist', 'error');
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
      // Initiate payment with backend — checks MongoDB and creates Paystack session
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
        if (initResult.error === 'User Exist') {
          setIsUserExist(true);
        }
        showToast(initResult.error || 'Payment initialization failed. Please try again.', 'error');
        return false;
      }

      // Live Paystack: redirect browser to hosted payment page
      if (!initResult.mock && initResult.authorizationUrl) {
        window.location.href = initResult.authorizationUrl;
        return true;
      }

      // Mock mode fallback: verify immediately
      const confirmTxnId = initResult.transactionId || transactionId;
      const verifyResult = await verifyPayment(confirmTxnId, {
        tierId: activeTierId,
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
  }, [isOnline, selectedTierId, transactionId, sessionId, studentInfo, isUserExist, showToast]);

  // Restart / Reset checkout cleanly
  const resetCheckout = useCallback(() => {
    setCheckoutStep(1);
    setPaymentStatus('idle');
    setPaymentResult(null);
    setStudentInfo({ fullName: '', email: '', whatsapp: '' });
    setIsUserExist(false);
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
    duplicateCheck: { isDuplicate: isUserExist, reason: isUserExist ? 'User Exist' : null },
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
