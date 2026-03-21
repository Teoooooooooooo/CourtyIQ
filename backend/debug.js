const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const c = await prisma.challenge.findMany();
  console.log('CHALLENGES:', JSON.stringify(c, null, 2));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
