/**
 * Resilient storage manager for session persistence and abandoned lead capture.
 */

const KEYS = {
  SESSION_ID: 'todd_session_id',
  CHECKOUT_STATE: 'todd_checkout_state',
  ABANDONED_LEAD: 'todd_abandoned_lead',
  TRANSACTION_HISTORY: 'todd_transaction_history'
};

export function getSessionStorage(key, fallback = null) {
  try {
    if (typeof window === 'undefined') return fallback;
    const data = window.sessionStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (err) {
    console.warn(`Storage read error for session key: ${key}`, err);
    return fallback;
  }
}

export function setSessionStorage(key, value) {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Storage write error for session key: ${key}`, err);
  }
}

export function removeSessionStorage(key) {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(key);
  } catch (err) {
    console.warn(`Storage delete error for session key: ${key}`, err);
  }
}

export function getLocalStorage(key, fallback = null) {
  try {
    if (typeof window === 'undefined') return fallback;
    const data = window.localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (err) {
    console.warn(`Storage read error for local key: ${key}`, err);
    return fallback;
  }
}

export function setLocalStorage(key, value) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Storage write error for local key: ${key}`, err);
  }
}

/**
 * Persists active checkout state for session resilience
 */
export function saveCheckoutSession(state) {
  setSessionStorage(KEYS.CHECKOUT_STATE, {
    ...state,
    lastUpdated: new Date().toISOString()
  });
}

export function loadCheckoutSession() {
  return getSessionStorage(KEYS.CHECKOUT_STATE, null);
}

/**
 * Caches student inputs in real-time to preserve leads even on abandonment
 */
export function saveAbandonedLead(lead) {
  setLocalStorage(KEYS.ABANDONED_LEAD, {
    ...lead,
    capturedAt: new Date().toISOString()
  });
}

export function loadAbandonedLead() {
  return getLocalStorage(KEYS.ABANDONED_LEAD, null);
}

/**
 * Stores verified transaction record
 */
export function recordCompletedTransaction(transactionRecord) {
  const history = getLocalStorage(KEYS.TRANSACTION_HISTORY, []);
  history.push(transactionRecord);
  setLocalStorage(KEYS.TRANSACTION_HISTORY, history);
}

/**
 * Retrieves all verified completed transaction records
 */
export function getCompletedTransactions() {
  return getLocalStorage(KEYS.TRANSACTION_HISTORY, []);
}

export { KEYS };
