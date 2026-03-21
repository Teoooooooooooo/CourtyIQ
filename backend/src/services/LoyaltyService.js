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
    async awardPoints(userId, reason, override = null) {
        const points = override !== null ? override : (POINT_VALUES[reason] ?? 10);
        await prisma.loyaltyPoint.create({
            data: { userId, points, reason },
        });
        return points;
    }

    async getTotal(userId) {
        const rows = await prisma.loyaltyPoint.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        const total = rows.reduce((sum, r) => sum + r.points, 0);

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
