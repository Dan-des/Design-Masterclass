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
  findEnrollmentByTransactionId,
  findEnrollmentByReceiptNumber
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

// ── POST /api/payment/check-user ──────────────────────────────────────────────
router.post('/check-user', async (req, res) => {
  try {
    const { email, whatsapp } = req.body;
    const emailCanonical = email ? normalizeEmail(email) : '';
    const whatsappDigits = whatsapp ? normalizePhone(whatsapp) : '';

    let existingByEmail = null;
    let existingByPhone = null;

    if (emailCanonical && validateEmail(email)) {
      existingByEmail = await findEnrollmentByEmail(emailCanonical);
    }
    if (whatsappDigits && validatePhone(whatsapp)) {
      existingByPhone = await findEnrollmentByPhone(whatsappDigits);
    }

    if (existingByEmail || existingByPhone) {
      return res.json({
        exists: true,
        reason: existingByEmail ? 'email' : 'phone',
        error: 'User Exist'
      });
    }

    return res.json({ exists: false });
  } catch (err) {
    return res.status(500).json({ exists: false, error: err.message });
  }
});

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

/**
 * Serves a printable HTML receipt by receiptNumber
 */
async function handleReceiptView(req, res) {
  try {
    const { receiptNumber } = req.params;
    const enrollment = await findEnrollmentByReceiptNumber(receiptNumber);

    if (!enrollment) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <title>Receipt Not Found</title>
          <style>body { font-family: Arial, sans-serif; text-align: center; padding: 60px 20px; background: #0a0a0a; color: #fff; }</style>
        </head>
        <body>
          <h2 style="color: #f87171;">Receipt Not Found</h2>
          <p style="color: #888;">We could not locate an enrollment record for receipt <strong>${receiptNumber}</strong>.</p>
        </body>
        </html>
      `);
    }

    const formattedDate = new Date(enrollment.paidAt || enrollment.createdAt).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const tier = resolveTier(enrollment.tierId) || {
      name: enrollment.tierName,
      softwareScope: 'Full Masterclass Curriculum',
      perks: ['Full Masterclass Access', 'VIP Mentorship WhatsApp Group Access', 'Raw Project Assets Vault']
    };

    const perksHtml = (tier.perks || [])
      .map((p) => `<li style="padding: 3px 0;">${p}</li>`)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Receipt ${enrollment.receiptNumber} - Olatunde Daniel Masterclass</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #f4f4f5;
    color: #111;
    margin: 0;
    padding: 24px;
    display: flex;
    justify-content: center;
  }
  .receipt-wrapper {
    width: 100%;
    max-width: 600px;
  }
  .receipt-paper {
    background: #fff;
    padding: 32px 28px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    border: 1px solid #e4e4e7;
  }
  .no-print {
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .btn-print {
    background: #000;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    letter-spacing: 0.02em;
  }
  .btn-print:hover { background: #222; }
  .header {
    border-bottom: 2px solid #111;
    padding-bottom: 14px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .header h1 {
    margin: 0 0 3px;
    font-size: 17px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 800;
  }
  .header p {
    margin: 0;
    font-size: 11px;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .status-badge {
    display: inline-block;
    background: #111;
    color: #facc15;
    font-family: monospace;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }
  .card {
    border: 1px solid #e4e4e7;
    background: #fafafa;
    padding: 12px;
    border-radius: 6px;
  }
  .card-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    color: #71717a;
    margin-bottom: 6px;
    font-family: monospace;
  }
  .info-row {
    font-size: 11px;
    margin-bottom: 4px;
    display: flex;
    justify-content: space-between;
  }
  .info-row span:first-child { color: #71717a; }
  .info-row span:last-child { font-weight: 600; color: #111; text-align: right; }
  .table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 11px;
  }
  .table th {
    background: #f4f4f5;
    text-align: left;
    padding: 7px 8px;
    border-bottom: 1px solid #111;
    font-family: monospace;
    text-transform: uppercase;
    font-size: 10px;
  }
  .table td {
    padding: 8px;
    border-bottom: 1px solid #e4e4e7;
  }
  .table tr.total-row td {
    border-top: 2px solid #111;
    border-bottom: none;
    font-weight: 800;
    font-size: 13px;
  }
  .footer {
    border-top: 1px solid #e4e4e7;
    padding-top: 14px;
    text-align: center;
    font-size: 10px;
    color: #71717a;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .receipt-paper { box-shadow: none; border: none; max-width: 100%; padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="receipt-wrapper">
  <div class="no-print">
    <span style="font-size: 12px; color: #555;">Official Masterclass Receipt</span>
    <button onclick="window.print()" class="btn-print">
      Print / Save PDF
    </button>
  </div>
  <div class="receipt-paper">
    <div class="header">
      <div>
        <h1>Olatunde Daniel</h1>
        <p>Graphics Design Masterclass &bull; Official Payment Receipt</p>
      </div>
      <div style="text-align: right;">
        <span class="status-badge">Paid &amp; Verified</span>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">Student Information</div>
        <div class="info-row">
          <span>Full Name:</span>
          <span>${enrollment.fullName}</span>
        </div>
        <div class="info-row">
          <span>Email:</span>
          <span>${enrollment.email}</span>
        </div>
        <div class="info-row">
          <span>WhatsApp:</span>
          <span>${enrollment.whatsapp}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Transaction Audit</div>
        <div class="info-row">
          <span>Receipt No:</span>
          <span style="font-family: monospace;">${enrollment.receiptNumber}</span>
        </div>
        <div class="info-row">
          <span>Transaction ID:</span>
          <span style="font-family: monospace;">${enrollment.transactionId}</span>
        </div>
        <div class="info-row">
          <span>Date &amp; Time:</span>
          <span>${formattedDate}</span>
        </div>
        <div class="info-row">
          <span>Gateway:</span>
          <span>Paystack Verified</span>
        </div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Item Description</th>
          <th>Software Scope</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${enrollment.tierName}</strong><br />
            <span style="font-size: 10px; color: #71717a;">Complete Masterclass Cohort Access</span>
          </td>
          <td style="color: #555;">${tier.softwareScope || 'Full Masterclass Curriculum'}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700;">₦${enrollment.amountPaid.toLocaleString()} NGN</td>
        </tr>
        <tr class="total-row">
          <td colspan="2" style="text-transform: uppercase; font-family: monospace;">Total Amount Paid</td>
          <td style="text-align: right; font-family: monospace; font-size: 13px; color: #000;">₦${enrollment.amountPaid.toLocaleString()} NGN</td>
        </tr>
      </tbody>
    </table>

    <div style="background: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 10px 12px; margin-bottom: 20px;">
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; font-family: monospace; color: #111; margin-bottom: 5px;">
        Curriculum &amp; Community Perks Included:
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #555; line-height: 1.5;">
        ${perksHtml}
      </ul>
    </div>

    <div class="footer">
      Olatunde Daniel Graphics Design Masterclass &bull; Verified Digital Receipt &bull; ${enrollment.receiptNumber}
    </div>
  </div>
</div>
<script>
  if (new URLSearchParams(window.location.search).get('print') === 'true') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(() => window.print(), 250));
  }
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    console.error('[Receipt View] Error:', err.message);
    return res.status(500).send('Internal server error loading receipt.');
  }
}

router.get('/receipt/:receiptNumber', handleReceiptView);
router.get('/verify/:reference', handleVerify);
router.get('/verify-session/:sessionId', handleVerify);

export default router;

