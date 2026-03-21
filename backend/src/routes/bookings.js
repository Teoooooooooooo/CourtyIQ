const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const authenticate = require('../middleware/authenticate');
const { checkAvailability, computePrice } = require('../services/BookingService');
const LoyaltyService = require('../services/LoyaltyService');
const { broadcastToCourtSubscribers } = require('./courts');

// ── POST /api/v1/bookings — Create a booking ────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { courtId, startTime, endTime, playerIds = [] } = req.body;
    const organizerId = req.user.userId;

    // 1. Fetch court (need peakHours for price calc)
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) return res.status(404).json({ error: 'Court not found' });

    // 2. Compute price
    const totalPrice = computePrice(court, startTime);

    // 3. Check subscription credits
    const subscription = await prisma.subscription.findUnique({
      where: { userId: organizerId },
    });
    const hasCredits = subscription && subscription.creditsRemaining > 0;

    let stripePaymentId = null;
    let clientSecret = null;

    // 4. If no credits → create Stripe PaymentIntent
    if (!hasCredits) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalPrice * 100), // Stripe uses cents
        currency: 'eur',
        metadata: { courtId, organizerId },
      });
      stripePaymentId = paymentIntent.id;
      clientSecret = paymentIntent.client_secret;
    }

    // 5. Transaction: check availability + create booking
    const booking = await prisma.$transaction(async (tx) => {
      const available = await checkAvailability(tx, courtId, startTime, endTime);
      if (!available) {
        const err = new Error('Time slot is no longer available');
        err.status = 409;
        throw err;
      }

      const newBooking = await tx.booking.create({
        data: {
          courtId,
          organizerId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: hasCredits ? 'confirmed' : 'pending',
          totalPrice,
          stripePaymentId,
          creditsUsed: hasCredits ? 1 : 0,
          playerIds: [organizerId, ...playerIds],
        },
      });

      // Deduct credit if paying with subscription
      if (hasCredits) {
        await tx.subscription.update({
          where: { userId: organizerId },
          data: { creditsRemaining: { decrement: 1 } },
        });
      }

      return newBooking;
    });

    // If paid with credits, auto-confirm: award loyalty + broadcast
    if (hasCredits) {
      await LoyaltyService.awardPoints(organizerId, 'booking_confirmed');
      broadcastToCourtSubscribers(courtId, {
        type: 'slots_updated',
        courtId,
      });

      const updatedSub = await prisma.subscription.findUnique({
        where: { userId: organizerId },
      });

      return res.status(201).json({
        bookingId: booking.id,
        isPaidWithCredits: true,
        creditsRemaining: updatedSub.creditsRemaining,
      });
    }

    // 6. Return clientSecret for Stripe
    res.status(201).json({
      bookingId: booking.id,
      clientSecret,
      totalPrice,
      isPaidWithCredits: false,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/bookings/:id/confirm — Confirm booking ─
router.post('/:id/confirm', authenticate, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.organizerId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (booking.status === 'confirmed') {
      return res.status(400).json({ error: 'Already confirmed' });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'confirmed' },
      include: { court: { include: { club: true } } },
    });

    await LoyaltyService.awardPoints(req.user.userId, 'booking_confirmed');
    broadcastToCourtSubscribers(booking.courtId, {
      type: 'slots_updated',
      courtId: booking.courtId,
    });

    res.json({ booking: updated });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/v1/bookings/:id — Cancel booking ─────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.organizerId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Cancel Stripe PaymentIntent if it was a paid booking
    if (booking.stripePaymentId && booking.status === 'confirmed') {
      try {
        await stripe.paymentIntents.cancel(booking.stripePaymentId);
      } catch (stripeErr) {
        console.error('Stripe cancel error (non-fatal):', stripeErr.message);
      }
    }

    // Refund credit if the booking used subscription credits
    if (booking.creditsUsed > 0) {
      await prisma.subscription.update({
        where: { userId: req.user.userId },
        data: { creditsRemaining: { increment: booking.creditsUsed } },
      });
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
    });

    // Trigger waitlist: notify first person in queue
    const { broadcastToUser } = require('./courts');
    const waitlistEntry = await prisma.waitlist.findFirst({
      where: {
        courtId: booking.courtId,
        slotStart: booking.startTime,
        position: 1,
      },
    });

    if (waitlistEntry) {
      broadcastToUser(waitlistEntry.userId, 'slot_available', {
        courtId: booking.courtId,
        slotStart: booking.startTime,
      });
    }

    broadcastToCourtSubscribers(booking.courtId, {
      type: 'slots_updated',
      courtId: booking.courtId,
    });

    res.json({ cancelled: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/bookings/me — My bookings ────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { organizerId: req.user.userId },
      include: { court: { include: { club: true } } },
      orderBy: { startTime: 'desc' },
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

// ── Ping ─────────────────────────────────────────────────
router.get('/ping', (req, res) => res.json({ ok: true }));

module.exports = router;
