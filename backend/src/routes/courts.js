const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authenticate = require('../middleware/authenticate');

// In-memory subscriber maps
const courtSubscribers = new Map();
const userSubscribers = new Map();

// ── Court SSE stream ────────────────────────────────────
// GET /api/v1/courts/:id/stream
router.get('/:id/stream', (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  if (!courtSubscribers.has(id)) courtSubscribers.set(id, new Set());
  courtSubscribers.get(id).add(res);

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    courtSubscribers.get(id)?.delete(res);
  });
});

// ── User personal SSE stream ────────────────────────────
// GET /api/v1/courts/me/stream  (mounted under /courts, but serves user events)
router.get('/me/stream', authenticate, (req, res) => {
  const userId = req.user.userId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  if (!userSubscribers.has(userId)) userSubscribers.set(userId, new Set());
  userSubscribers.get(userId).add(res);

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    userSubscribers.get(userId)?.delete(res);
  });
});

// ── Ping (keep existing) ────────────────────────────────
router.get('/ping', (req, res) => res.json({ ok: true }));

// ── Broadcast helpers ────────────────────────────────────
function broadcastToCourtSubscribers(courtId, data) {
  const subs = courtSubscribers.get(courtId);
  if (!subs) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  subs.forEach((r) => r.write(payload));
}

function broadcastToUser(userId, event, data) {
  const subs = userSubscribers.get(userId);
  if (!subs) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  subs.forEach((r) => r.write(payload));
}

module.exports = router;
module.exports.broadcastToCourtSubscribers = broadcastToCourtSubscribers;
module.exports.broadcastToUser = broadcastToUser;
