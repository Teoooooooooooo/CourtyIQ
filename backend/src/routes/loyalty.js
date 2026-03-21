/**
 * Loyalty Routes — points balance and history
 */

const router = require('express').Router();
const authenticate = require('../middleware/authenticate');
const LoyaltyService = require('../services/LoyaltyService');

// ---------------------------------------------------------------------------
// GET /api/v1/loyalty/me
// ---------------------------------------------------------------------------
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const data = await LoyaltyService.getTotal(userId);
        res.json(data);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
