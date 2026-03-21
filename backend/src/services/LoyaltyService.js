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
