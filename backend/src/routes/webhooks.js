const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const LoyaltyService = require('../services/LoyaltyService');
const { broadcastToCourtSubscribers } = require('./courts');

// Stripe webhooks need raw body — applied via express.raw() inline
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const booking = await prisma.booking.findFirst({
        where: { stripePaymentId: pi.id },
      });

      if (booking && booking.status === 'pending') {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'confirmed' },
        });
        await LoyaltyService.awardPoints(
          booking.organizerId,
          'booking_confirmed'
        );
        broadcastToCourtSubscribers(booking.courtId, {
          type: 'slots_updated',
        });
      }
    }

    res.json({ received: true });
  }
);

// Ping
router.get('/ping', (req, res) => res.json({ ok: true }));

module.exports = router;
