const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const LoyaltyService = require('../services/LoyaltyService');

router.get('/:id/public', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { profile: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      name: user.name,
      profile: user.profile
    });
  } catch (err) {
    next(err);
  }
});

// Protect all following routes
router.use(authenticate);

router.get('/me', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        profile: true,
        subscription: true
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const loyalty = await LoyaltyService.getTotal(req.user.userId);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile,
      subscription: user.subscription,
      loyaltyTotal: loyalty.total
    });
  } catch (err) {
    next(err);
  }
});

router.put('/me/profile', async (req, res, next) => {
  try {
    const { skillLevel, playStyle, location } = req.body;
    const updateData = {};
    
    if (skillLevel !== undefined) updateData.skillLevel = skillLevel;
    if (playStyle !== undefined) updateData.playStyle = playStyle;
    if (location !== undefined) updateData.location = location;

    const profile = await prisma.playerProfile.update({
      where: { userId: req.user.userId },
      data: updateData
    });

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const q = req.query.q || '';
    if (q.length < 2) return res.json([]);

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.user.userId } },
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } }
            ]
          }
        ]
      },
      take: 10,
      select: { id: true, name: true, profile: { select: { skillLevel: true } } }
    });

    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.put('/me/stats', async (req, res, next) => {
  try {
    const { bookingId, outcome } = req.body;
    if (!['W', 'L'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be W or L' });
    }

    if (bookingId) {
      // Mark booking as recorded so it doesn't prompt again
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'recorded' }
      });
    }

    const profile = await prisma.playerProfile.findUnique({
      where: { userId: req.user.userId }
    });
    
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const stats = typeof profile.stats === 'string' ? JSON.parse(profile.stats) : (profile.stats || { wins: 0, losses: 0, lastFive: [] });
    
    stats.wins = (stats.wins || 0) + (outcome === 'W' ? 1 : 0);
    stats.losses = (stats.losses || 0) + (outcome === 'L' ? 1 : 0);
    stats.lastFive = [...(stats.lastFive || []), outcome].slice(-5);

    const updated = await prisma.playerProfile.update({
      where: { userId: req.user.userId },
      data: { stats }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/me/bookings', async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { organizerId: req.user.userId },
          { playerIds: { array_contains: req.user.userId } }
        ]
      },
      include: {
        court: {
          include: { club: true }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    // Gather all unique playerIds from all bookings to hydrate their names
    const allPlayerIds = new Set();
    bookings.forEach(b => {
      let pIds = [];
      try { pIds = typeof b.playerIds === 'string' ? JSON.parse(b.playerIds) : (b.playerIds || []); } catch (e) {}
      if (Array.isArray(pIds)) pIds.forEach(id => allPlayerIds.add(id));
      else if (typeof pIds === 'string') allPlayerIds.add(pIds); // Just in case
    });

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(allPlayerIds) } },
      select: { id: true, name: true, profile: { select: { skillLevel: true } } }
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const result = bookings.map(b => {
      let pIds = [];
      try { pIds = typeof b.playerIds === 'string' ? JSON.parse(b.playerIds) : (b.playerIds || []); } catch (e) {}
      if (!Array.isArray(pIds)) pIds = [];
      
      return {
        ...b,
        players: pIds.map(id => userMap[id]).filter(Boolean)
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
