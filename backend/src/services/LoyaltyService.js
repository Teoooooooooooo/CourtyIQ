/**
 * LoyaltyService — award and query loyalty points
 * Writes to the LoyaltyPoint model defined in schema.prisma.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Points earned per reason
const POINT_VALUES = {
    match_played: 30,
    match_won: 40,
    booking_offpeak: 20,
    booking_completed: 10,
};

// Tier thresholds (lifetime points)
const TIERS = [
    { name: 'bronze', minPoints: 0 },
    { name: 'silver', minPoints: 200 },
    { name: 'gold', minPoints: 500 },
    { name: 'platinum', minPoints: 1000 },
];

class LoyaltyService {
    /**
     * Award points to a user for a given reason.
     * @param {string} userId
     * @param {string} reason - one of the POINT_VALUES keys
     * @param {number} [override] - custom point override (optional)
     */
    async awardPoints(userId, reason, override = null) {
        const points = override !== null ? override : (POINT_VALUES[reason] ?? 10);
        await prisma.loyaltyPoint.create({
            data: { userId, points, reason },
        });
        return points;
    }

    /**
     * Get total points, tier, and next tier threshold for a user.
     * @param {string} userId
     * @returns {{ total, tier, nextTierAt, recentPoints }}
     */
    async getTotal(userId) {
        const rows = await prisma.loyaltyPoint.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        const total = rows.reduce((sum, r) => sum + r.points, 0);

        // Determine current tier (highest threshold not exceeding total)
        let currentTier = TIERS[0];
        let nextTier = null;
        for (let i = TIERS.length - 1; i >= 0; i--) {
            if (total >= TIERS[i].minPoints) {
                currentTier = TIERS[i];
                nextTier = TIERS[i + 1] || null;
                break;
            }
        }

        return {
            total,
            tier: currentTier.name,
            nextTierAt: nextTier ? nextTier.minPoints : null,
            recentPoints: rows.slice(0, 10),
        };
    }
}

module.exports = new LoyaltyService();
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
