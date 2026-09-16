/**
 * Security, sanitization, and pricing integrity guard.
 * Strictly prevents client-side price tampering and validates student payloads.
 */

export const TIERS = Object.freeze({
  starter: {
    id: 'starter',
    badge: 'STARTER OFFER',
    name: 'Starter Edition',
    price: 200,
    originalPrice: 200,
    discount: 0,
    currency: 'NGN',
    symbol: '₦',
    softwareScope: 'Photoshop and Camera Raw only',
    description: 'Essential foundation for image manipulation and raw photographic grading.',
    perks: [
      'Adobe Photoshop Fundamentals & Workflow',
      'Camera Raw Color Correction & Color Grading',
      'Basic Asset Organization Templates',
      'Standard Resolution Export Workflows',
      'Standard Email Support'
    ],
    excludedPerks: [
      'Full Adobe Suite & Figma Access',
      'Commercial Brand Identity System Files',
      'Direct WhatsApp Mentor Access',
      'Weekly Live Portfolio Review Sessions',
      'Commercial Client Contract & Pitch Deck Templates'
    ]
  },
  pro: {
    id: 'pro',
    badge: 'MOST POPULAR - ₦150 OFF',
    name: 'Best Value Masterclass',
    price: 350,
    originalPrice: 500,
    discount: 150,
    currency: 'NGN',
    symbol: '₦',
    softwareScope: 'Full Adobe Creative Cloud (Photoshop, Illustrator, InDesign, After Effects) & Figma',
    description: 'Comprehensive commercial mastery covering full identity systems, advanced typography, and commercial client workflows.',
    perks: [
      'Full Adobe Suite (Photoshop, Illustrator, InDesign, After Effects) & Figma Mastery',
      'Commercial Brand Identity & Vector System Creation',
      'Complete Raw Project Source Files & Layered Vector Assets',
      'Immediate Access to Exclusive WhatsApp Mentorship Community',
      'Commercial Client Onboarding & Proposal Pitch Templates',
      'Weekly Live Portfolio Critique with Olatunde Daniel',
      'Lifetime Access to All 2026 Curriculum Updates'
    ],
    excludedPerks: []
  }
});

/**
 * Validates offer tier and enforces immutable server-side pricing.
 * Rejects any manual client injection of custom amounts.
 */
export function resolveTierPricing(tierId, clientReportedPrice = null) {
  const tier = TIERS[tierId];
  if (!tier) {
    return {
      isValid: false,
      error: `Invalid tier identifier "${tierId}". Access denied.`,
      tier: null,
      price: null
    };
  }

  if (clientReportedPrice !== null && Number(clientReportedPrice) !== tier.price) {
    const errorMsg = `Security Alert: Price manipulation attempt detected. Reported: ${clientReportedPrice}, Expected: ${tier.price}`;
    console.error(errorMsg);
    return {
      isValid: false,
      error: 'Transaction halted: Price payload tampering detected.',
      tier,
      price: tier.price
    };
  }

  return {
    isValid: true,
    error: null,
    tier,
    price: tier.price
  };
}

/**
 * Sanitizes string input to prevent XSS or script injection
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // remove brackets
    .slice(0, 500); // limit reasonable length
}

/**
 * RFC-compliant email validation
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

/**
 * Phone number validation (accepts Nigerian and international phone numbers)
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Validates numbers like +2348012345678, 08012345678, +1234567890
  const re = /^\+?[0-9]{8,15}$/;
  return re.test(cleaned);
}

/**
 * Student name validation
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 80 && /^[a-zA-Z\s.'-]+$/.test(trimmed);
}

/**
 * Support message validation
 */
export function validateMessage(message) {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim();
  return trimmed.length >= 10 && trimmed.length <= 2000;
}

/**
 * Generic debounce utility
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * System configuration verification and runtime logging
 */
export function validateAppConfig(config = {}) {
  const requiredKeys = ['COURSE_TITLE', 'INSTRUCTOR_NAME', 'CURRENCY', 'WHATSAPP_INVITE_URL'];
  const missing = requiredKeys.filter((key) => !config[key]);

  if (missing.length > 0) {
    console.warn(`System Warning: Missing configuration keys: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

/**
 * Local debug error logger for observability
 */
const debugLogs = [];
export function logSecurityEvent(event, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    data
  };
  debugLogs.push(entry);
  if (debugLogs.length > 100) debugLogs.shift();
  // Safe console notification for observability
  console.info(`[Audit Log] ${event}`, data);
}

export function getDebugLogs() {
  return [...debugLogs];
}

/**
 * Normalizes phone numbers to standard digit representation for comparison
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Normalizes email addresses, with canonical Gmail dot/tag handling
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.toLowerCase().trim();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return trimmed;
  const [user, domain] = parts;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Gmail ignores dots and strings after plus tag
    const cleanUser = user.replace(/\./g, '').split('+')[0];
    return `${cleanUser}@gmail.com`;
  }
  return trimmed;
}

/**
 * Checks whether an enrollment already exists for this email & name combination OR phone number
 */
export function checkDuplicateEnrollment(studentInfo, transactionHistory = []) {
  if (!studentInfo) return { isDuplicate: false, reason: null };

  const rawName = (studentInfo.fullName || '').toLowerCase().trim();
  const inputNameCanonical = rawName.replace(/[^a-z0-9]/g, '');
  const inputEmail = normalizeEmail(studentInfo.email);
  const inputPhoneDigits = normalizePhone(studentInfo.whatsapp);

  if (!inputEmail && !inputPhoneDigits && !inputNameCanonical) {
    return { isDuplicate: false, reason: null };
  }

  for (const record of transactionHistory) {
    const existing = record.studentInfo || {};
    const existingNameRaw = (existing.fullName || '').toLowerCase().trim();
    const existingNameCanonical = existingNameRaw.replace(/[^a-z0-9]/g, '');
    const existingEmail = normalizeEmail(existing.email);
    const existingPhoneDigits = normalizePhone(existing.whatsapp);

    // 1. Same Gmail/Email AND Name combination
    const isEmailMatch = Boolean(inputEmail && existingEmail && inputEmail === existingEmail);
    const isNameMatch = Boolean(
      inputNameCanonical &&
      existingNameCanonical &&
      (inputNameCanonical === existingNameCanonical ||
        rawName === existingNameRaw)
    );
    const isEmailAndNameMatch = isEmailMatch && isNameMatch;

    // 2. Same Phone Number (comparing full digits or last 10 digits to match local/international prefixes)
    const isPhoneMatch = Boolean(
      inputPhoneDigits &&
      existingPhoneDigits &&
      (inputPhoneDigits === existingPhoneDigits ||
        (inputPhoneDigits.length >= 10 &&
          existingPhoneDigits.length >= 10 &&
          inputPhoneDigits.slice(-10) === existingPhoneDigits.slice(-10)))
    );

    if (isEmailAndNameMatch || isPhoneMatch) {
      const matchReason = isEmailAndNameMatch && isPhoneMatch
        ? 'Matching student email, name, and phone number'
        : isEmailAndNameMatch
        ? 'Matching student email and name combination'
        : 'Matching WhatsApp phone number';

      return {
        isDuplicate: true,
        reason: matchReason,
        matchedTransactionId: record.transactionId,
        matchedReceiptNumber: record.receiptNumber,
        enrolledTierName: record.tier?.name || 'Masterclass',
        paidAt: record.paidAt
      };
    }
  }

  return { isDuplicate: false, reason: null };
}

/**
 * Rate Limiting Configuration
 * Lockout after 5 uncompleted requests
 */
export const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 30 * 1000, // 30 seconds lockout
  WINDOW_MS: 10 * 60 * 1000 // 10 minutes sliding window
};

export const RATE_LIMIT_STORAGE_KEY = 'od_rate_limit_state';

/**
 * Retrieves the current rate limit and lockout state
 */
export function getRateLimitStatus() {
  if (typeof window === 'undefined') {
    return { isLocked: false, remainingMs: 0, attempts: 0, maxAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS };
  }

  try {
    const raw = window.localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) {
      return { isLocked: false, remainingMs: 0, attempts: 0, maxAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS };
    }

    const state = JSON.parse(raw);
    const now = Date.now();

    // Check if lockout is currently active
    if (state.lockedUntil && now < state.lockedUntil) {
      return {
        isLocked: true,
        remainingMs: state.lockedUntil - now,
        attempts: state.attempts || RATE_LIMIT_CONFIG.MAX_ATTEMPTS,
        maxAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS
      };
    }

    // Check if window has expired
    if (state.firstAttemptAt && now - state.firstAttemptAt > RATE_LIMIT_CONFIG.WINDOW_MS) {
      window.localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
      return { isLocked: false, remainingMs: 0, attempts: 0, maxAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS };
    }

    // Lockout expired
    if (state.lockedUntil && now >= state.lockedUntil) {
      window.localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
      return { isLocked: false, remainingMs: 0, attempts: 0, maxAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS };
    }

    return {
      isLocked: false,
      remainingMs: 0,
      attempts: state.attempts || 0,
      maxAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS
    };
  } catch {
    return { isLocked: false, remainingMs: 0, attempts: 0, maxAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS };
  }
}

/**
 * Records an uncompleted checkout request attempt
 */
export function recordCheckoutAttempt() {
  if (typeof window === 'undefined') {
    return { isLocked: false, remainingMs: 0, attempts: 1, maxAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS };
  }

  try {
    const now = Date.now();
    const raw = window.localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    let state = raw ? JSON.parse(raw) : { attempts: 0, firstAttemptAt: now, lockedUntil: null };

    // If already locked and still within lockout
    if (state.lockedUntil && now < state.lockedUntil) {
      return {
        isLocked: true,
        remainingMs: state.lockedUntil - now,
        attempts: state.attempts,
        maxAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS
      };
    }

    // Reset if window expired
    if (state.firstAttemptAt && now - state.firstAttemptAt > RATE_LIMIT_CONFIG.WINDOW_MS) {
      state = { attempts: 0, firstAttemptAt: now, lockedUntil: null };
    }

    state.attempts = (state.attempts || 0) + 1;
    if (!state.firstAttemptAt) state.firstAttemptAt = now;

    // Check if threshold exceeded (5 repeated uncompleted attempts)
    if (state.attempts >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
      state.lockedUntil = now + RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS;
      window.localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(state));
      logSecurityEvent('RATE_LIMIT_LOCKOUT_TRIGGERED', {
        attempts: state.attempts,
        durationMs: RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS
      });
      return {
        isLocked: true,
        remainingMs: RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS,
        attempts: state.attempts,
        maxAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS
      };
    }

    window.localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(state));
    return {
      isLocked: false,
      remainingMs: 0,
      attempts: state.attempts,
      maxAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS
    };
  } catch {
    return { isLocked: false, remainingMs: 0, attempts: 1, maxAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS };
  }
}

/**
 * Resets the uncompleted request counter (called upon successful payment)
 */
export function resetRateLimit() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Formats milliseconds into MM:SS string
 */
export function formatRemainingCooldown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
