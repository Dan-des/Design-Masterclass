/**
 * Minimal storage manager.
 * User data and duplicate enrollment records are NEVER persisted in localStorage
 * so cache clearing has zero effect — all checks retrieve directly from the live database.
 */

const KEYS = {
  SESSION_ID: 'todd_session_id'
};

export function getSessionStorage(key, fallback = null) {
  try {
    if (typeof window === 'undefined') return fallback;
    const data = window.sessionStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (err) {
    return fallback;
  }
}

export function setSessionStorage(key, value) {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // ignore
  }
}

export function removeSessionStorage(key) {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(key);
  } catch (err) {
    // ignore
  }
}

/**
 * Completely purges all legacy local user data and test caches from the browser.
 */
export function purgeAllLegacyStorage() {
  try {
    if (typeof window === 'undefined') return;
    const keysToRemove = [
      'todd_abandoned_lead',
      'todd_transaction_history',
      'todd_checkout_state',
      'od_rate_limit_state'
    ];
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
      window.sessionStorage.removeItem(k);
    }
  } catch (err) {
    // ignore
  }
}

export { KEYS };
