/**
 * Shared slot generator utility.
 * Produces 1-hour slots for a court across a given date range.
 */

/**
 * Determine whether a datetime is peak.
 * Peak = weekdays >= 18:00, or any weekend hour.
 * @param {Date} dt
 */
function isPeakHour(dt) {
    const day = dt.getDay(); // 0=Sun, 6=Sat
    const hour = dt.getHours();
    const isWeekend = day === 0 || day === 6;
    const isEvening = hour >= 18;
    return isWeekend || isEvening;
}

/**
 * Generate available slots for a court over the next N days.
 * @param {object} court - Prisma Court record with club relation
 * @param {object[]} existingBookings - Booking records that overlap the period
 * @param {number} days - how many days ahead (default 7)
 * @returns {object[]} slots
 */
function generateSlots(court, existingBookings = [], days = 7) {
    const slots = [];
    const now = new Date();
    const basePrice = parseFloat(court.basePrice);
    const peakMult = parseFloat(court.peakMultiplier ?? 1.5);

    // Operating hours: 07:00–22:00
    for (let d = 0; d < days; d++) {
        for (let h = 7; h < 22; h++) {
            const start = new Date(now);
            start.setDate(start.getDate() + d);
            start.setHours(h, 0, 0, 0);

            if (start <= now) continue; // skip past slots

            const end = new Date(start);
            end.setHours(h + 1);

            const peak = isPeakHour(start);
            const price = +(basePrice * (peak ? peakMult : 1)).toFixed(2);

            // Check for conflicts
            const isBooked = existingBookings.some((b) => {
                const bs = new Date(b.startTime);
                const be = new Date(b.endTime);
                return bs < end && be > start && b.courtId === court.id && b.status !== 'cancelled';
            });

            slots.push({
                time: start.toISOString(),
                courtId: court.id,
                courtName: court.name,
                clubId: court.clubId,
                clubName: court.club?.name ?? '',
                price,
                isPeak: peak,
                status: isBooked ? 'booked' : 'available',
            });
        }
    }

    return slots;
}

module.exports = { generateSlots, isPeakHour };
