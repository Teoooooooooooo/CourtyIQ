const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
    const users = await p.user.findMany({ include: { profile: true } });
    for (const u of users) {
        const matches = await p.match.findMany({
            where: {
                OR: [
                    { team1Ids: { array_contains: u.id } },
                    { team2Ids: { array_contains: u.id } },
                ]
            }
        });
        const stats = u.profile?.stats || {};
        const expected = (stats.wins || 0) + (stats.losses || 0);
        console.log(`User ${u.name} (ID: ${u.id})`);
        console.log(`- Profile says: ${expected} played (${stats.wins}W / ${stats.losses}L)`);
        console.log(`- DB matches query array_contains returns: ${matches.length}`);
        
        const stringMatches = await p.match.findMany({
            where: {
                OR: [
                    { team1Ids: { string_contains: u.id } },
                    { team2Ids: { string_contains: u.id } },
                ]
            }
        });
        console.log(`- DB matches query string_contains returns: ${stringMatches.length}`);
        console.log('---');
    }
    await p.$disconnect();
})();
