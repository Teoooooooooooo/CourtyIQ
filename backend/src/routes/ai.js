/**
 * AI Routes — partner matching, price oracle, slot suggestion, win predictor
 * All endpoints are protected and cache-aware.
 */

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/authenticate');
const AIService = require('../services/AIService');
const EloService = require('../services/EloService');
const cache = require('../utils/cache');
const { generateSlots } = require('../utils/slots');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GET /api/v1/ai/partner-matches
// ---------------------------------------------------------------------------
router.get('/partner-matches', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const cacheKey = `partner-matches:${userId}`;

        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        // 1. Current user's profile
        const myProfile = await prisma.playerProfile.findUnique({
            where: { userId },
            include: { user: { select: { name: true } } },
        });
        if (!myProfile) return res.status(404).json({ error: 'Player profile not found' });

        const currentUser = {
            userId,
            skillLevel: parseFloat(myProfile.skillLevel),
            eloRating: myProfile.eloRating,
            playStyle: myProfile.playStyle,
            location: myProfile.location,
            name: myProfile.user.name,
        };

        // 2. Find 10 candidates within ±400 Elo, excluding self
        const candidates = await prisma.playerProfile.findMany({
            where: {
                userId: { not: userId },
                eloRating: {
                    gte: myProfile.eloRating - 400,
                    lte: myProfile.eloRating + 400,
                },
            },
            take: 10,
            include: { user: { select: { name: true } } },
        });

        const candidateList = candidates.map((c) => ({
            userId: c.userId,
            skillLevel: parseFloat(c.skillLevel),
            eloRating: c.eloRating,
            playStyle: c.playStyle,
            location: c.location,
            name: c.user.name,
        }));

        // 3. Ask AI to score
        const aiResult = await AIService.getPartnerMatches(currentUser, candidateList);

        // 4. Hydrate with full profiles
        const profileMap = Object.fromEntries(candidateList.map((c) => [c.userId, c]));
        const mappedMatches = aiResult.matches
            .map((m) => ({ ...m, profile: profileMap[m.userId] || null }))
            .filter((m) => m.profile !== null);
            
        // Fallback in case AI hallucinates all IDs
        const result = {
            matches: mappedMatches.length > 0 ? mappedMatches : candidateList.map(c => ({
                userId: c.userId,
                score: Math.round(Math.max(40, 100 - Math.abs(c.eloRating - myProfile.eloRating) / 4)),
                reason: 'Similar Elo profile matches your playstyle closely',
                profile: c
            })).sort((a,b) => b.score - a.score).slice(0, 5)
        };

        cache.set(cacheKey, result, 120);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/v1/ai/price-oracle/:clubId
// ---------------------------------------------------------------------------
router.get('/price-oracle/:clubId', authenticate, async (req, res, next) => {
    try {
        const { clubId } = req.params;
        const cacheKey = `price-oracle:${clubId}`;

        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        // 1. Fetch club with its courts
        const club = await prisma.club.findUnique({
            where: { id: clubId },
            include: { courts: true },
        });
        if (!club) return res.status(404).json({ error: 'Club not found' });

        // 2. Generate slots for next 7 days across all courts
        const now = new Date();
        const end = new Date(now);
        end.setDate(end.getDate() + 7);

        const existingBookings = await prisma.booking.findMany({
            where: { court: { clubId }, startTime: { gte: now }, endTime: { lte: end } },
        });

        const allSlots = club.courts.flatMap((court) =>
            generateSlots({ ...court, club }, existingBookings)
        );
        const available = allSlots.filter((s) => s.status === 'available');

        // 3. AI picks top 5
        const aiResult = await AIService.getPriceOracle(club.name, available);
        const result = { clubId, clubName: club.name, ...aiResult };

        cache.set(cacheKey, result, 60);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/v1/ai/slot-suggestion
// ---------------------------------------------------------------------------
router.get('/slot-suggestion', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const cacheKey = `slot-suggestion:${userId}`;

        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        // 1. Last 10 bookings for user preferences
        const recentBookings = await prisma.booking.findMany({
            where: { organizerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { court: { include: { club: true } } },
        });
        const userStats = recentBookings.map((b) => ({
            day: new Date(b.startTime).getDay(),
            hour: new Date(b.startTime).getHours(),
            clubName: b.court.club.name,
            courtName: b.court.name,
        }));

        // 2. Recent partners from Match records
        const recentMatches = await prisma.match.findMany({
            where: {
                OR: [
                    { team1Ids: { array_contains: userId } },
                    { team2Ids: { array_contains: userId } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        const partnerIds = new Set();
        for (const m of recentMatches) {
            const t1 = Array.isArray(m.team1Ids) ? m.team1Ids : JSON.parse(m.team1Ids);
            const t2 = Array.isArray(m.team2Ids) ? m.team2Ids : JSON.parse(m.team2Ids);
            [...t1, ...t2].forEach((id) => { if (id !== userId) partnerIds.add(id); });
        }

        const partners = partnerIds.size > 0
            ? await prisma.user.findMany({
                where: { id: { in: [...partnerIds] } },
                select: { name: true },
            })
            : [];
        const partnerNames = partners.map((p) => p.name);

        // 3. Slots from up to 3 clubs
        const clubs = await prisma.club.findMany({
            take: 3,
            include: { courts: true },
        });

        const now = new Date();
        const end = new Date(now);
        end.setDate(end.getDate() + 7);
        const existingBookings = await prisma.booking.findMany({
            where: { startTime: { gte: now }, endTime: { lte: end } },
        });

        const allSlots = clubs.flatMap((club) =>
            club.courts.flatMap((court) =>
                generateSlots({ ...court, club }, existingBookings)
            )
        );
        const available = allSlots.filter((s) => s.status === 'available');

        // 4. AI picks one
        const aiResult = await AIService.getSmartSuggestion(userStats, partnerNames, available);

        cache.set(cacheKey, aiResult, 120);
        res.json(aiResult);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/v1/ai/win-predictor/:opponentId
// ---------------------------------------------------------------------------
router.get('/win-predictor/:opponentId', authenticate, async (req, res, next) => {
    try {
        const myId = req.user.userId;
        const opponentId = req.params.opponentId;

        // 1. Fetch both profiles
        const [myProfile, oppProfile] = await Promise.all([
            prisma.playerProfile.findUnique({ where: { userId: myId } }),
            prisma.playerProfile.findUnique({ where: { userId: opponentId } }),
        ]);
        if (!myProfile) return res.status(404).json({ error: 'Your profile not found' });
        if (!oppProfile) return res.status(404).json({ error: 'Opponent profile not found' });

        const myElo = myProfile.eloRating;
        const oppElo = oppProfile.eloRating;

        // 2. Elo win probability
        const winProb = EloService.winProbability(myElo, oppElo);

        // 3. Head-to-head from Match records
        const allMatches = await prisma.match.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { team1Ids: { array_contains: myId } },
                            { team2Ids: { array_contains: myId } },
                        ],
                    },
                    {
                        OR: [
                            { team1Ids: { array_contains: opponentId } },
                            { team2Ids: { array_contains: opponentId } },
                        ],
                    },
                ],
            },
            orderBy: { createdAt: 'desc' },
        });

        let wins = 0, losses = 0;
        for (const m of allMatches) {
            const t1 = Array.isArray(m.team1Ids) ? m.team1Ids : JSON.parse(m.team1Ids);
            const myTeam = t1.includes(myId) ? 1 : 2;
            if (m.winnerTeam === myTeam) wins++;
            else losses++;
        }
        const total = wins + losses;

        res.json({
            winProbability: winProb,
            opponentWinProbability: 100 - winProb,
            myElo,
            opponentElo: oppElo,
            h2h: { wins, losses, total },
            basis: total > 0
                ? `Elo ratings + ${total} head-to-head match${total !== 1 ? 'es' : ''}`
                : 'Elo ratings only (no head-to-head history)',
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
