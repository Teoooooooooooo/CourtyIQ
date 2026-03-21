const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authenticate = require('../middleware/authenticate');

// ── GET /api/v1/chat — List active chats ───────────────
// Active chats are defined as any user we have an 'accepted' challenge with
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Find all accepted challenges involving this user
    const challenges = await prisma.challenge.findMany({
      where: {
        status: 'accepted',
        OR: [{ fromUserId: userId }, { toUserId: userId }]
      }
    });

    // Extract unique opponent IDs
    const opponentIds = [...new Set(challenges.map(c => 
      c.fromUserId === userId ? c.toUserId : c.fromUserId
    ))];

    // Fetch profiles for opponents
    const partners = await prisma.user.findMany({
      where: { id: { in: opponentIds } },
      select: {
        id: true,
        name: true,
        profile: { select: { skillLevel: true, playStyle: true } }
      }
    });

    // For each partner, optionally fetch the latest message to show in preview
    const chatsList = await Promise.all(partners.map(async (partner) => {
      const lastMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: partner.id },
            { senderId: partner.id, receiverId: userId }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
      return {
        ...partner,
        lastMessage: lastMessage ? lastMessage.text : null,
        lastMessageAt: lastMessage ? lastMessage.createdAt : null
      };
    }));

    // Sort by most recent message
    chatsList.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));

    res.json(chatsList);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/v1/chat/:opponentId — Get messages ────────
router.get('/:opponentId', authenticate, async (req, res, next) => {
  try {
    const { opponentId } = req.params;
    const userId = req.user.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: opponentId },
          { senderId: opponentId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/chat/:opponentId — Send message ───────
router.post('/:opponentId', authenticate, async (req, res, next) => {
  try {
    const { opponentId } = req.params;
    const userId = req.user.userId;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const message = await prisma.message.create({
      data: {
        senderId: userId,
        receiverId: opponentId,
        text: text.trim()
      }
    });

    res.json(message);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
