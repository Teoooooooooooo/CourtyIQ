const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function run() {
  const club = await prisma.club.findFirst();
  if (!club) { console.log('No club found'); process.exit(1); }

  const hash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'clubadmin@courtiq.com',
      passwordHash: hash,
      name: 'Club Admin',
      role: 'club',
      clubs: { connect: { id: club.id } },
    }
  });

  console.log('Created club admin:', user.email, '| linked to:', club.name);
}

run().catch(e => console.error(e)).finally(() => prisma.$disconnect());
