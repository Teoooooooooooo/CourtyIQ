const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Clubs ──────────────────────────────────────────────
  const clubs = await Promise.all([
    prisma.club.create({
      data: {
        name: 'Padel City Arena',
        address: 'Str. Sporturilor 12, Bucharest',
        lat: 44.46,
        lng: 26.10,
      },
    }),
    prisma.club.create({
      data: {
        name: 'Smash Club',
        address: 'Bd. Unirii 45, Bucharest',
        lat: 44.47,
        lng: 26.09,
      },
    }),
    prisma.club.create({
      data: {
        name: 'Arena Pro',
        address: 'Calea Victoriei 100, Bucharest',
        lat: 44.45,
        lng: 26.08,
      },
    }),
  ]);

  const peakHours = JSON.stringify([{ day: 'MON-FRI', start: '17:00', end: '21:00' }]);

  // ── Courts (3 per club) ────────────────────────────────
  const courtConfigs = [
    { name: 'Court 1', type: 'outdoor', basePrice: 8 },
    { name: 'Court 2', type: 'indoor', basePrice: 15 },
    { name: 'Court 3', type: 'outdoor', basePrice: 22 },
  ];

  for (const club of clubs) {
    for (const cfg of courtConfigs) {
      await prisma.court.create({
        data: {
          clubId: club.id,
          name: cfg.name,
          type: cfg.type,
          basePrice: cfg.basePrice,
          peakMultiplier: 1.5,
          peakHours: JSON.parse(peakHours),
        },
      });
    }
  }

  // ── Players ────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  for (let i = 1; i <= 5; i++) {
    await prisma.user.create({
      data: {
        email: `player${i}@test.com`,
        passwordHash,
        name: `Player ${i}`,
        profile: {
          create: {
            skillLevel: 3.0,
            eloRating: 1000,
            playStyle: 'all-court',
          },
        },
      },
    });
  }

  console.log('✅ Seed complete: 3 clubs, 9 courts, 5 players');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
