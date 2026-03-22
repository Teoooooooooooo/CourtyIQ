const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const mc = await p.match.count();
  console.log('Match count:', mc);

  if (mc > 0) {
    const matches = await p.match.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
    console.log('Sample matches:', JSON.stringify(matches, null, 2));
  }

  const prof = await p.playerProfile.findFirst();
  console.log('Profile stats:', JSON.stringify(prof?.stats));
  console.log('Profile userId:', prof?.userId);

  await p.$disconnect();
})();
