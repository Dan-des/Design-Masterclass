/**
 * Support ticket route.
 *
 * POST /api/support/ticket
 */

import { Router } from 'express';
import { insertSupportTicket } from '../services/database.js';
import { sendSupportAcknowledgment } from '../services/email.js';
import {
  validateEmail,
  validateName,
  sanitize,
  logEvent
} from '../utils/security.js';
import { generateTicketId } from '../utils/ids.js';

const router = Router();

// ── POST /api/support/ticket ──────────────────────────────────────────────────
router.post('/ticket', async (req, res) => {
  try {
    const { fullName, email, message, sessionId, transactionId } = req.body;

    // Input validation
    if (!validateName(fullName)) {
      return res.status(400).json({ success: false, error: 'Invalid name provided.' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address.' });
    }
    const cleanMessage = sanitize(message || '', 2000);
    if (!cleanMessage || cleanMessage.length < 10) {
      return res.status(400).json({ success: false, error: 'Message must be at least 10 characters.' });
    }

    const ticketId = generateTicketId();

    // Persist ticket
    await insertSupportTicket({
      ticketId,
      sessionId: sanitize(sessionId || ''),
      transactionId: sanitize(transactionId || ''),
      fullName: sanitize(fullName),
      email: email.trim().toLowerCase(),
      message: cleanMessage
    });

    // Send acknowledgment email
    await sendSupportAcknowledgment({
      toEmail: email,
      toName: sanitize(fullName),
      ticketId,
      message: cleanMessage
    });

    logEvent('SUPPORT_TICKET_CREATED', { ticketId, email });

    return res.json({
      success: true,
      ticketId,
      submittedAt: new Date().toISOString(),
      message: 'Ticket received. Support will reach out via email within 24 hours.'
    });
  } catch (err) {
    console.error('[Support/ticket] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to submit ticket. Please try again.' });
  }
});

export default router;
