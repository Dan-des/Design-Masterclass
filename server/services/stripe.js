/**
 * Stripe payment gateway service.
 * Handles Stripe Checkout Session creation, session verification,
 * and webhook cryptographic signature verification.
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || null;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || null;

// Initialize Stripe SDK if secret key is present
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  : null;

/**
 * Creates a Stripe Checkout Session for the selected course tier.
 * In mock mode (no key provided), returns a simulated session.
 */
export async function createStripeCheckoutSession({
  tier,
  studentInfo,
  transactionId,
  sessionId,
  successUrl,
  cancelUrl
}) {
  if (!stripe || !STRIPE_SECRET_KEY) {
    console.info('[Stripe] Running in mock mode: no STRIPE_SECRET_KEY provided.');
    return {
      success: true,
      mock: true,
      sessionId: `cs_mock_${transactionId}`,
      url: null,
      message: 'Mock mode active. Provide STRIPE_SECRET_KEY in server/.env to enable live Stripe checkout.'
    };
  }

  try {
    const currency = (tier.currency || 'ngn').toLowerCase();
    const unitAmount = Math.round(tier.price * 100); // Smallest currency unit (cents / kobo)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: studentInfo.email,
      client_reference_id: transactionId,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Olatunde Daniel - ${tier.name}`,
              description: 'Graphics Design Masterclass Enrollment'
            },
            unit_amount: unitAmount
          },
          quantity: 1
        }
      ],
      metadata: {
        transactionId,
        sessionId: sessionId || 'unknown',
        tierId: tier.id,
        tierName: tier.name,
        fullName: studentInfo.fullName,
        email: studentInfo.email,
        whatsapp: studentInfo.whatsapp
      },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${cancelUrl}?status=cancelled`
    });

    return {
      success: true,
      mock: false,
      sessionId: session.id,
      url: session.url
    };
  } catch (err) {
    console.error('[Stripe] createCheckoutSession error:', err.message);
    throw new Error(`Stripe Checkout initiation failed: ${err.message}`);
  }
}

/**
 * Retrieves and verifies a completed Stripe Checkout Session.
 */
export async function verifyStripeSession(sessionId) {
  if (!stripe || !STRIPE_SECRET_KEY || sessionId.startsWith('cs_mock_')) {
    console.info(`[Stripe] Mock verification for session ${sessionId}`);
    return {
      success: true,
      mock: true,
      session: {
        id: sessionId,
        payment_status: 'paid',
        status: 'complete',
        customer_email: 'mock@example.com',
        metadata: {}
      }
    };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });

    const isPaid = session.payment_status === 'paid';

    return {
      success: isPaid,
      mock: false,
      session,
      paymentStatus: session.payment_status,
      status: session.status
    };
  } catch (err) {
    console.error('[Stripe] verifySession error:', err.message);
    throw new Error(`Stripe verification failed: ${err.message}`);
  }
}

/**
 * Validates cryptographic signature on incoming Stripe webhook event.
 */
export function constructStripeWebhookEvent(rawBody, signatureHeader) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.warn('[Stripe] Webhook signature verification skipped: STRIPE_WEBHOOK_SECRET not configured.');
    return JSON.parse(rawBody.toString('utf8'));
  }

  return stripe.webhooks.constructEvent(
    rawBody,
    signatureHeader,
    STRIPE_WEBHOOK_SECRET
  );
}
