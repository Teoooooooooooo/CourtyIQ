const router = require('express').Router();
// TODO: implement
router.get('/ping', (req, res) => res.json({ ok: true }));
module.exports = router;
