/**
 * Paystack payment gateway service.
 * Supports dual mode:
 * - Mock mode: if PAYSTACK_SECRET_KEY is not set or empty.
 * - Live/Test mode: if PAYSTACK_SECRET_KEY starts with 'sk_'.
 */

import axios from 'axios';
import crypto from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getSecretKey() {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

function getClient() {
  const secret = getSecretKey();
  return axios.create({
    baseURL: PAYSTACK_BASE_URL,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });
}

/**
 * Creates a Paystack payment session and returns a checkout URL.
 */
export async function initiatePaystackTransaction({
  email,
  amountNGN,
  reference,
  metadata = {},
  callbackUrl
}) {
  const secretKey = getSecretKey();
  const isKeyActive = Boolean(secretKey && secretKey.startsWith('sk_'));

  if (!isKeyActive) {
    console.info('[Paystack] Mock mode active: no valid secret key provided.');
    console.info(`[Paystack] Simulated charge: ${email} NGN ${amountNGN} — Ref: ${reference}`);
    return {
      success: true,
      mock: true,
      authorizationUrl: null,
      reference,
      message: 'Mock payment initialized. Add PAYSTACK_SECRET_KEY in server/.env to go live.'
    };
  }

  const amountKobo = Math.round(amountNGN * 100);
  try {
    const client = getClient();
    const { data } = await client.post('/transaction/initialize', {
      email,
      amount: amountKobo,
      reference,
      callback_url: callbackUrl,
      currency: 'NGN',
      metadata: {
        ...metadata,
        cancel_action: callbackUrl
      }
    });

    if (!data.status) {
      throw new Error(data.message || 'Paystack initialization failed.');
    }

    return {
      success: true,
      mock: false,
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference
    };
  } catch (err) {
    console.error('[Paystack] Initialize error:', err.response?.data || err.message);
    throw new Error(err.response?.data?.message || 'Payment gateway initialization failed. Please try again.');
  }
}

/**
 * Verifies a completed payment by reference with Paystack.
 */
export async function verifyPaystackTransaction(reference) {
  const secretKey = getSecretKey();
  const isKeyActive = Boolean(secretKey && secretKey.startsWith('sk_'));

  if (!isKeyActive) {
    console.info(`[Paystack] Mock mode verification for ref: ${reference}`);
    return {
      success: true,
      mock: true,
      data: {
        reference,
        status: 'success',
        amount: 0,
        currency: 'NGN',
        paid_at: new Date().toISOString(),
        customer: { email: 'mock@example.com' }
      }
    };
  }

  try {
    const client = getClient();
    const { data } = await client.get(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (!data.status) {
      throw new Error(data.message || 'Verification failed.');
    }
    if (data.data.status !== 'success') {
      return { success: false, data: data.data, reason: data.data.gateway_response };
    }
    return { success: true, mock: false, data: data.data };
  } catch (err) {
    console.error('[Paystack] Verify error:', err.response?.data || err.message);
    throw new Error('Payment verification failed. Please contact support.');
  }
}

/**
 * Verifies the HMAC-SHA512 signature on an incoming Paystack webhook request.
 */
export function verifyWebhookSignature(rawBody, signatureHeader) {
  const secretKey = getSecretKey();
  if (!secretKey) {
    console.warn('[Paystack] Webhook signature verification skipped: PAYSTACK_SECRET_KEY not set.');
    return true;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signatureHeader || '', 'utf8')
    );
  } catch (err) {
    console.error('[Paystack Webhook] Signature verification error:', err.message);
    return false;
  }
}
