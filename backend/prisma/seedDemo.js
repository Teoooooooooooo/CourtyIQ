const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting DEMO seed...');

  // Reset database safely
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

  // 5 Clubs
  const clubsData = [
    { name: 'Padel City Arena', address: 'Str. Pipera 12, Voluntari', lat: 44.4934, lng: 26.1063 },
    { name: 'Smash Club Floreasca', address: 'Bd. Floreasca 88, Sector 1', lat: 44.4702, lng: 26.0953 },
    { name: 'Arena Pro Herastrau', address: 'Str. Nordului 7, Sector 1', lat: 44.4831, lng: 26.0782 },
    { name: 'Club Baneasa', address: 'Soseaua Bucuresti-Ploiesti', lat: 44.5012, lng: 26.0834 },
    { name: 'Padel Hub Titan', address: 'Parcul Teilor, Sector 3', lat: 44.4205, lng: 26.1392 },
  ];

  const createdClubs = [];
  for (const c of clubsData) {
    const club = await prisma.club.create({ data: c });
    createdClubs.push(club);

    // 3 courts per club (15 total)
    await prisma.court.create({
      data: {
        clubId: club.id, name: 'Court 1 - Pro', type: 'outdoor', basePrice: 15, peakMultiplier: 1.8,
        peakHours: [{ day: 'MON-FRI', start: '17:00', end: '22:00' }]
      }
    });
    await prisma.court.create({
      data: {
        clubId: club.id, name: 'Court 2 - Indoor', type: 'indoor', basePrice: 20, peakMultiplier: 1.5,
        peakHours: [{ day: 'MON-FRI', start: '17:00', end: '22:00' }, { day: 'SAT', start: '09:00', end: '14:00' }]
      }
    });
    await prisma.court.create({
      data: {
        clubId: club.id, name: 'Court 3 - Standard', type: 'outdoor', basePrice: 10, peakMultiplier: 2.0,
        peakHours: [{ day: 'MON-FRI', start: '18:00', end: '21:00' }]
      }
    });
  }

  // 20 Players
  const firstNames = ['Andrei', 'Alexandru', 'Mihai', 'Ionut', 'Florin', 'Stefan', 'Marian', 'Cristian', 'Gabriel', 'Bogdan', 'Radu', 'Vlad', 'Cosmin', 'Constantin', 'Nicolae', 'Gheorghe', 'Vasile', 'Daniel', 'Catalin', 'Adrian'];
  const lastNames = ['Popescu', 'Radu', 'Ionescu', 'Dumitrescu', 'Stan', 'Gheorghe', 'Matei', 'Ciobanu', 'Marin', 'Mihai', 'Nistor', 'Toma', 'Oprea', 'Lupu', 'Ilie', 'Diaconu', 'Barbu', 'Mocanu', 'Petrescu', 'Dima'];

  const passwordHash = await bcrypt.hash('password123', 10);
  const createdPlayers = [];

  for (let i = 0; i < 20; i++) {
    const p = await prisma.user.create({
      data: {
        email: `player${i + 1}@test.com`,
        name: `${firstNames[i]} ${lastNames[i]}`,
        passwordHash,
        profile: {
          create: {
            skillLevel: 2.0 + (Math.random() * 3), // 2.0 to 5.0
            eloRating: Math.floor(780 + Math.random() * 600), // 780 to 1380
            playStyle: i % 2 === 0 ? 'aggressive' : 'defensive',
            location: 'Bucharest'
          }
        },
        subscription: {
          create: { tier: 'basic', creditsTotal: 10, creditsRemaining: 10 }
        }
      }
    });
    createdPlayers.push(p);
  }

  // DEMO ACCOUNT
  const demoPwHash = await bcrypt.hash('demo123', 10);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@courtiq.com',
      name: 'Demo Account',
      passwordHash: demoPwHash,
      profile: {
        create: {
          skillLevel: 3.5,
          eloRating: 1140,
          playStyle: 'aggressive',
          location: 'Floreasca',
          stats: { wins: 16, losses: 8, lastFive: ["W", "W", "L", "W", "W"] }
        }
      },
      subscription: {
        create: { tier: 'pro', creditsTotal: 20, creditsRemaining: 20 }
      }
    }
  });

  // Demo Loyalty Points (1240 pts)
  await prisma.loyaltyPoint.create({
    data: { userId: demoUser.id, points: 1200, reason: 'booking_completed' }
  });
  await prisma.loyaltyPoint.create({
    data: { userId: demoUser.id, points: 40, reason: 'match_won' }
  });

  // Upcoming Bookings for Demo
  const outdoorCourt = await prisma.court.findFirst({ where: { type: 'outdoor' } });

  const futureDates = [2, 4, 6]; // March 22, 24, 26 simulation (or relative future dates)
  for (const dOffset of futureDates) {
    const st = new Date();
    st.setDate(st.getDate() + dOffset);
    st.setHours(18, 0, 0, 0);
    const et = new Date(st);
    et.setHours(19, 0, 0, 0);

    await prisma.booking.create({
      data: {
        courtId: outdoorCourt.id,
        organizerId: demoUser.id,
        startTime: st,
        endTime: et,
        status: 'confirmed',
        totalPrice: 20,
        playerIds: [demoUser.id, createdPlayers[0].id, createdPlayers[1].id, createdPlayers[2].id]
      }
    });
  }

  // Past Matches involving demo account (approx 30)
  for (let m = 0; m < 30; m++) {
    await prisma.match.create({
      data: {
        // demo is in team 1
        team1Ids: [demoUser.id, createdPlayers[m % 10].id],
        team2Ids: [createdPlayers[(m + 1) % 10].id, createdPlayers[(m + 2) % 10].id],
        winnerTeam: m % 3 === 0 ? 2 : 1, // Wins ~66% of the time
        eloDelta: { [demoUser.id]: m % 3 === 0 ? -15 : 20 },
        createdAt: new Date(Date.now() - (30 - m) * 86400000)
      }
    });
  }

  console.log('Demo Seed completed successfully.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
