/**
 * Webhook router.
 *
 * POST /api/webhook/paystack — Primary Paystack server-to-server webhook
 * POST /api/webhook/stripe   — Fallback webhook endpoint
 *
 * Both routes receive raw Buffer bodies (via express.raw() in index.js)
 * for cryptographic HMAC verification before event processing.
 */

import { Router } from 'express';
import { verifyWebhookSignature } from '../services/paystack.js';
import {
  insertEnrollment,
  findEnrollmentByReference,
  findEnrollmentByTransactionId
} from '../services/database.js';
import { sendEnrollmentConfirmation } from '../services/email.js';
import {
  resolveTier,
  normalizeEmail,
  normalizePhone,
  sanitize,
  logEvent
} from '../utils/security.js';
import { generateReceiptNumber } from '../utils/ids.js';

const router = Router();

// ── POST /api/webhook/paystack ────────────────────────────────────────────────
router.post('/paystack', async (req, res) => {
  // Paystack requires immediate 200 acknowledgment before background processing
  res.sendStatus(200);

  try {
    const signature = req.headers['x-paystack-signature'];
    const rawBody = req.body;

    // 1. HMAC-SHA512 Signature Verification
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logEvent('PAYSTACK_WEBHOOK_SIGNATURE_INVALID', { signature: signature?.slice(0, 12) });
      return;
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      logEvent('PAYSTACK_WEBHOOK_PARSE_ERROR');
      return;
    }

    logEvent('PAYSTACK_WEBHOOK_RECEIVED', { event: event.event, reference: event.data?.reference });

    // 2. Only process charge.success events
    if (event.event !== 'charge.success') {
      return;
    }

    const data = event.data;
    const reference = data?.reference;
    if (!reference) return;

    // 3. Idempotency guard — skip if already saved
    const existing = await findEnrollmentByReference(reference)
      || await findEnrollmentByTransactionId(reference);
    if (existing) {
      logEvent('PAYSTACK_WEBHOOK_DUPLICATE_SKIPPED', { reference, receipt: existing.receiptNumber });
      return;
    }

    // 4. Resolve tier
    const metadata = data.metadata || {};
    const tierId = metadata.tierId || 'pro';
    const tier = resolveTier(tierId);
    if (!tier) {
      logEvent('PAYSTACK_WEBHOOK_TIER_UNKNOWN', { reference, tierId });
      return;
    }

    const fullName       = sanitize(metadata.fullName || 'Student');
    const email          = data.customer?.email || metadata.email || '';
    const whatsapp       = sanitize(metadata.whatsapp || '');
    const sessionId      = sanitize(metadata.sessionId || 'unknown');
    const transactionId  = metadata.transactionId || reference;
    const paidAt         = data.paid_at ? new Date(data.paid_at) : new Date();
    const receiptNumber  = generateReceiptNumber();

    const emailCanonical = normalizeEmail(email);
    const whatsappDigits = normalizePhone(whatsapp);

    // 5. Persist confirmed enrollment into MongoDB
    await insertEnrollment({
      sessionId,
      transactionId,
      paystackReference: reference,
      receiptNumber,
      tierId: tier.id,
      tierName: tier.name,
      amountPaid: tier.price,
      currency: 'NGN',
      fullName,
      email,
      emailCanonical,
      whatsapp,
      whatsappDigits,
      paymentMethod: 'paystack',
      status: 'completed',
      paidAt
    });

    // 6. Dispatch confirmation email with receipt, WhatsApp community link, and tier perks
    await sendEnrollmentConfirmation({
      toEmail: email,
      toName: fullName,
      whatsapp,
      tier,
      tierName: tier.name,
      transactionId,
      receiptNumber,
      amountPaid: tier.price,
      paidAt,
      whatsappInviteUrl: process.env.WHATSAPP_INVITE_URL || 'https://chat.whatsapp.com/invite/olatunde-masterclass-2026'
    });

    logEvent('PAYSTACK_WEBHOOK_ENROLLMENT_CONFIRMED', {
      transactionId,
      receiptNumber,
      tierId: tier.id
    });
  } catch (err) {
    console.error('[Paystack Webhook] Processing error:', err.message);
    logEvent('PAYSTACK_WEBHOOK_PROCESSING_ERROR', { error: err.message });
  }
});

export default router;
