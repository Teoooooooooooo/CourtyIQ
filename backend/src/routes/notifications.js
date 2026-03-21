const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authenticate = require('../middleware/authenticate');

// Protect all routes
router.use(authenticate);

// ── GET /api/v1/notifications ────────────────────────────
// Fetch notifications for the logged-in user
router.get('/', async (req, res, next) => {
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

// ── PUT /api/v1/notifications/:id/read ───────────────────
// Mark a specific notification as read
router.put('/:id/read', async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    if (notification.userId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/v1/notifications/read-all ───────────────────
// Mark all notifications as read
router.put('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, read: false },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
