const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating club owner account...');

  const passwordHash = await bcrypt.hash('club123', 10);

  // Create or update the club owner user
  let clubOwner = await prisma.user.findUnique({ where: { email: 'club@courtiq.com' } });
  
  if (!clubOwner) {
    clubOwner = await prisma.user.create({
      data: {
        email: 'club@courtiq.com',
        name: 'Padel City Manager',
        passwordHash,
        role: 'club',
        subscription: {
          create: { tier: 'basic', creditsTotal: 0, creditsRemaining: 0 }
        }
      }
    });
    console.log('  ✓ Created club owner:', clubOwner.id);
  } else {
    await prisma.user.update({ where: { id: clubOwner.id }, data: { role: 'club' } });
    console.log('  ✓ Updated existing user to club role:', clubOwner.id);
  }

  // Link first 2 clubs to this owner
  const clubs = await prisma.club.findMany({ take: 2 });
  for (const club of clubs) {
    await prisma.club.update({
      where: { id: club.id },
      data: { ownerUserId: clubOwner.id }
    });
    console.log(`  ✓ Linked club "${club.name}" to owner`);
  }

  // Seed some confirmed bookings across those clubs' courts (last 30 days)
  const courts = await prisma.court.findMany({
    where: { clubId: { in: clubs.map(c => c.id) } }
  });

  const players = await prisma.user.findMany({
    where: { role: 'player' },
    take: 10
  });

  if (players.length === 0) {
    console.log('  ⚠ No players found. Run seedDemo.js first!');
    return;
  }

  let bookingsCreated = 0;

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    // 1-4 bookings per day spread across courts
    const bookingsToday = Math.floor(Math.random() * 4) + 1;
    
    for (let b = 0; b < bookingsToday; b++) {
      const court = courts[Math.floor(Math.random() * courts.length)];
      const player = players[Math.floor(Math.random() * players.length)];
      const hour = 8 + Math.floor(Math.random() * 13); // 8AM to 9PM

      const startTime = new Date();
      startTime.setDate(startTime.getDate() - dayOffset);
      startTime.setHours(hour, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(hour + 1);

      const useCredits = Math.random() < 0.3; // 30% pay with credits
      const totalPrice = Number(court.basePrice) * (hour >= 17 ? Number(court.peakMultiplier) : 1);

      try {
        await prisma.booking.create({
          data: {
            courtId: court.id,
            organizerId: player.id,
            startTime,
            endTime,
            status: 'confirmed',
            totalPrice: Math.round(totalPrice * 100) / 100,
            creditsUsed: useCredits ? 1 : 0,
            playerIds: [player.id],
          }
        });
        bookingsCreated++;
      } catch {
        // Skip if duplicate slot conflict
      }
    }
  }

  console.log(`  ✓ Created ${bookingsCreated} sample bookings across ${courts.length} courts`);
  console.log('\n✅ Club account ready!');
  console.log('   Login: club@courtiq.com / club123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
