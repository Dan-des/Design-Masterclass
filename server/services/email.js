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

const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'workwithdan6@gmail.com';

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
      subject,
      html
    });
    return { success: true, messageId: res.data?.id, driver: 'resend' };
  }

  if (driver.type === 'smtp') {
    const info = await driver.client.sendMail({
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
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

  const effectiveTierName = tier?.name || tierName || 'Graphics Design Masterclass';
  const softwareScope = tier?.softwareScope || 'Full Masterclass Curriculum';
  const perks = tier?.perks || [];
  const inviteUrl = whatsappInviteUrl || 'https://chat.whatsapp.com/invite/olatunde-masterclass-2026';

  // 1. Student Confirmation Email
  const studentSubject = `Enrollment Confirmed: Olatunde Daniel Masterclass (${receiptNumber})`;
  const studentHtml = buildStudentEmailHtml({
    toName,
    tierName: effectiveTierName,
    softwareScope,
    perks,
    transactionId,
    receiptNumber,
    amountPaid,
    formattedDate,
    whatsappInviteUrl: inviteUrl
  });

  // 2. Admin Alert Email (sent to Daniel with student's full form info)
  const adminSubject = `New Student Enrolled: ${toName} (₦${amountPaid.toLocaleString()})`;
  const adminHtml = buildAdminEmailHtml({
    toName,
    toEmail,
    whatsapp: whatsapp || 'Not provided',
    tierName: effectiveTierName,
    softwareScope,
    amountPaid,
    transactionId,
    receiptNumber,
    formattedDate
  });

  const senderAddress = FROM_EMAIL.includes('<')
    ? FROM_EMAIL
    : `Olatunde Daniel <${FROM_EMAIL}>`;

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
    if (ADMIN_EMAIL && ADMIN_EMAIL.toLowerCase() !== toEmail.toLowerCase()) {
      await sendMail({
        from: senderAddress,
        to: ADMIN_EMAIL,
        subject: adminSubject,
        html: adminHtml
      }).catch((e) => console.warn('[Email Dispatcher] Admin alert failed:', e.message));
      console.info(`[Email Dispatcher] Admin alert dispatched to ${ADMIN_EMAIL}`);
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
    <div style="font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #facc15; margin-top: 0;">Support Ticket Received</h2>
      <p>Hello ${toName},</p>
      <p>We received your inquiry (Ticket ID: <strong>${ticketId}</strong>). Our support desk will reach out to you via this email within 24 hours.</p>
      <div style="background: #171717; padding: 16px; border-radius: 6px; border-left: 3px solid #facc15; margin: 16px 0;">
        <p style="margin: 0; color: #ccc; font-size: 13px;">"${message || 'Inquiry logged'}"</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">Olatunde Daniel Masterclass &mdash; &copy;2026</p>
    </div>
  `;

  const adminSubject = `New Support Ticket: [${ticketId}] from ${toName}`;
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #f87171; margin-top: 0;">New Support Ticket (${ticketId})</h2>
      <p><strong>From:</strong> ${toName} (${toEmail})</p>
      <div style="background: #171717; padding: 16px; border-radius: 6px; border-left: 3px solid #f87171; margin: 16px 0;">
        <p style="margin: 0; color: #e5e5e5; white-space: pre-wrap;">${message || 'No message body'}</p>
      </div>
    </div>
  `;

  const senderAddress = FROM_EMAIL.includes('<')
    ? FROM_EMAIL
    : `Olatunde Daniel Support <${FROM_EMAIL}>`;

  try {
    await sendMail({
      from: senderAddress,
      to: toEmail,
      subject: studentSubject,
      html: studentHtml
    });

    if (ADMIN_EMAIL) {
      await sendMail({
        from: senderAddress,
        to: ADMIN_EMAIL,
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
    ? perks.map((p) => `<li style="padding: 4px 0; color: #d4d4d4;">${p}</li>`).join('')
    : '<li style="padding: 4px 0; color: #d4d4d4;">Full Masterclass Access &amp; Curriculum Materials</li>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Enrollment Confirmed</title>
<style>
  body { font-family: Arial, sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 30px auto; background: #111; border-radius: 12px; overflow: hidden; border: 1px solid #222; }
  .header { background: #f5f0e8; padding: 28px; text-align: center; }
  .header h1 { color: #0a0a0a; font-size: 22px; margin: 0 0 4px; letter-spacing: 0.05em; font-weight: 800; }
  .header p { color: #555; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
  .body { padding: 32px 28px; }
  .greeting { color: #facc15; font-size: 20px; font-weight: bold; margin-top: 0; }
  .appreciation { color: #f5f5f5; font-size: 15px; line-height: 1.65; background: #1a1a1a; padding: 18px; border-radius: 8px; border-left: 4px solid #facc15; margin: 20px 0; }
  .receipt-box { background: #171717; border: 1px solid #282828; border-radius: 8px; padding: 20px; margin: 24px 0; }
  .receipt-title { font-size: 12px; font-family: monospace; text-transform: uppercase; color: #888; margin-bottom: 12px; font-weight: bold; }
  .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #222; font-size: 13px; }
  .receipt-row:last-child { border-bottom: none; }
  .receipt-label { color: #888; }
  .receipt-value { color: #fff; font-weight: bold; font-family: monospace; }
  .perks-box { background: #171717; border: 1px solid #282828; border-radius: 8px; padding: 20px; margin: 24px 0; }
  .perks-title { font-size: 13px; color: #facc15; text-transform: uppercase; font-weight: bold; margin: 0 0 10px; }
  .scope-badge { display: inline-block; background: #222; color: #e5e5e5; font-size: 12px; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px; }
  .cta-btn { display: block; text-align: center; background: #25d366; color: #000; text-decoration: none; padding: 15px 24px; border-radius: 8px; font-weight: 800; font-size: 15px; margin: 28px 0 16px; letter-spacing: 0.02em; }
  .footer { padding: 20px 28px; border-top: 1px solid #1f1f1f; font-size: 11px; color: #555; text-align: center; }
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

    <!-- Official Purchase Receipt -->
    <div class="receipt-box">
      <div class="receipt-title">Official Purchase Receipt</div>
      <div class="receipt-row">
        <span class="receipt-label">Receipt Number</span>
        <span class="receipt-value">${receiptNumber}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Transaction ID</span>
        <span class="receipt-value">${transactionId}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Enrolled Tier</span>
        <span class="receipt-value">${tierName}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Amount Paid</span>
        <span class="receipt-value">₦${amountPaid.toLocaleString()} NGN</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Payment Gateway</span>
        <span class="receipt-value">Paystack Verified</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Date &amp; Time</span>
        <span class="receipt-value">${formattedDate}</span>
      </div>
    </div>

    <!-- Purchased Tier Details & Perks -->
    <div class="perks-box">
      <div class="perks-title">Your Enrolled Tier: ${tierName}</div>
      <div class="scope-badge">Software Scope: ${softwareScope}</div>
      <div style="font-size: 12px; color: #888; margin-bottom: 8px;">Included Curriculum &amp; Assets:</div>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
        ${perksListHtml}
      </ul>
    </div>

    <p style="font-size: 12px; color: #777; line-height: 1.5; margin-top: 24px;">
      Keep this email as proof of your enrollment. If you need any assistance, reach out directly or reply to this message.
    </p>
  </div>
  <div class="footer">
    <p>Olatunde Daniel Graphics Design Masterclass &mdash; &copy;2026</p>
    <p>This is an automated purchase and access confirmation.</p>
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
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>New Student Enrolled</title>
</head>
<body style="font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #2a2a2a; border-radius: 10px; padding: 24px;">
    <div style="border-bottom: 1px solid #222; padding-bottom: 16px; margin-bottom: 20px;">
      <h2 style="color: #facc15; margin: 0 0 6px; font-size: 20px;">New Masterclass Student Enrolled!</h2>
      <p style="color: #888; font-size: 13px; margin: 0;">A student just completed payment via Paystack.</p>
    </div>

    <div style="background: #181818; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <h3 style="color: #fff; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 14px; font-family: monospace;">
        Student Form Information
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #888; width: 140px;">Full Name:</td>
          <td style="padding: 6px 0; color: #fff; font-weight: bold;">${toName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #888;">Email:</td>
          <td style="padding: 6px 0; color: #38bdf8; font-weight: bold;">
            <a href="mailto:${toEmail}" style="color: #38bdf8; text-decoration: none;">${toEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #888;">WhatsApp Phone:</td>
          <td style="padding: 6px 0; color: #22c55e; font-weight: bold;">
            <a href="https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}" style="color: #22c55e; text-decoration: none;">${whatsapp}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #888;">Tier Purchased:</td>
          <td style="padding: 6px 0; color: #facc15; font-weight: bold;">${tierName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #888;">Software Scope:</td>
          <td style="padding: 6px 0; color: #ccc;">${softwareScope}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #888;">Amount Paid:</td>
          <td style="padding: 6px 0; color: #4ade80; font-weight: bold; font-family: monospace; font-size: 16px;">₦${amountPaid.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #888;">Transaction ID:</td>
          <td style="padding: 6px 0; color: #aaa; font-family: monospace;">${transactionId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #888;">Receipt Number:</td>
          <td style="padding: 6px 0; color: #aaa; font-family: monospace;">${receiptNumber}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #888;">Date &amp; Time:</td>
          <td style="padding: 6px 0; color: #aaa;">${formattedDate}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; border-top: 1px solid #1f1f1f; padding-top: 16px; font-size: 12px; color: #555;">
      Olatunde Daniel Masterclass Administration &mdash; Live Notification
    </div>
  </div>
</body>
</html>`;
}
