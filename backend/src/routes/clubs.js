const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

router.get('/', async (req, res, next) => {
  try {
    const { lat, lng, radius = 50, type } = req.query;
    
    let clubs = await prisma.club.findMany({
      include: { courts: true }
    });

    if (lat && lng) {
      const pLat = parseFloat(lat);
      const pLng = parseFloat(lng);
      const limitRadius = parseFloat(radius);
      
      clubs = clubs.map(club => {
        const d = haversineKm(pLat, pLng, parseFloat(club.lat), parseFloat(club.lng));
        return { ...club, distanceKm: d };
      }).filter(c => c.distanceKm <= limitRadius)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    if (type) {
      clubs = clubs.map(club => ({
        ...club,
        courts: club.courts.filter(c => c.type === type)
      }));
    }

    res.json(clubs);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const club = await prisma.club.findUnique({
      where: { id: req.params.id },
      include: { courts: true }
    });
    if (!club) return res.status(404).json({ error: 'Club not found' });
    res.json(club);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
