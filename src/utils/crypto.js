/**
 * Cryptographic identifier and sequential token utilities.
 * Deterministic, sequential identifier generation starting from 00001.
 */

const COUNTER_KEYS = {
  SESSION_SEQ: 'od_session_seq',
  TXN_SEQ: 'od_txn_seq',
  RCP_SEQ: 'od_rcp_seq',
  TCK_SEQ: 'od_tck_seq'
};

function getNextSequence(key, prefix = '', padLength = 5) {
  try {
    if (typeof window === 'undefined') {
      return prefix ? `${prefix}-00001` : '00001';
    }
    const currentStr = window.localStorage.getItem(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    const next = current + 1;
    window.localStorage.setItem(key, String(next));
    const padded = String(next).padStart(padLength, '0');
    return prefix ? `${prefix}-${padded}` : padded;
  } catch {
    return prefix ? `${prefix}-00001` : '00001';
  }
}

export function generateSessionId() {
  return getNextSequence(COUNTER_KEYS.SESSION_SEQ, 'SES', 5);
}

export function generateTransactionId() {
  return getNextSequence(COUNTER_KEYS.TXN_SEQ, 'TXN', 5);
}

export function generateReceiptNumber() {
  return getNextSequence(COUNTER_KEYS.RCP_SEQ, 'RCP', 5);
}

export function generateTicketId() {
  return getNextSequence(COUNTER_KEYS.TCK_SEQ, 'TCK', 5);
}

export function generateTimestamp() {
  return new Date().toISOString();
}

export function formatNaira(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(amount).replace('NGN', '₦').trim();
}
