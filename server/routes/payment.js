/**
 * Payment routes.
 *
 * POST /api/payment/initiate                — Start a Paystack checkout session
 * POST /api/payment/create-checkout-session — Alias for compatibility
 * GET  /api/payment/verify/:reference        — Verify a completed payment by reference
 * GET  /api/payment/verify-session/:sessionId — Alias for session verify
 */

import { Router } from 'express';
import { generateTransactionId, generateReceiptNumber } from '../utils/ids.js';
import {
  initiatePaystackTransaction,
  verifyPaystackTransaction
} from '../services/paystack.js';
import {
  insertEnrollment,
  findEnrollmentByEmail,
  findEnrollmentByPhone,
  findEnrollmentByReference,
  findEnrollmentByTransactionId
} from '../services/database.js';
import { sendEnrollmentConfirmation } from '../services/email.js';
import {
  resolveTier,
  normalizeEmail,
  normalizePhone,
  validateEmail,
  validatePhone,
  validateName,
  sanitize,
  logEvent
} from '../utils/security.js';

const router = Router();

/**
 * Initiates payment session with Paystack
 */
async function handleInitiate(req, res) {
  try {
    const { tierId, fullName, email, whatsapp, sessionId, clientTransactionId } = req.body;

    // 1. Input validation
    if (!validateName(fullName)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid full name.' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address (e.g. @gmail.com or @yahoo.com).' });
    }
    if (!validatePhone(whatsapp)) {
      return res.status(400).json({ success: false, error: 'Phone number must be 11 digits.' });
    }

    // 2. Tier resolution — enforce immutable server-side pricing
    const tier = resolveTier(tierId);
    if (!tier) {
      return res.status(400).json({ success: false, error: 'Invalid tier selection.' });
    }

    const emailCanonical = normalizeEmail(email);
    const whatsappDigits = normalizePhone(whatsapp);

    // 3. Server-side duplicate enrollment guard against MongoDB
    const [existingByEmail, existingByPhone] = await Promise.all([
      findEnrollmentByEmail(emailCanonical),
      findEnrollmentByPhone(whatsappDigits)
    ]);

    if (existingByEmail) {
      logEvent('DUPLICATE_EMAIL_BLOCKED', { email: emailCanonical, existingReceipt: existingByEmail.receiptNumber });
      return res.status(409).json({
        success: false,
        error: 'User Exist',
        code: 'DUPLICATE_EMAIL',
        existingReceipt: existingByEmail.receiptNumber
      });
    }

    if (existingByPhone) {
      logEvent('DUPLICATE_PHONE_BLOCKED', { whatsappDigits: whatsappDigits.slice(-4), existingReceipt: existingByPhone.receiptNumber });
      return res.status(409).json({
        success: false,
        error: 'User Exist',
        code: 'DUPLICATE_PHONE',
        existingReceipt: existingByPhone.receiptNumber
      });
    }

    // 4. Sequential Transaction ID for receipts & audit
    const transactionId = clientTransactionId?.startsWith('TXN-')
      ? clientTransactionId
      : generateTransactionId();

    // Generate guaranteed unique reference for Paystack gateway to avoid collision
    const paystackReference = `${transactionId}_${Date.now().toString(36)}`;

    const frontendUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
    const callbackUrl = `${frontendUrl}/?reference=${encodeURIComponent(paystackReference)}&status=success`;

    // 5. Initiate Paystack transaction
    const paystackResult = await initiatePaystackTransaction({
      email: email.trim().toLowerCase(),
      amountNGN: tier.price,
      reference: paystackReference,
      metadata: {
        transactionId,
        paystackReference,
        sessionId: sanitize(sessionId || 'unknown'),
        tierId: tier.id,
        tierName: tier.name,
        fullName: sanitize(fullName),
        whatsapp: sanitize(whatsapp),
        email: email.trim().toLowerCase()
      },
      callbackUrl
    });

    logEvent('PAYMENT_INITIATED', {
      transactionId,
      tierId: tier.id,
      amount: tier.price,
      mock: paystackResult.mock
    });

    return res.json({
      success: true,
      transactionId,
      mock: paystackResult.mock,
      authorizationUrl: paystackResult.authorizationUrl,
      message: paystackResult.mock
        ? 'Mock payment ready. No redirect needed — verify directly to complete.'
        : 'Paystack payment session created. Redirect student to authorizationUrl.'
    });
  } catch (err) {
    console.error('[Payment/initiate] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

router.post('/initiate', handleInitiate);
router.post('/create-checkout-session', handleInitiate);

// ── POST /api/payment/validate-student ────────────────────────────────────────
router.post('/validate-student', async (req, res) => {
  try {
    const { fullName, email, whatsapp } = req.body;

    if (!validateName(fullName)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid full name.' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Email must include a valid domain (e.g. @gmail.com or @yahoo.com).'
      });
    }
    if (!validatePhone(whatsapp)) {
      return res.status(400).json({
        success: false,
        error: 'Phone number must be 11 digits.'
      });
    }

    const emailCanonical = normalizeEmail(email);
    const whatsappDigits = normalizePhone(whatsapp);

    // Duplicate check
    const [existingByEmail, existingByPhone] = await Promise.all([
      findEnrollmentByEmail(emailCanonical),
      findEnrollmentByPhone(whatsappDigits)
    ]);

    if (existingByEmail || existingByPhone) {
      return res.status(409).json({ success: false, error: 'User Exist' });
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Verifies a completed payment by its reference / transactionId
 */
async function handleVerify(req, res) {
  try {
    const reference = req.params.reference || req.params.sessionId;
    if (!reference) {
      return res.status(400).json({ success: false, error: 'Transaction reference is required.' });
    }

    // 1. Check if this reference is already in MongoDB (idempotency)
    const existing = await findEnrollmentByReference(reference)
      || await findEnrollmentByTransactionId(reference);

    if (existing) {
      logEvent('PAYMENT_VERIFY_ALREADY_PROCESSED', { reference, receipt: existing.receiptNumber });
      return res.json({
        success: true,
        alreadyProcessed: true,
        receiptNumber: existing.receiptNumber,
        transactionId: existing.transactionId,
        tier: { id: existing.tierId, name: existing.tierName },
        studentInfo: {
          fullName: existing.fullName,
          email: existing.email,
          whatsapp: existing.whatsapp
        },
        paidAt: existing.paidAt
      });
    }

    // 2. Verify with Paystack
    const verification = await verifyPaystackTransaction(reference);
    if (!verification.success) {
      return res.status(402).json({
        success: false,
        error: 'Payment not confirmed. Please contact support if you were debited.',
        reason: verification.reason
      });
    }

    const paystackData = verification.data || {};
    const metadata = paystackData.metadata || {};
    const tierId = metadata.tierId || req.query.tierId || 'pro';
    const tier = resolveTier(tierId);

    if (!tier) {
      return res.status(400).json({ success: false, error: 'Cannot resolve masterclass tier.' });
    }

    const fullName       = sanitize(metadata.fullName || req.query.fullName || 'Student');
    const email          = paystackData.customer?.email || metadata.email || req.query.email || '';
    const whatsapp       = sanitize(metadata.whatsapp || req.query.whatsapp || '');
    const sessionId      = sanitize(metadata.sessionId || 'unknown');
    const transactionId  = metadata.transactionId || reference;
    const paidAt         = paystackData.paid_at ? new Date(paystackData.paid_at) : new Date();

    const emailCanonical = normalizeEmail(email);
    const whatsappDigits = normalizePhone(whatsapp);
    const receiptNumber  = generateReceiptNumber();

    // 3. Persist enrollment into MongoDB
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

    // 4. Send confirmation email with receipt, WhatsApp community link, and tier perks
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

    logEvent('PAYSTACK_ENROLLMENT_CONFIRMED', { transactionId, receiptNumber, tierId: tier.id });

    return res.json({
      success: true,
      alreadyProcessed: false,
      receiptNumber,
      transactionId,
      tier: { id: tier.id, name: tier.name },
      studentInfo: { fullName, email, whatsapp },
      paidAt: paidAt.toISOString()
    });
  } catch (err) {
    console.error('[Payment/verify] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

router.get('/verify/:reference', handleVerify);
router.get('/verify-session/:sessionId', handleVerify);

export default router;
