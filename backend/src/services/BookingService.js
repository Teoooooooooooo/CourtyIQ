const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Check if a slot is free using a DB-level lock to prevent race conditions.
 * Must be called inside a prisma.$transaction interactive block.
 */
async function checkAvailability(prismaClient, courtId, startTime, endTime) {
  const conflicts = await prismaClient.$queryRawUnsafe(`
    SELECT id FROM "Booking"
    WHERE CAST("courtId" AS text) = $1
    AND status = 'confirmed'
    AND "startTime" < $2
    AND "endTime" > $3
    FOR UPDATE
  `, courtId, new Date(endTime), new Date(startTime));
  return conflicts.length === 0;
}

/**
 * Calculate slot price based on court peak hours config.
 */
function computePrice(court, startTime) {
  const dt = new Date(startTime);
  const hour = dt.getHours();
  const dayIndex = dt.getDay(); // 0=Sun, 1=Mon...
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = dayNames[dayIndex];
  const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

  const peakHours = Array.isArray(court.peakHours) ? court.peakHours : [];

  const isPeak = peakHours.some((ph) => {
    const inDay =
      ph.day === 'MON-FRI' ? weekdays.includes(dayName) : ph.day === dayName;
    const [startH] = ph.start.split(':').map(Number);
    const [endH] = ph.end.split(':').map(Number);
    return inDay && hour >= startH && hour < endH;
  });

  const base = Number(court.basePrice);
  const multiplier = isPeak ? Number(court.peakMultiplier) : 1;
  return Math.round(base * multiplier * 100) / 100;
}

module.exports = { checkAvailability, computePrice };
