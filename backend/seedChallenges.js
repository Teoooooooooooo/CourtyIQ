const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the demo account
  const demo = await prisma.user.findUnique({ where: { email: 'demo@courtiq.com' } });
  if (!demo) {
    console.error('Demo account not found! Run seedDemo.js first.');
    process.exit(1);
  }
  console.log('Demo user:', demo.id, demo.name);

  // Get 10 other players
  const players = await prisma.user.findMany({
    where: { id: { not: demo.id } },
    take: 10
  });

  console.log(`Found ${players.length} players to create challenges from.`);

  // Delete any existing pending challenges to the demo account
  await prisma.challenge.deleteMany({
    where: { toUserId: demo.id, status: 'pending' }
  });

  // Create 10 pending challenges FROM each player TO the demo account
  for (let i = 0; i < players.length; i++) {
    const proposedTime = new Date();
    proposedTime.setDate(proposedTime.getDate() + 1 + i); // spread across future days

    await prisma.challenge.create({
      data: {
        fromUserId: players[i].id,
        toUserId: demo.id,
        proposedTime,
        status: 'pending'
      }
    });
    console.log(`  ✓ Challenge from ${players[i].name} → Demo`);
  }

  console.log('\nDone! 10 pending challenges created for demo@courtiq.com');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
