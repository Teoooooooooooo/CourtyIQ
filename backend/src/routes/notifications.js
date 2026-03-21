const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authenticate = require('../middleware/authenticate');

// ── GET /api/v1/notifications — Get user's notifications ──
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/v1/notifications/:id/read — Mark as read ─────
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif || notif.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
