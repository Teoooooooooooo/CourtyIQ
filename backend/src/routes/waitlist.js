const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authenticate = require('../middleware/authenticate');

// ── POST /api/v1/waitlist — Join waitlist ────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { courtId, slotStart } = req.body;
    const userId = req.user.userId;

    // Find max position for this court+slot
    const maxEntry = await prisma.waitlist.findFirst({
      where: { courtId, slotStart: new Date(slotStart) },
      orderBy: { position: 'desc' },
    });

    const position = maxEntry ? maxEntry.position + 1 : 1;

    const entry = await prisma.waitlist.create({
      data: {
        courtId,
        userId,
        slotStart: new Date(slotStart),
        position,
      },
    });

    res.status(201).json({ position, waitlistId: entry.id });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/v1/waitlist/:id — Leave waitlist ─────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const entry = await prisma.waitlist.findUnique({
      where: { id: req.params.id },
    });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    if (entry.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.waitlist.delete({ where: { id: entry.id } });
    res.json({ removed: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/waitlist/me — My waitlist entries ────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const entries = await prisma.waitlist.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: { court: { include: { club: true } } },
    });
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// ── Ping ─────────────────────────────────────────────────
router.get('/ping', (req, res) => res.json({ ok: true }));

module.exports = router;
