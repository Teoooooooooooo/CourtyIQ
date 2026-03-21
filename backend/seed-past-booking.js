const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ take: 3 });
  const court = await prisma.court.findFirst();

  if (users.length === 0 || !court) {
    console.log('No user or court found');
    process.exit(1);
  }

  for (const user of users) {
    const d = new Date();
    d.setHours(d.getHours() - 3); // 3 hours ago
    const start = new Date(d);
    d.setHours(d.getHours() + 1); // 2 hours ago
    const end = new Date(d);

    const booking = await prisma.booking.create({
      data: {
        organizerId: user.id,
        courtId: court.id,
        startTime: start,
        endTime: end,
        totalPrice: 120,
        status: 'confirmed',
        playerIds: JSON.stringify([]),
      }
    });

    console.log('Created past booking for user:', user.email, 'bookingId:', booking.id);
  }
}

run()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
