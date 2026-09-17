/**
 * Email dispatch service supporting both Resend and Nodemailer (SMTP / Gmail App Password).
 *
 * Sends:
 * 1. To Student: Official enrollment receipt, WhatsApp community invite, purchased tier perks & appreciation sentence.
 * 2. To Student: Support ticket receipt and acknowledgment.
 * 3. To Owner (Daniel - workwithdan6@gmail.com): Instant notification with complete student purchase information from the checkout form.
 * 4. To Owner (Daniel): Instant notification when an inquiry/support ticket is submitted.
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { resolveTier } from '../utils/security.js';

const DEFAULT_SENDER = 'Olatunde Daniel <no-reply@mail.olatundedaniel.name.ng>';

function getSenderAddress() {
  const from = process.env.EMAIL_FROM || DEFAULT_SENDER;
  return from.includes('<') ? from : `Olatunde Daniel <${from}>`;
}

function getAdminEmail() {
  return process.env.ADMIN_NOTIFICATION_EMAIL || 'workwithdan6@gmail.com';
}

/**
 * Returns an active email client (Resend or Nodemailer) or null.
 */
function getEmailTransporter() {
  // 1. Check for Resend API key
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && resendKey.startsWith('re_')) {
    return {
      type: 'resend',
      client: new Resend(resendKey)
    };
  }

  // 2. Check for SMTP / Gmail App Password credentials
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'false' ? false : true,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    return {
      type: 'smtp',
      client: transporter
    };
  }

  return null;
}

/**
 * Helper to dispatch an email through either Resend or Nodemailer.
 */
async function sendMail({ from, to, subject, html }) {
  const driver = getEmailTransporter();

  if (!driver) {
    console.info('[Email Dispatcher] No active email driver (RESEND_API_KEY or SMTP_USER/PASS not configured).');
    console.info(`  [To: ${to}] Subject: "${subject}"`);
    return { success: true, method: 'console_stub' };
  }

  if (driver.type === 'resend') {
    const res = await driver.client.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      reply_to: getAdminEmail(),
      subject,
      html
    });
    if (res.error) {
      console.warn(`[Email Dispatcher] Resend API notice for ${to}:`, res.error.message);
      return { success: false, error: res.error.message, driver: 'resend' };
    }
    return { success: true, messageId: res.data?.id, driver: 'resend' };
  }

  if (driver.type === 'smtp') {
    const info = await driver.client.sendMail({
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      replyTo: getAdminEmail(),
      subject,
      html
    });
    return { success: true, messageId: info.messageId, driver: 'smtp' };
  }

  return { success: false, error: 'Unknown driver' };
}

/**
 * Sends enrollment confirmation to student and full purchase alert to owner.
 */
export async function sendEnrollmentConfirmation({
  toEmail,
  toName,
  whatsapp,
  tier,
  tierId,
  tierName,
  transactionId,
  receiptNumber,
  amountPaid,
  paidAt,
  whatsappInviteUrl
}) {
  const formattedDate = new Date(paidAt || Date.now()).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // 1. Resolve exact tier from authoritative source of truth
  let resolvedTier = tier;
  if (!resolvedTier || !resolvedTier.softwareScope) {
    if (tierId) {
      resolvedTier = resolveTier(tierId);
    } else if (Number(amountPaid) === 200 || (tierName && tierName.toLowerCase().includes('starter'))) {
      resolvedTier = resolveTier('starter');
    } else {
      resolvedTier = resolveTier('pro');
    }
  }

  const effectiveTierName = resolvedTier?.name || tierName || 'Best Value Masterclass';
  const softwareScope = resolvedTier?.softwareScope || 'Full Adobe Creative Cloud (Photoshop, Illustrator, InDesign, After Effects) & Figma';
  const perks = (resolvedTier?.perks && resolvedTier.perks.length > 0)
    ? resolvedTier.perks
    : [
        'Full Adobe Suite (Photoshop, Illustrator, InDesign, After Effects) & Figma Mastery',
        'Commercial Brand Identity & Vector System Creation',
        'Print-Ready Prepress & Editorial Production in InDesign',
        'Motion Graphics & Logo Animation in After Effects',
        'UI/UX Screen Layouts & Component Design in Figma',
        'VIP Mentorship WhatsApp Group Access',
        '1-on-1 Commercial Portfolio Review'
      ];

  const inviteUrl = whatsappInviteUrl || 'https://chat.whatsapp.com/invite/olatunde-masterclass-2026';

  // 2. Student Confirmation Email
  const studentSubject = `Enrollment Confirmed: Olatunde Daniel Masterclass (${receiptNumber})`;
  const studentHtml = buildStudentEmailHtml({
    toName,
    tierName: effectiveTierName,
    softwareScope,
    perks,
    transactionId,
    receiptNumber,
    amountPaid: Number(amountPaid) || resolvedTier?.price || 200,
    formattedDate,
    whatsappInviteUrl: inviteUrl
  });

  // 3. Admin Alert Email (sent to Daniel with student's full form info)
  const adminSubject = `New Student Enrolled: ${toName} (₦${Number(amountPaid).toLocaleString()} NGN)`;
  const adminHtml = buildAdminEmailHtml({
    toName,
    toEmail,
    whatsapp: whatsapp || 'Not provided',
    tierName: effectiveTierName,
    softwareScope,
    amountPaid: Number(amountPaid) || resolvedTier?.price || 200,
    transactionId,
    receiptNumber,
    formattedDate
  });

  const senderAddress = getSenderAddress();
  const adminEmail = getAdminEmail();

  try {
    // Send to student
    const studentResult = await sendMail({
      from: senderAddress,
      to: toEmail,
      subject: studentSubject,
      html: studentHtml
    });
    console.info(`[Email Dispatcher] Student confirmation dispatched to ${toEmail} (${studentResult.method || studentResult.driver})`);

    // Send to Daniel (workwithdan6@gmail.com)
    if (adminEmail && adminEmail.toLowerCase() !== toEmail.toLowerCase()) {
      await sendMail({
        from: senderAddress,
        to: adminEmail,
        subject: adminSubject,
        html: adminHtml
      }).catch((e) => console.warn('[Email Dispatcher] Admin alert failed:', e.message));
      console.info(`[Email Dispatcher] Admin alert dispatched to ${adminEmail}`);
    }

    return { success: true };
  } catch (err) {
    console.error('[Email Dispatcher] Error during enrollment confirmation dispatch:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends support acknowledgment to student and alert to owner.
 */
export async function sendSupportAcknowledgment({ toEmail, toName, ticketId, message }) {
  const studentSubject = `Support Ticket Received: [${ticketId}]`;
  const studentHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; background: #0a0a0a; color: #fff; padding: 20px; border-radius: 8px; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #facc15; margin-top: 0; font-size: 16px;">Support Ticket Received</h2>
      <p style="font-size: 13px;">Hello ${toName},</p>
      <p style="font-size: 12.5px; color: #ccc;">We received your inquiry (Ticket ID: <strong>${ticketId}</strong>). Our support desk will reach out to you via this email within 24 hours.</p>
      <div style="background: #171717; padding: 14px; border-radius: 6px; border-left: 3px solid #facc15; margin: 16px 0;">
        <p style="margin: 0; color: #ccc; font-size: 12px;">"${message || 'Inquiry logged'}"</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #333; margin: 18px 0;" />
      <p style="color: #666; font-size: 11px;">Olatunde Daniel Masterclass &mdash; &copy;2026</p>
    </div>
  `;

  const adminSubject = `New Support Ticket: [${ticketId}] from ${toName}`;
  const adminHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; background: #0a0a0a; color: #fff; padding: 20px; border-radius: 8px; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #f87171; margin-top: 0; font-size: 16px;">New Support Ticket (${ticketId})</h2>
      <p style="font-size: 13px;"><strong>From:</strong> ${toName} (${toEmail})</p>
      <div style="background: #171717; padding: 14px; border-radius: 6px; border-left: 3px solid #f87171; margin: 16px 0;">
        <p style="margin: 0; color: #e5e5e5; font-size: 12px; white-space: pre-wrap;">${message || 'No message body'}</p>
      </div>
    </div>
  `;

  const senderAddress = getSenderAddress();
  const adminEmail = getAdminEmail();

  try {
    await sendMail({
      from: senderAddress,
      to: toEmail,
      subject: studentSubject,
      html: studentHtml
    });

    if (adminEmail) {
      await sendMail({
        from: senderAddress,
        to: adminEmail,
        subject: adminSubject,
        html: adminHtml
      }).catch((e) => console.warn('[Email Dispatcher] Admin ticket alert failed:', e.message));
    }

    return { success: true };
  } catch (err) {
    console.error('[Email Dispatcher] Support send error:', err.message);
    return { success: false, error: err.message };
  }
}

// ── HTML Templates ────────────────────────────────────────────────────────────

function buildStudentEmailHtml({
  toName,
  tierName,
  softwareScope,
  perks = [],
  transactionId,
  receiptNumber,
  amountPaid,
  formattedDate,
  whatsappInviteUrl
}) {
  const perksListHtml = perks.length > 0
    ? perks.map((p) => `<li style="padding: 3px 0; color: #d4d4d4;">${p}</li>`).join('')
    : '<li style="padding: 3px 0; color: #d4d4d4;">Full Masterclass Access &amp; Curriculum Materials</li>';

  const backendBase = process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://olatunde-daniel-api.onrender.com' : 'http://10.220.254.8:4000');
  const receiptPrintUrl = `${backendBase}/api/payment/receipt/${encodeURIComponent(receiptNumber)}?print=true`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Enrollment Confirmed</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; background: #0a0a0a; color: #d4d4d4; margin: 0; padding: 0; }
  .container { max-width: 520px; margin: 20px auto; background: #111111; border-radius: 8px; overflow: hidden; border: 1px solid #242424; }
  .header { background: #f5f0e8; padding: 18px 20px; text-align: center; }
  .header h1 { color: #0a0a0a; font-size: 16px; margin: 0 0 2px; letter-spacing: 0.04em; font-weight: 800; text-transform: uppercase; }
  .header p { color: #555555; margin: 0; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  .body { padding: 22px 20px; }
  .greeting { color: #facc15; font-size: 15px; font-weight: 700; margin-top: 0; margin-bottom: 8px; }
  .appreciation { color: #e5e5e5; font-size: 12.5px; line-height: 1.55; background: #161616; padding: 13px 15px; border-radius: 6px; border-left: 3px solid #facc15; margin: 14px 0; }
  .cta-btn { display: block; text-align: center; background: #25d366; color: #000000; text-decoration: none; padding: 12px 18px; border-radius: 6px; font-weight: 700; font-size: 13px; margin: 18px 0 16px; letter-spacing: 0.02em; }
  .footer { padding: 14px 20px; border-top: 1px solid #1f1f1f; font-size: 10px; color: #555555; text-align: center; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Olatunde Daniel</h1>
    <p>Graphics Design Masterclass</p>
  </div>
  <div class="body">
    <div class="greeting">Welcome to the Cohort, ${toName}!</div>
    
    <div class="appreciation">
      Thank you for investing in yourself and enrolling in the <strong>Olatunde Daniel Graphics Design Masterclass</strong>. We are thrilled to welcome you into this cohort and look forward to accelerating your creative career into world-class commercial standards.
    </div>

    <!-- WhatsApp Community Link -->
    <a href="${whatsappInviteUrl}" target="_blank" rel="noopener noreferrer" class="cta-btn">
      Join Exclusive WhatsApp Community
    </a>

    <!-- Official Purchase Receipt Table (Mobile-Safe) -->
    <div style="background: #141414; border: 1px solid #262626; border-radius: 6px; padding: 16px; margin: 18px 0;">
      <div style="font-size: 11px; font-family: monospace; text-transform: uppercase; color: #888888; margin-bottom: 10px; font-weight: bold; letter-spacing: 0.05em; border-bottom: 1px solid #222222; padding-bottom: 6px;">
        Official Purchase Receipt
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="left" style="padding: 8px 0; color: #888888; font-size: 11.5px; border-bottom: 1px solid #222222; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; width: 42%;">
            Receipt Number
          </td>
          <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 12px; font-weight: bold; border-bottom: 1px solid #222222; font-family: 'SF Mono', Menlo, Consolas, monospace;">
            ${receiptNumber}
          </td>
        </tr>
        <tr>
          <td align="left" style="padding: 8px 0; color: #888888; font-size: 11.5px; border-bottom: 1px solid #222222; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
            Transaction ID
          </td>
          <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 12px; font-weight: bold; border-bottom: 1px solid #222222; font-family: 'SF Mono', Menlo, Consolas, monospace;">
            ${transactionId}
          </td>
        </tr>
        <tr>
          <td align="left" style="padding: 8px 0; color: #888888; font-size: 11.5px; border-bottom: 1px solid #222222; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
            Enrolled Tier
          </td>
          <td align="right" style="padding: 8px 0; color: #facc15; font-size: 12px; font-weight: bold; border-bottom: 1px solid #222222; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
            ${tierName}
          </td>
        </tr>
        <tr>
          <td align="left" style="padding: 8px 0; color: #888888; font-size: 11.5px; border-bottom: 1px solid #222222; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
            Amount Paid
          </td>
          <td align="right" style="padding: 8px 0; color: #4ade80; font-size: 13px; font-weight: bold; border-bottom: 1px solid #222222; font-family: 'SF Mono', Menlo, Consolas, monospace;">
            ₦${amountPaid.toLocaleString()} NGN
          </td>
        </tr>
        <tr>
          <td align="left" style="padding: 8px 0; color: #888888; font-size: 11.5px; border-bottom: 1px solid #222222; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
            Payment Gateway
          </td>
          <td align="right" style="padding: 8px 0; color: #ffffff; font-size: 11.5px; font-weight: 500; border-bottom: 1px solid #222222; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
            Paystack Verified
          </td>
        </tr>
        <tr>
          <td align="left" style="padding: 8px 0; color: #888888; font-size: 11.5px; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
            Date &amp; Time
          </td>
          <td align="right" style="padding: 8px 0; color: #e5e5e5; font-size: 11.5px; font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
            ${formattedDate}
          </td>
        </tr>
      </table>

      <!-- Print Receipt Action -->
      <div style="text-align: center; margin-top: 14px; padding-top: 12px; border-top: 1px dashed #2a2a2a;">
        <a href="${receiptPrintUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #222222; color: #facc15; text-decoration: none; padding: 9px 18px; border-radius: 5px; font-size: 11.5px; font-weight: 700; border: 1px solid #3d3d3d; letter-spacing: 0.02em;">
          Print / Download Official Receipt
        </a>
        <div style="font-size: 10px; color: #666666; margin-top: 5px;">
          Opens clean A4 receipt ready to print or save as PDF
        </div>
      </div>
    </div>

    <!-- Purchased Tier Details & Exact Scope Card -->
    <div style="background: #141414; border: 1px solid #262626; border-radius: 6px; padding: 16px; margin: 18px 0;">
      <div style="font-size: 11px; color: #facc15; font-family: monospace; text-transform: uppercase; font-weight: bold; letter-spacing: 0.04em; margin-bottom: 8px;">
        Your Enrolled Tier: ${tierName}
      </div>
      
      <!-- Software Scope Highlight Box -->
      <div style="background: #1c1c1c; border-left: 3px solid #facc15; padding: 9px 12px; border-radius: 3px; margin-bottom: 14px;">
        <div style="font-size: 10px; color: #888888; text-transform: uppercase; font-family: monospace; font-weight: bold; margin-bottom: 3px;">
          Included Software Scope:
        </div>
        <div style="font-size: 12.5px; color: #ffffff; font-weight: 600; line-height: 1.45;">
          ${softwareScope}
        </div>
      </div>

      <div style="font-size: 10.5px; color: #888888; text-transform: uppercase; font-family: monospace; font-weight: bold; margin-bottom: 6px;">
        Included Curriculum &amp; Assets:
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 11.5px; color: #cccccc; line-height: 1.6;">
        ${perksListHtml}
      </ul>
    </div>

    <p style="font-size: 11px; color: #777777; line-height: 1.5; margin-top: 18px; margin-bottom: 0;">
      Keep this email as proof of your enrollment. If you need any assistance, reach out directly or reply to this message.
    </p>
  </div>
  <div class="footer">
    <p style="margin: 0 0 2px;">Olatunde Daniel Graphics Design Masterclass &bull; &copy;2026</p>
    <p style="margin: 0;">Automated enrollment confirmation &bull; Verified Transaction</p>
  </div>
</div>
</body>
</html>`;
}

function buildAdminEmailHtml({
  toName,
  toEmail,
  whatsapp,
  tierName,
  softwareScope,
  amountPaid,
  transactionId,
  receiptNumber,
  formattedDate
}) {
  const whatsappClean = (whatsapp || '').replace(/[^0-9]/g, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Student Enrolled</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; background: #0a0a0a; color: #ffffff; margin: 0; padding: 16px;">
  <div style="max-width: 520px; margin: 0 auto; background: #111111; border: 1px solid #282828; border-radius: 8px; padding: 20px;">
    
    <!-- Admin Header -->
    <div style="border-bottom: 1px solid #222222; padding-bottom: 12px; margin-bottom: 16px;">
      <h2 style="color: #facc15; margin: 0 0 4px; font-size: 16px; letter-spacing: 0.02em;">New Student Enrolled</h2>
      <p style="color: #888888; font-size: 11.5px; margin: 0;">Verified purchase completed via Paystack.</p>
    </div>

    <!-- Student Information Structured Card -->
    <div style="background: #141414; border: 1px solid #262626; border-radius: 6px; overflow: hidden; margin-bottom: 16px;">
      <div style="background: #1a1a1a; padding: 8px 14px; font-size: 10.5px; text-transform: uppercase; font-family: monospace; color: #888888; font-weight: bold; letter-spacing: 0.05em; border-bottom: 1px solid #222222;">
        Student Checkout Credentials
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #888888; font-size: 11.5px; width: 34%; white-space: nowrap;">
            Student Name
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #ffffff; font-size: 12.5px; font-weight: bold;">
            ${toName}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #888888; font-size: 11.5px; white-space: nowrap;">
            Email
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #38bdf8; font-size: 12px; font-weight: bold;">
            <a href="mailto:${toEmail}" style="color: #38bdf8; text-decoration: none;">${toEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #888888; font-size: 11.5px; white-space: nowrap;">
            WhatsApp
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #22c55e; font-size: 12px; font-weight: bold;">
            <a href="https://wa.me/${whatsappClean}" style="color: #22c55e; text-decoration: none;">${whatsapp} &rarr; Chat on WhatsApp</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #888888; font-size: 11.5px; white-space: nowrap;">
            Tier Enrolled
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #facc15; font-size: 12.5px; font-weight: bold;">
            ${tierName}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #888888; font-size: 11.5px; vertical-align: top; white-space: nowrap;">
            Software Scope
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #d4d4d4; font-size: 11.5px; line-height: 1.45;">
            ${softwareScope}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #888888; font-size: 11.5px; white-space: nowrap;">
            Amount Paid
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #4ade80; font-size: 14px; font-weight: bold; font-family: 'SF Mono', Menlo, Consolas, monospace;">
            ₦${amountPaid.toLocaleString()} NGN
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #888888; font-size: 11.5px; white-space: nowrap;">
            Transaction ID
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #cccccc; font-size: 11.5px; font-family: 'SF Mono', Menlo, Consolas, monospace;">
            ${transactionId}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #888888; font-size: 11.5px; white-space: nowrap;">
            Receipt No
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222222; color: #cccccc; font-size: 11.5px; font-family: 'SF Mono', Menlo, Consolas, monospace;">
            ${receiptNumber}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #888888; font-size: 11.5px; white-space: nowrap;">
            Date &amp; Time
          </td>
          <td style="padding: 10px 14px; color: #cccccc; font-size: 11.5px;">
            ${formattedDate}
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; border-top: 1px solid #1f1f1f; padding-top: 12px; font-size: 10px; color: #555555;">
      Olatunde Daniel Masterclass Administration &bull; Automated Instant Alert
    </div>
  </div>
</body>
</html>`;
}


