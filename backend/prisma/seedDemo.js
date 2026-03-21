const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data...');

  const peakHours = [{ day: 'MON-FRI', start: '17:00', end: '21:00' }];

  // ── 5 Clubs ────────────────────────────────────────────
  const clubsData = [
    { name: 'Padel City Arena', address: 'Str. Sporturilor 12, Bucharest', lat: 44.46, lng: 26.10 },
    { name: 'Smash Club', address: 'Bd. Unirii 45, Bucharest', lat: 44.47, lng: 26.09 },
    { name: 'Arena Pro', address: 'Calea Victoriei 100, Bucharest', lat: 44.45, lng: 26.08 },
    { name: 'Padel Paradise', address: 'Str. Floreasca 22, Bucharest', lat: 44.48, lng: 26.11 },
    { name: 'Court Royale', address: 'Bd. Aviatorilor 70, Bucharest', lat: 44.46, lng: 26.07 },
  ];

  const clubs = [];
  for (const cd of clubsData) {
    const club = await prisma.club.create({ data: cd });
    clubs.push(club);
  }

  // ── 3 Courts per club ─────────────────────────────────
  const courtTypes = ['outdoor', 'indoor', 'outdoor'];
  const basePrices = [10, 15, 20];

  for (const club of clubs) {
    for (let i = 0; i < 3; i++) {
      await prisma.court.create({
        data: {
          clubId: club.id,
          name: `Court ${i + 1}`,
          type: courtTypes[i],
          basePrice: basePrices[i],
          peakMultiplier: 1.5,
          peakHours,
        },
      });
    }
  }

  // ── 20 Players with varied stats ──────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);
  const playStyles = ['all-court', 'aggressive', 'defensive', 'net-rusher', 'baseline'];

  const playerIds = [];
  for (let i = 1; i <= 20; i++) {
    const elo = 800 + Math.floor(Math.random() * 600);      // 800–1400
    const skill = +(2.5 + Math.random() * 2).toFixed(1);     // 2.5–4.5
    const style = playStyles[i % playStyles.length];
    const wins = Math.floor(Math.random() * 50);
    const losses = Math.floor(Math.random() * 40);

    const user = await prisma.user.create({
      data: {
        email: `player${i}@test.com`,
        passwordHash,
        name: `Player ${i}`,
        profile: {
          create: {
            skillLevel: skill,
            eloRating: elo,
            playStyle: style,
            location: 'Bucharest',
            stats: { wins, losses, lastFive: [] },
          },
        },
      },
    });
    playerIds.push(user.id);
  }

  // ── Demo account ───────────────────────────────────────
  const demoHash = await bcrypt.hash('demo123', 10);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@courtiq.com',
      passwordHash: demoHash,
      name: 'Demo Player',
      profile: {
        create: {
          skillLevel: 3.8,
          eloRating: 1150,
          playStyle: 'all-court',
          location: 'Bucharest',
          stats: { wins: 24, losses: 12, lastFive: ['W', 'W', 'L', 'W', 'L'] },
        },
      },
      subscription: {
        create: {
          tier: 'pro',
          creditsTotal: 20,
          creditsRemaining: 18,
          renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // Demo loyalty points — Silver tier (1240 pts)
  await prisma.loyaltyPoint.createMany({
    data: [
      { userId: demoUser.id, points: 500, reason: 'Welcome bonus' },
      { userId: demoUser.id, points: 300, reason: 'Booking streak' },
      { userId: demoUser.id, points: 240, reason: 'Match win bonus' },
      { userId: demoUser.id, points: 200, reason: 'Referral' },
    ],
  });

  // Demo bookings — 3 upcoming confirmed
  const courts = await prisma.court.findMany({ take: 3 });
  const now = new Date();

  for (let i = 0; i < 3; i++) {
    const start = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start.getTime() + 90 * 60 * 1000); // 1.5 hours

    await prisma.booking.create({
      data: {
        courtId: courts[i].id,
        organizerId: demoUser.id,
        startTime: start,
        endTime: end,
        status: 'confirmed',
        totalPrice: courts[i].basePrice,
        playerIds: [demoUser.id, playerIds[i]],
      },
    });
  }

  console.log('✅ Demo seed complete: 5 clubs, 15 courts, 21 players (incl. demo), 3 bookings');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
