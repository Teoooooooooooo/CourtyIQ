/**
 * Pass Routes — subscription management
 */

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/authenticate');

const prisma = new PrismaClient();

const TIERS = { basic: 10, pro: 20, elite: 40 };

function getPerks(tier) {
    return tier === 'elite' ? ['Free court upgrade', 'Priority waitlist', 'Free racket rental'] :
           tier === 'pro' ? ['Free court upgrade', 'Priority waitlist'] :
           ['Free court upgrade'];
}

// ---------------------------------------------------------------------------
// GET /api/v1/pass/me
// ---------------------------------------------------------------------------
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const sub = await prisma.subscription.findUnique({ where: { userId } });

        if (!sub) {
            return res.json({ tier: null, creditsRemaining: 0, creditsTotal: 0, renewsAt: null, perks: [], pendingTier: null });
        }

        res.json({ ...sub, perks: getPerks(sub.tier) });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// POST /api/v1/pass/subscribe
// Body: { tier: "basic" | "pro" | "elite" }
// Deferred: the new plan only activates after the current billing period ends.
// ---------------------------------------------------------------------------
router.post('/subscribe', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { tier } = req.body;

        if (!TIERS[tier]) {
            return res.status(400).json({ error: `tier must be one of: ${Object.keys(TIERS).join(', ')}` });
        }

        const existing = await prisma.subscription.findUnique({ where: { userId } });

        // If user has no subscription yet, create one immediately
        if (!existing) {
            const credits = TIERS[tier];
            const renewsAt = new Date();
            renewsAt.setDate(renewsAt.getDate() + 30);

            const subscription = await prisma.subscription.create({
                data: { userId, tier, creditsTotal: credits, creditsRemaining: credits, renewsAt },
            });

            return res.status(200).json({
                ...subscription,
                perks: getPerks(tier),
                message: `Subscribed to ${tier} plan!`
            });
        }

        // If already on this tier, but had a pending change, cancel the pending change
        if (existing.tier === tier) {
            if (existing.pendingTier) {
                const subscription = await prisma.subscription.update({
                    where: { userId },
                    data: { pendingTier: null },
                });
                return res.status(200).json({
                    ...subscription,
                    perks: getPerks(subscription.tier),
                    message: "Pending plan change cancelled. You will remain on your current plan."
                });
            }

            return res.status(200).json({
                ...existing,
                perks: getPerks(existing.tier),
                pendingTier: null,
                message: `You are already on the ${tier} plan.`
            });
        }

        // Otherwise, defer the change — set pendingTier, keep current credits unchanged
        const subscription = await prisma.subscription.update({
            where: { userId },
            data: { pendingTier: tier },
        });

        const renewsDate = subscription.renewsAt
            ? new Date(subscription.renewsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : 'the next billing cycle';

        res.status(200).json({
            ...subscription,
            perks: getPerks(subscription.tier),
            message: `Your ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan will start on ${renewsDate}. Until then, your current credits remain unchanged.`
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
