/**
 * Olatunde Daniel Masterclass — Express API Server
 * Handles payment initiation, webhook verification, enrollment persistence,
 * and support ticket routing.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDatabase } from './services/database.js';
import paymentRouter from './routes/payment.js';
import webhookRouter from './routes/webhook.js';
import supportRouter from './routes/support.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ── CORS ──────────────────────────────────────────────────────────────────────
const isAllowedOrigin = (origin) => {
  if (!origin) return true; // server-to-server, curl, mobile native, webhooks
  if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') return true;
  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return true;
  // Allow all local network IP origins (e.g. 10.x, 192.168.x, 172.16-31.x on port 5173/3000/etc.)
  if (/^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
    return true;
  }
  // Allow Vercel, Netlify, and Render staging/production URLs
  if (/^https?:\/\/.*(onrender\.com|vercel\.app|netlify\.app)$/.test(origin)) {
    return true;
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error(`CORS policy: origin ${origin} is not allowed.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature', 'x-paystack-signature']
  })
);

// ── Body Parsers ──────────────────────────────────────────────────────────────
// Webhook route needs the raw body for HMAC signature verification — must be
// registered BEFORE express.json() to preserve the raw buffer on that route.
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10kb' }));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Olatunde Daniel Masterclass API',
    timestamp: new Date().toISOString()
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/payment', paymentRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/support', supportRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  await connectDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Olatunde Daniel API running on port ${PORT} (0.0.0.0)`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

boot().catch((err) => {
  console.error('[Boot Error]', err.message);
  process.exit(1);
});
