const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Reset database safely for a hackathon
  await prisma.match.deleteMany({});
  await prisma.waitlist.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.court.deleteMany({});
  await prisma.club.deleteMany({});
  await prisma.loyaltyPoint.deleteMany({});
  await prisma.challenge.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.playerProfile.deleteMany({});
  await prisma.user.deleteMany({});

  // Clubs
  const clubsData = [
    { name: 'Padel City Arena', address: 'Str. Pipera 12, Voluntari', lat: 44.4934, lng: 26.1063 },
    { name: 'Smash Club Floreasca', address: 'Bd. Floreasca 88, Sector 1', lat: 44.4702, lng: 26.0953 },
    { name: 'Arena Pro Herastrau', address: 'Str. Nordului 7, Sector 1', lat: 44.4831, lng: 26.0782 },
  ];

  for (const c of clubsData) {
    const club = await prisma.club.create({ data: c });
    
    // 3 courts per club
    await prisma.court.create({
      data: {
        clubId: club.id, name: 'Court 1 - Outdoor', type: 'outdoor', basePrice: 12, peakMultiplier: 1.8,
        peakHours: [{ day: 'MON-FRI', start: '17:00', end: '21:00' }]
      }
    });
    await prisma.court.create({
      data: {
        clubId: club.id, name: 'Court 2 - Indoor', type: 'indoor', basePrice: 18, peakMultiplier: 1.5,
        peakHours: [{ day: 'MON-FRI', start: '17:00', end: '21:00' }]
      }
    });
    await prisma.court.create({
      data: {
        clubId: club.id, name: 'Court 3 - Outdoor Pro', type: 'outdoor', basePrice: 10, peakMultiplier: 2.0,
        peakHours: [
          { day: 'MON-FRI', start: '18:00', end: '21:00' },
          { day: 'SAT', start: '09:00', end: '13:00' }
        ]
      }
    });
  }

  // Players
  const passwordHash = await bcrypt.hash('password123', 10);
  for (let i = 1; i <= 5; i++) {
    await prisma.user.create({
      data: {
        email: `player${i}@test.com`,
        name: `Player ${i}`,
        passwordHash,
        profile: {
          create: {
            skillLevel: 2.5 + (0.3 * i),
            eloRating: 850 + (70 * i),
            playStyle: 'all-court'
          }
        },
        subscription: {
          create: { tier: 'basic', creditsTotal: 10, creditsRemaining: 10 }
        }
      }
    });
  }

  console.log('Seed completed.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
