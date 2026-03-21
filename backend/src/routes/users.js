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

router.get('/me/bookings', async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { organizerId: req.user.userId },
      include: {
        court: {
          include: { club: true }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
