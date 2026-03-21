const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authenticate = require('../middleware/authenticate');

// ── GET /api/v1/club-dashboard — Revenue dashboard data ──
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Verify the user is a club owner
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'club') {
      return res.status(403).json({ error: 'Only club accounts can access the dashboard' });
    }

    // Find all clubs owned by this user
    const clubs = await prisma.club.findMany({
      where: { ownerUserId: userId },
      include: {
        courts: {
          include: {
            bookings: {
              where: { status: 'confirmed' },
              orderBy: { createdAt: 'desc' },
              include: { organizer: { select: { id: true, name: true } } }
            }
          }
        }
      }
    });

    if (clubs.length === 0) {
      return res.json({ clubs: [], summary: { totalRevenue: 0, totalBookings: 0, averagePerBooking: 0, peakHour: null, revenueByDay: [], courtBreakdown: [] } });
    }

    // Aggregate all bookings across all clubs
    const allBookings = [];
    const courtBreakdown = [];

    for (const club of clubs) {
      for (const court of club.courts) {
        let courtRevenue = 0;
        let courtBookingCount = 0;
        let courtCreditBookings = 0;

        for (const booking of court.bookings) {
          allBookings.push({ ...booking, courtName: court.name, clubName: club.name, clubId: club.id });
          courtRevenue += Number(booking.totalPrice);
          courtBookingCount++;
          if (booking.creditsUsed > 0) courtCreditBookings++;
        }

        courtBreakdown.push({
          courtId: court.id,
          courtName: court.name,
          clubName: club.name,
          type: court.type,
          revenue: Math.round(courtRevenue * 100) / 100,
          bookings: courtBookingCount,
          creditBookings: courtCreditBookings,
          cardBookings: courtBookingCount - courtCreditBookings,
        });
      }
    }

    // Compute summary stats
    const totalRevenue = allBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);
    const totalBookings = allBookings.length;
    const averagePerBooking = totalBookings > 0 ? Math.round((totalRevenue / totalBookings) * 100) / 100 : 0;

    // Revenue grouped by day (last 30 days)
    const dayMap = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dayMap[key] = 0;
    }

    for (const b of allBookings) {
      const key = new Date(b.createdAt).toISOString().split('T')[0];
      if (dayMap[key] !== undefined) {
        dayMap[key] += Number(b.totalPrice);
      }
    }

    const revenueByDay = Object.entries(dayMap).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100
    }));

    // Peak hour analysis
    const hourCounts = {};
    for (const b of allBookings) {
      const hour = new Date(b.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    let peakHour = null;
    let peakCount = 0;
    for (const [hour, count] of Object.entries(hourCounts)) {
      if (count > peakCount) {
        peakHour = parseInt(hour);
        peakCount = count;
      }
    }

    // Recent bookings (last 20)
    const recentBookings = allBookings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map(b => ({
        id: b.id,
        courtName: b.courtName,
        clubName: b.clubName,
        clubId: b.clubId,
        organizerId: b.organizerId,
        organizer: b.organizer?.name || 'Unknown',
        startTime: b.startTime,
        endTime: b.endTime,
        totalPrice: Number(b.totalPrice),
        creditsUsed: b.creditsUsed,
        createdAt: b.createdAt,
      }));

    // Occupancy rate (bookings today / total available slots)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayBookings = allBookings.filter(b => {
      const st = new Date(b.startTime);
      return st >= todayStart && st <= todayEnd;
    }).length;
    const totalCourts = clubs.reduce((sum, c) => sum + c.courts.length, 0);
    const slotsPerCourt = 14; // Assume 14 hours of operation (8AM-10PM)
    const occupancyRate = totalCourts > 0 ? Math.round((todayBookings / (totalCourts * slotsPerCourt)) * 100) : 0;

    // Fetch banned users for these clubs
    const clubIds = clubs.map(c => c.id);
    const bannedUsersData = await prisma.bannedUser.findMany({
      where: { clubId: { in: clubIds } },
      orderBy: { createdAt: 'desc' }
    });
    const bannedUserIds = [...new Set(bannedUsersData.map(b => b.userId))];
    const bannedUsersMap = await prisma.user.findMany({
      where: { id: { in: bannedUserIds } },
      select: { id: true, name: true, email: true }
    });
    const bannedUsersList = bannedUsersData.map(b => {
      const u = bannedUsersMap.find(user => user.id === b.userId);
      const c = clubs.find(club => club.id === b.clubId);
      return {
        id: b.id,
        clubId: b.clubId,
        clubName: c ? c.name : 'Unknown',
        userId: b.userId,
        userName: u ? u.name : 'Unknown User',
        userEmail: u ? u.email : '',
        reason: b.reason,
        createdAt: b.createdAt
      };
    });

    res.json({
      clubs: clubs.map(c => ({ id: c.id, name: c.name, courtCount: c.courts.length })),
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalBookings,
        averagePerBooking,
        peakHour: peakHour !== null ? `${peakHour}:00` : 'N/A',
        occupancyRate,
        todayBookings,
        totalCourts,
        revenueByDay,
        courtBreakdown,
        recentBookings,
        bannedUsers: bannedUsersList,
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/club-dashboard/ban — Ban a user ─────────
// Body: { userId, clubId, reason? }
router.post('/ban', authenticate, async (req, res, next) => {
  try {
    const ownerId = req.user.userId;
    const { userId, clubId, reason } = req.body;

    if (!userId || !clubId) {
      return res.status(400).json({ error: 'userId and clubId are required' });
    }

    // Verify the requesting user owns the club
    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner || owner.role !== 'club') {
      return res.status(403).json({ error: 'Only club accounts can ban users' });
    }

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club || club.ownerUserId !== ownerId) {
      return res.status(403).json({ error: 'You do not own this club' });
    }

    // Check if already banned
    const existing = await prisma.bannedUser.findUnique({
      where: { clubId_userId: { clubId, userId } }
    });
    if (existing) {
      return res.status(409).json({ error: 'User is already banned from this club' });
    }

    // Create the ban
    await prisma.bannedUser.create({
      data: { clubId, userId, reason: reason || null }
    });

    // Send notification to the banned user
    await prisma.notification.create({
      data: {
        userId,
        type: 'ban',
        title: `Banned from ${club.name}`,
        message: reason
          ? `You have been banned from ${club.name}. Reason: ${reason}`
          : `You have been banned from ${club.name}. Contact the club for more information.`,
      }
    });

    res.json({ success: true, message: `User banned from ${club.name}` });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/club-dashboard/unban — Unban a user ───────
// Body: { userId, clubId }
router.post('/unban', authenticate, async (req, res, next) => {
  try {
    const ownerId = req.user.userId;
    const { userId, clubId } = req.body;

    if (!userId || !clubId) {
      return res.status(400).json({ error: 'userId and clubId are required' });
    }

    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club || club.ownerUserId !== ownerId) {
      return res.status(403).json({ error: 'You do not own this club' });
    }

    await prisma.bannedUser.deleteMany({
      where: { clubId, userId }
    });

    res.json({ success: true, message: 'User unbanned successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
