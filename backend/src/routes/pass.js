/**
 * Pass Routes — subscription management
 */

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/authenticate');

const prisma = new PrismaClient();

const TIERS = { basic: 10, pro: 20, elite: 40 };

// ---------------------------------------------------------------------------
// GET /api/v1/pass/me
// ---------------------------------------------------------------------------
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const sub = await prisma.subscription.findUnique({ where: { userId } });

        if (!sub) {
            return res.json({ tier: null, creditsRemaining: 0, creditsTotal: 0, renewsAt: null });
        }

        res.json({ subscription: sub });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// POST /api/v1/pass/subscribe
// Body: { tier: "basic" | "pro" | "elite" }
// ---------------------------------------------------------------------------
router.post('/subscribe', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { tier } = req.body;

        if (!TIERS[tier]) {
            return res.status(400).json({ error: `tier must be one of: ${Object.keys(TIERS).join(', ')}` });
        }

        const credits = TIERS[tier];
        const renewsAt = new Date();
        renewsAt.setDate(renewsAt.getDate() + 30);

        const subscription = await prisma.subscription.upsert({
            where: { userId },
            create: { userId, tier, creditsTotal: credits, creditsRemaining: credits, renewsAt },
            update: { tier, creditsTotal: credits, creditsRemaining: credits, renewsAt },
        });

        res.status(200).json({ subscription });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
