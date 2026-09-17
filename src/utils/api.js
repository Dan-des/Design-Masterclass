/**
 * Frontend API client.
 * All calls go to the Express backend — no logic lives here,
 * just fetch wrappers with error normalisation.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Internal fetch helper — adds content-type, handles non-OK responses,
 * and always resolves to a consistent { success, ...data } shape.
 */
async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  const json = await res.json().catch(() => ({ success: false, error: 'Unexpected server response.' }));

  if (!res.ok && json.success !== false) {
    json.success = false;
    json.error = json.error || `Server error (${res.status})`;
  }
  return json;
}

// ── Payment ───────────────────────────────────────────────────────────────────

/**
 * Initiates a payment session with the backend.
 * In mock mode the server returns mock: true and no authorizationUrl.
 *
 * @param {object} params
 * @param {string} params.tierId
 * @param {string} params.fullName
 * @param {string} params.email
 * @param {string} params.whatsapp
 * @param {string} params.sessionId
 * @param {string} params.clientTransactionId  - Client-generated TXN ID
 * @returns {Promise<{ success: boolean, transactionId: string, mock: boolean, authorizationUrl?: string, error?: string }>}
 */
export async function initiatePayment({ tierId, fullName, email, whatsapp, sessionId, clientTransactionId }) {
  return apiFetch('/api/payment/initiate', {
    method: 'POST',
    body: JSON.stringify({ tierId, fullName, email, whatsapp, sessionId, clientTransactionId })
  });
}

/**
 * Checks live database if a user exists by email or whatsapp phone.
 */
export async function checkUserExists({ email, whatsapp }) {
  return apiFetch('/api/payment/check-user', {
    method: 'POST',
    body: JSON.stringify({ email, whatsapp })
  });
}

/**
 * Validates student credentials against backend criteria.
 */
export async function validateStudent({ fullName, email, whatsapp }) {
  return apiFetch('/api/payment/validate-student', {
    method: 'POST',
    body: JSON.stringify({ fullName, email, whatsapp })
  });
}

/**
 * Verifies a completed payment by its reference/transactionId.
 * Call this after the user returns from the Paystack hosted page,
 * or immediately after initiating in mock mode.
 *
 * @param {string} reference  - The transactionId / Paystack reference
 * @param {object} queryHints - Additional query params for mock mode resolution
 * @returns {Promise<{ success: boolean, receiptNumber: string, paidAt: string, tier: object, error?: string }>}
 */
export async function verifyPayment(reference, queryHints = {}) {
  const params = new URLSearchParams(queryHints).toString();
  const path = `/api/payment/verify/${encodeURIComponent(reference)}${params ? `?${params}` : ''}`;
  return apiFetch(path);
}

/**
 * Verifies a completed Stripe Checkout session by session_id.
 * Called automatically when student is redirected back from Stripe.
 *
 * @param {string} sessionId - The Stripe checkout session ID (cs_...)
 * @returns {Promise<{ success: boolean, receiptNumber: string, transactionId: string, paidAt: string, tier: object, studentInfo?: object, error?: string }>}
 */
export async function verifyStripeSession(sessionId) {
  return apiFetch(`/api/payment/verify-session/${encodeURIComponent(sessionId)}`);
}

// ── Support ───────────────────────────────────────────────────────────────────

/**
 * Submits a support ticket to the backend.
 *
 * @param {object} params
 * @returns {Promise<{ success: boolean, ticketId: string, submittedAt: string, error?: string }>}
 */
export async function submitSupportTicket({ fullName, email, message, sessionId, transactionId }) {
  return apiFetch('/api/support/ticket', {
    method: 'POST',
    body: JSON.stringify({ fullName, email, message, sessionId, transactionId })
  });
}

// ── Health ────────────────────────────────────────────────────────────────────

/**
 * Pings the server health endpoint.
 * Useful for checking connectivity on page load.
 */
export async function pingServer() {
  return apiFetch('/health');
}
