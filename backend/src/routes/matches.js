/**
 * Matches Routes — record match results, update Elo ratings, award loyalty points
 */

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/authenticate');
const EloService = require('../services/EloService');
const LoyaltyService = require('../services/LoyaltyService');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// POST /api/v1/matches
// Body: { bookingId?, team1Ids, team2Ids, winnerTeam }
// ---------------------------------------------------------------------------
router.post('/', authenticate, async (req, res, next) => {
    try {
        const { bookingId, team1Ids, team2Ids, winnerTeam } = req.body;

        if (!team1Ids?.length || !team2Ids?.length) {
            return res.status(400).json({ error: 'team1Ids and team2Ids are required' });
        }
        if (![1, 2].includes(winnerTeam)) {
            return res.status(400).json({ error: 'winnerTeam must be 1 or 2' });
        }

        const allIds = [...team1Ids, ...team2Ids];

        // 1. Fetch all 4 players' profiles
        const profiles = await prisma.playerProfile.findMany({
            where: { userId: { in: allIds } },
            include: { user: { select: { name: true } } },
        });
        const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p]));

        const team1Ratings = team1Ids.map((id) => profileMap[id]?.eloRating ?? 1000);
        const team2Ratings = team2Ids.map((id) => profileMap[id]?.eloRating ?? 1000);

        const winnersRatings = winnerTeam === 1 ? team1Ratings : team2Ratings;
        const losersRatings = winnerTeam === 1 ? team2Ratings : team1Ratings;
        const winnerIds = winnerTeam === 1 ? team1Ids : team2Ids;
        const loserIds = winnerTeam === 1 ? team2Ids : team1Ids;

        // 2. Compute Elo deltas
        const { winnerDelta, loserDelta } = EloService.updateRatings(winnersRatings, losersRatings);

        // Build per-player delta map
        const eloDelta = {};
        winnerIds.forEach((id) => { eloDelta[id] = winnerDelta; });
        loserIds.forEach((id) => { eloDelta[id] = loserDelta; });

        // 3. Update all profiles in a transaction + create Match record
        const eloChanges = [];

        const match = await prisma.$transaction(async (tx) => {
            for (const id of allIds) {
                const profile = profileMap[id];
                if (!profile) continue;

                const delta = eloDelta[id];
                const oldElo = profile.eloRating;
                const newElo = Math.max(100, oldElo + delta); // floor at 100
                const isWinner = winnerIds.includes(id);

                // Update stats JSONB
                const stats = typeof profile.stats === 'string'
                    ? JSON.parse(profile.stats)
                    : profile.stats;

                const outcome = isWinner ? 'W' : 'L';
                const lastFive = [...(stats.lastFive ?? []), outcome].slice(-5);

                await tx.playerProfile.update({
                    where: { userId: id },
                    data: {
                        eloRating: newElo,
                        stats: {
                            wins: (stats.wins ?? 0) + (isWinner ? 1 : 0),
                            losses: (stats.losses ?? 0) + (isWinner ? 0 : 1),
                            lastFive,
                        },
                    },
                });

                eloChanges.push({
                    userId: id,
                    name: profile.user?.name ?? id,
                    oldElo,
                    newElo,
                    delta,
                });
            }

            // Create match record
            return tx.match.create({
                data: {
                    bookingId: bookingId ?? null,
                    team1Ids,
                    team2Ids,
                    winnerTeam,
                    eloDelta,
                },
            });
        });

        // 4. Award loyalty points (outside transaction, non-critical)
        await Promise.allSettled(
            allIds.map(async (id) => {
                await LoyaltyService.awardPoints(id, 'match_played');
                if (winnerIds.includes(id)) {
                    await LoyaltyService.awardPoints(id, 'match_won');
                }
            })
        );

        res.status(201).json({ match, eloChanges });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/v1/matches/h2h/:userId
// ---------------------------------------------------------------------------
router.get('/h2h/:userId', authenticate, async (req, res, next) => {
    try {
        const myId = req.user.userId;
        const targetId = req.params.userId;

        // Find all matches where both users appear
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
                            { team1Ids: { array_contains: targetId } },
                            { team2Ids: { array_contains: targetId } },
                        ],
                    },
                ],
            },
            orderBy: { createdAt: 'desc' },
        });

        let wins = 0, losses = 0;
        const lastMatches = [];

        for (const m of allMatches) {
            const t1 = Array.isArray(m.team1Ids) ? m.team1Ids : JSON.parse(m.team1Ids);
            const myTeam = t1.includes(myId) ? 1 : 2;
            const won = m.winnerTeam === myTeam;
            if (won) wins++; else losses++;

            if (lastMatches.length < 10) {
                lastMatches.push({
                    id: m.id,
                    createdAt: m.createdAt,
                    winnerTeam: m.winnerTeam,
                    myTeam,
                    result: won ? 'win' : 'loss',
                });
            }
        }

        const total = wins + losses;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        res.json({ wins, losses, total, winRate, lastMatches });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// GET /api/v1/matches/me — current user's match history
// ---------------------------------------------------------------------------
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const myId = req.user.userId;

        // Fetch all matches where user participated
        const matches = await prisma.match.findMany({
            where: {
                OR: [
                    { team1Ids: { array_contains: myId } },
                    { team2Ids: { array_contains: myId } },
                ],
            },
            orderBy: { createdAt: 'desc' },
        });

        // Manual join with bookings since no schema relation
        const bookingIds = [...new Set(matches.map(m => m.bookingId))].filter(Boolean);
        let bookings = [];
        if (bookingIds.length > 0) {
            bookings = await prisma.booking.findMany({
                where: { id: { in: bookingIds } },
                include: {
                    court: {
                        include: { club: true }
                    }
                }
            });
        }

        const bookingMap = Object.fromEntries(bookings.map(b => [b.id, b]));

        // Fetch all unique user names involved in these matches
        const allUserIds = new Set();
        matches.forEach(m => {
            m.team1Ids.forEach(id => allUserIds.add(id));
            m.team2Ids.forEach(id => allUserIds.add(id));
        });

        const players = await prisma.user.findMany({
            where: { id: { in: Array.from(allUserIds) } },
            select: { id: true, name: true }
        });
        const userMap = Object.fromEntries(players.map(u => [u.id, u.name]));

        // Get a fallback club for matches without bookings (demo data)
        const fallbackClub = await prisma.club.findFirst();

        const results = matches.map(m => {
            const b = bookingMap[m.bookingId];
            return {
                ...m,
                clubName: b?.court?.club?.name || fallbackClub?.name || 'Padel City',
                courtName: b?.court?.name || 'Center Court',
                date: b?.startTime || m.createdAt,
                team1Names: m.team1Ids.map(id => userMap[id] || 'Unknown'),
                team2Names: m.team2Ids.map(id => userMap[id] || 'Unknown')
            };
        });

        res.json(results);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
