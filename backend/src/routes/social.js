/**
 * Social Routes — challenge system
 */

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/authenticate');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// POST /api/v1/social/challenge
// Body: { targetUserId, proposedTime, courtId? }
// ---------------------------------------------------------------------------
router.post('/challenge', authenticate, async (req, res, next) => {
    try {
        const fromUserId = req.user.userId;
        const { targetUserId, proposedTime, courtId } = req.body;

        if (!targetUserId || !proposedTime) {
            return res.status(400).json({ error: 'targetUserId and proposedTime are required' });
        }
        if (targetUserId === fromUserId) {
            return res.status(400).json({ error: 'Cannot challenge yourself' });
        }

        const challenge = await prisma.challenge.create({
            data: {
                fromUserId,
                toUserId: targetUserId,
                proposedTime: new Date(proposedTime),
                courtId: courtId ?? null,
                status: 'pending',
            },
        });

        res.status(201).json({ challenge });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/v1/social/challenges/incoming
// ---------------------------------------------------------------------------
router.get('/challenges/incoming', authenticate, async (req, res, next) => {
    try {
        const toUserId = req.user.userId;

        const challenges = await prisma.challenge.findMany({
            where: { toUserId, status: 'pending' },
            orderBy: { createdAt: 'desc' },
        });

        // Hydrate fromUser profiles and names
        const userIds = [...new Set(challenges.map((c) => c.fromUserId))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            include: { profile: true },
        });
        const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

        const result = challenges.map((c) => {
            const u = userMap[c.fromUserId];
            return {
                ...c,
                fromUserName: u?.name ?? null,
                fromUserProfile: u?.profile ?? null,
            };
        });

        res.json({ challenges: result });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/social/challenges/:id
// Body: { action: "accept" | "decline" }
// ---------------------------------------------------------------------------
router.put('/challenges/:id', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { action } = req.body;

        if (!['accept', 'decline'].includes(action)) {
            return res.status(400).json({ error: 'action must be "accept" or "decline"' });
        }

        const existing = await prisma.challenge.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Challenge not found' });
        if (existing.toUserId !== userId) return res.status(403).json({ error: 'Forbidden' });
        if (existing.status !== 'pending') return res.status(409).json({ error: 'Challenge already resolved' });

        const challenge = await prisma.challenge.update({
            where: { id },
            data: { status: action === 'accept' ? 'accepted' : 'declined' },
        });

        res.json({ challenge });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
