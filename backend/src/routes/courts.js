const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function isPeakHour(peakHours, slotTime) {
  if (!peakHours || !peakHours.length) return false;
  const hour = slotTime.getHours();
  const dayName = ['SUN','MON','TUE','WED','THU','FRI','SAT'][slotTime.getDay()];
  return peakHours.some(ph => {
    const weekdays = ['MON','TUE','WED','THU','FRI'];
    const inDay = ph.day === 'MON-FRI' ? weekdays.includes(dayName) : ph.day === dayName;
    const [startH] = ph.start.split(':').map(Number);
    const [endH] = ph.end.split(':').map(Number);
    return inDay && hour >= startH && hour < endH;
  });
}

function generateSlots(courtId, date, bookings, court) {
  const slots = [];
  for (let hour = 7; hour < 22; hour++) {
    const start = new Date(`${date}T${String(hour).padStart(2,'0')}:00:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const booked = bookings.find(b =>
      b.status === 'confirmed' &&
      new Date(b.startTime) < end &&
      new Date(b.endTime) > start
    );

    const isPeak = isPeakHour(court.peakHours, start);
    const price = isPeak
      ? Number(court.basePrice) * Number(court.peakMultiplier)
      : Number(court.basePrice);

    slots.push({
      id: `${courtId}-${start.toISOString()}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: booked ? 'booked' : 'available',
      isPeak,
      basePrice: Math.round(price * 100) / 100,
      creditCost: isPeak ? 1.5 : 1
    });
  }
  return slots;
}

router.get('/:id', async (req, res, next) => {
  try {
    const court = await prisma.court.findUnique({
      where: { id: req.params.id },
      include: { club: true }
    });
    if (!court) return res.status(404).json({ error: 'Court not found' });
    res.json(court);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/availability', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const court = await prisma.court.findUnique({
      where: { id }
    });
    if (!court) return res.status(404).json({ error: 'Court not found' });

    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);
    
    const bookings = await prisma.booking.findMany({
      where: {
        courtId: id,
        startTime: { lt: endOfDay },
        endTime: { gt: startOfDay }
      }
    });

    const slots = generateSlots(id, date, bookings, court);

    res.json({
      courtId: id,
      date,
      slots
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
