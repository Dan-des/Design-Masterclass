/**
 * Mock API service simulating backend payment gateway, email dispatch,
 * webhook processing, and support ticket desk.
 */

import { logSecurityEvent } from './security';
import { generateReceiptNumber, generateTicketId } from './crypto';

export async function processPaymentSimulation({ transactionId, sessionId, tier, studentInfo, method }) {
  logSecurityEvent('PAYMENT_INITIATED', {
    transactionId,
    sessionId,
    tierId: tier.id,
    amount: tier.price,
    method
  });

  // Realistic network delay for processing and security handshake
  await new Promise((resolve) => setTimeout(resolve, 1400));

  // Sequential gateway confirmation starting from 00001
  const receiptNumber = generateReceiptNumber();
  const webhookId = `WH-00001`;

  // Trigger background webhook simulation
  simulateWebhookEvent({
    webhookId,
    event: 'charge.successful',
    transactionId,
    sessionId,
    amount: tier.price,
    studentEmail: studentInfo.email
  });

  // Trigger automated student email dispatch
  simulateEmailDispatch({
    recipient: studentInfo.email,
    name: studentInfo.fullName,
    tierName: tier.name,
    transactionId,
    receiptNumber
  });

  return {
    success: true,
    receiptNumber,
    webhookId,
    transactionId,
    paidAt: new Date().toISOString()
  };
}

/**
 * Simulates server-side webhook dispatcher
 */
export function simulateWebhookEvent(payload) {
  logSecurityEvent('WEBHOOK_DISPATCHED', payload);
  // Log confirmation for audit trail
  console.info('[Server Webhook] Payment Complete event processed successfully:', payload);
}

/**
 * Simulates automated email dispatch function
 */
export function simulateEmailDispatch({ recipient, name, tierName, transactionId, receiptNumber }) {
  logSecurityEvent('EMAIL_DISPATCHED', {
    to: recipient,
    subject: `Access Confirmed: Olatunde Daniel - ${tierName}`,
    transactionId,
    receiptNumber
  });
  console.info(`[Email Dispatcher] Onboarding pack, printable receipt ${receiptNumber}, and WhatsApp community link sent to: ${recipient}`);
}

/**
 * Handles on-page support desk ticket submission
 */
export async function submitSupportTicket({ fullName, email, message, sessionId, transactionId }) {
  logSecurityEvent('SUPPORT_TICKET_CREATED', {
    fullName,
    email,
    sessionId,
    transactionId: transactionId || 'NONE'
  });

  // Network simulation
  await new Promise((resolve) => setTimeout(resolve, 900));

  const ticketId = generateTicketId();

  return {
    success: true,
    ticketId,
    submittedAt: new Date().toISOString(),
    message: 'Ticket received. Support will reach out via email.'
  };
}
