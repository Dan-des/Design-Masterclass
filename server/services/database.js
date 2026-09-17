/**
 * Database service.
 * Connects to MongoDB Atlas when MONGODB_URI is provided.
 * Provides resilient in-memory storage fallback for local development
 * so testing is never blocked if MongoDB Atlas is not yet connected.
 */

import mongoose from 'mongoose';
import { initCounters } from '../utils/ids.js';

// In-memory store fallback for development
const memoryEnrollments = [];
const memoryTickets = [];

// ── Schema Definitions ────────────────────────────────────────────────────────

const EnrollmentSchema = new mongoose.Schema(
  {
    sessionId:         { type: String, required: true },
    transactionId:     { type: String, required: true, unique: true },
    paystackReference: { type: String, default: null },
    stripeSessionId:   { type: String, default: null },
    receiptNumber:     { type: String, required: true, unique: true },
    tierId:            { type: String, required: true, enum: ['starter', 'pro'] },
    tierName:          { type: String, required: true },
    amountPaid:        { type: Number, required: true },
    currency:          { type: String, default: 'NGN' },
    fullName:          { type: String, required: true },
    email:             { type: String, required: true, lowercase: true, trim: true },
    emailCanonical:    { type: String, required: true },
    whatsapp:          { type: String, required: true },
    whatsappDigits:    { type: String, required: true },
    paymentMethod:     { type: String, default: 'paystack' },
    status:            { type: String, default: 'completed', enum: ['pending', 'completed', 'refunded'] },
    paidAt:            { type: Date, required: true }
  },
  { timestamps: true }
);

EnrollmentSchema.index({ emailCanonical: 1 });
EnrollmentSchema.index({ whatsappDigits: 1 });
EnrollmentSchema.index({ paystackReference: 1 });

const SupportTicketSchema = new mongoose.Schema(
  {
    ticketId:      { type: String, required: true, unique: true },
    sessionId:     { type: String, default: null },
    transactionId: { type: String, default: null },
    fullName:      { type: String, required: true },
    email:         { type: String, required: true, lowercase: true, trim: true },
    message:       { type: String, required: true },
    status:        { type: String, default: 'open', enum: ['open', 'in_progress', 'resolved'] }
  },
  { timestamps: true }
);

SupportTicketSchema.index({ email: 1 });

const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);
const SupportTicket = mongoose.model('SupportTicket', SupportTicketSchema);

// ── Connection ────────────────────────────────────────────────────────────────

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<user>') || uri.includes('<password>')) {
    console.warn('[Database] MONGODB_URI not configured. Running in-memory database mode for development.');
    await initCounters(null, null);
    return;
  }

  try {
    await mongoose.connect(uri, {
      dbName: 'olatunde_masterclass'
    });
    console.log('[Database] Connected to MongoDB Atlas successfully.');
    await initCounters(Enrollment, SupportTicket);
  } catch (err) {
    console.warn('[Database] Atlas connection failed:', err.message);
    console.warn('[Database] Falling back to in-memory database mode for development.');
    await initCounters(null, null);
  }
}

// ── Enrollment Queries ─────────────────────────────────────────────────────────

export async function insertEnrollment(data) {
  if (mongoose.connection.readyState === 1) {
    const doc = new Enrollment(data);
    return doc.save();
  }
  const item = { ...data, _id: Date.now().toString(), createdAt: new Date() };
  memoryEnrollments.push(item);
  return item;
}

export async function findEnrollmentByEmail(emailCanonical) {
  if (mongoose.connection.readyState === 1) {
    return Enrollment.findOne({ emailCanonical: emailCanonical.toLowerCase().trim() }).lean();
  }
  const target = emailCanonical.toLowerCase().trim();
  return memoryEnrollments.find(e => e.emailCanonical === target) || null;
}

export async function findEnrollmentByPhone(whatsappDigits) {
  const suffix = whatsappDigits.slice(-10);
  if (mongoose.connection.readyState === 1) {
    return Enrollment.findOne({
      whatsappDigits: { $regex: `${suffix}$` }
    }).lean();
  }
  return memoryEnrollments.find(e => e.whatsappDigits && e.whatsappDigits.endsWith(suffix)) || null;
}

export async function findEnrollmentByReference(paystackReference) {
  if (mongoose.connection.readyState === 1) {
    return Enrollment.findOne({ paystackReference }).lean();
  }
  return memoryEnrollments.find(e => e.paystackReference === paystackReference) || null;
}

export async function findEnrollmentByStripeSessionId(stripeSessionId) {
  if (mongoose.connection.readyState === 1) {
    return Enrollment.findOne({ stripeSessionId }).lean();
  }
  return memoryEnrollments.find(e => e.stripeSessionId === stripeSessionId) || null;
}

export async function findEnrollmentByTransactionId(transactionId) {
  if (mongoose.connection.readyState === 1) {
    return Enrollment.findOne({ transactionId }).lean();
  }
  return memoryEnrollments.find(e => e.transactionId === transactionId) || null;
}

export async function findEnrollmentByReceiptNumber(receiptNumber) {
  if (mongoose.connection.readyState === 1) {
    return Enrollment.findOne({ receiptNumber }).lean();
  }
  return memoryEnrollments.find(e => e.receiptNumber === receiptNumber) || null;
}

export async function getAllEnrollments() {
  if (mongoose.connection.readyState === 1) {
    return Enrollment.find({}).sort({ createdAt: 1 }).lean();
  }
  return memoryEnrollments;
}

// ── Support Ticket Queries ─────────────────────────────────────────────────────

export async function insertSupportTicket(data) {
  if (mongoose.connection.readyState === 1) {
    const doc = new SupportTicket(data);
    return doc.save();
  }
  const item = { ...data, _id: Date.now().toString(), createdAt: new Date() };
  memoryTickets.push(item);
  return item;
}

export { Enrollment, SupportTicket };

