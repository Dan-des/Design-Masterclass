/**
 * Server-side sequential ID generators.
 * These are completely independent of the client-side generators in
 * src/utils/crypto.js — they use an in-memory counter seeded from the
 * database at startup. For multi-instance deployments, move the counter
 * into a dedicated MongoDB collection or Redis.
 */

// In-memory counters (survive restarts via DB seed — see initCounters())
let txnCounter = 0;
let rcpCounter = 0;
let tckCounter = 0;

function pad(n) {
  return String(n).padStart(5, '0');
}

export function generateTransactionId() {
  txnCounter += 1;
  return `TXN-${pad(txnCounter)}`;
}

export function generateReceiptNumber() {
  rcpCounter += 1;
  return `RCP-${pad(rcpCounter)}`;
}

export function generateTicketId() {
  tckCounter += 1;
  return `TCK-${pad(tckCounter)}`;
}

/**
 * Seeds the in-memory counters from the database on server start.
 * Call this once after the database connection is established.
 * Prevents ID collisions across server restarts.
 *
 * @param {object} db  - Mongoose models or raw count queries
 */
export async function initCounters(Enrollment, SupportTicket) {
  try {
    const [enrollmentCount, ticketCount] = await Promise.all([
      Enrollment.countDocuments(),
      SupportTicket.countDocuments()
    ]);
    txnCounter = enrollmentCount;
    rcpCounter = enrollmentCount;
    tckCounter = ticketCount;
    console.log(`[IDs] Counters seeded — TXN/RCP: ${enrollmentCount}, TCK: ${ticketCount}`);
  } catch (err) {
    console.warn('[IDs] Counter seeding failed, starting from 0:', err.message);
  }
}
