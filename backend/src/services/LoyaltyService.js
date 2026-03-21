const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const POINTS = {
  booking_confirmed: 50,
  match_won: 40,
  match_played: 30,
};

async function awardPoints(userId, reason) {
  const points = POINTS[reason];
  if (!points) return;
  await prisma.loyaltyPoint.create({
    data: { userId, points, reason },
  });
}

async function getTotal(userId) {
  const result = await prisma.loyaltyPoint.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  const total = result._sum.points || 0;
  const tier =
    total >= 5000
      ? 'Platinum'
      : total >= 2000
        ? 'Gold'
        : total >= 500
          ? 'Silver'
          : 'Bronze';
  const nextTierThresholds = {
    Bronze: 500,
    Silver: 2000,
    Gold: 5000,
    Platinum: null,
  };
  return { total, tier, nextTierAt: nextTierThresholds[tier] };
}

module.exports = { awardPoints, getTotal };
