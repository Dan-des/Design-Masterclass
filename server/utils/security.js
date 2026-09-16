/**
 * Server-side security utilities.
 * Independent of the client-side security.js — these run in Node.js only.
 */

/**
 * Normalizes a phone number to digits only for duplicate comparison.
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Canonicalizes email addresses, with Gmail dot/plus-tag stripping.
 * Used for duplicate enrollment detection.
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.toLowerCase().trim();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return trimmed;
  const [user, domain] = parts;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const cleanUser = user.replace(/\./g, '').split('+')[0];
    return `${cleanUser}@gmail.com`;
  }
  return trimmed;
}

/**
 * The authoritative server-side pricing source.
 * Never trust the client-reported price — always resolve from this map.
 */
export const TIERS = Object.freeze({
  starter: {
    id: 'starter',
    name: 'Starter Edition',
    price: 200,
    currency: 'NGN',
    softwareScope: 'Photoshop and Camera Raw only',
    description: 'Essential foundation for image manipulation and raw photographic grading.',
    perks: [
      'Adobe Photoshop Fundamentals & Workflow',
      'Camera Raw Color Correction & Color Grading',
      'Basic Asset Organization Templates',
      'Standard Resolution Export Workflows',
      'Standard Email Support'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Best Value Masterclass',
    price: 350,
    currency: 'NGN',
    softwareScope: 'Full Adobe Creative Cloud (Photoshop, Illustrator, InDesign, After Effects) & Figma',
    description: 'Comprehensive commercial mastery covering full identity systems, advanced typography, and commercial client workflows.',
    perks: [
      'Full Adobe Suite (Photoshop, Illustrator, InDesign, After Effects) & Figma Mastery',
      'Commercial Brand Identity & Vector System Creation',
      'Complete Raw Project Source Files & Layered Vector Assets',
      'Immediate Access to Exclusive WhatsApp Mentorship Community',
      'Commercial Client Onboarding & Proposal Pitch Templates',
      'Weekly Live Portfolio Critique with Olatunde Daniel',
      'Lifetime Access to All 2026 Curriculum Updates'
    ]
  }
});

/**
 * Resolves and validates tier pricing. Returns null if the tier is invalid.
 * Ignores any client-reported price — uses server-side price only.
 */
export function resolveTier(tierId) {
  return TIERS[tierId] || null;
}

/**
 * Validates that a string has a valid email domain structure (e.g. @gmail.com, @yahoo.com).
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
  if (!regex.test(trimmed)) return false;
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase();
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  return domainParts.every(part => part.length >= 2);
}

/**
 * Validates that a phone number is exactly 11 digits (e.g. 08012345678 or +234 variant).
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return true;
  if (digits.length === 13 && digits.startsWith('234')) return true;
  return false;
}

/**
 * Validates a student name.
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 80 && /^[a-zA-Z\s.'-]+$/.test(trimmed);
}

/**
 * Strips dangerous characters from a string to prevent injection.
 */
export function sanitize(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '').slice(0, maxLength);
}

/**
 * Logs server-side security events to stdout for observability.
 */
export function logEvent(event, data = {}) {
  console.info(`[Audit] ${event}`, JSON.stringify({ timestamp: new Date().toISOString(), ...data }));
}
