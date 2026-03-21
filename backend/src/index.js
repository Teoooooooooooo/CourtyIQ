require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// Stripe webhooks need raw body — mount BEFORE express.json()
app.use('/api/v1/webhooks', require('./routes/webhooks'));

app.use(express.json());

// Routes — each developer adds their own
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/clubs', require('./routes/clubs'));
app.use('/api/v1/courts', require('./routes/courts'));
app.use('/api/v1/bookings', require('./routes/bookings'));
app.use('/api/v1/waitlist', require('./routes/waitlist'));
app.use('/api/v1/social', require('./routes/social'));
app.use('/api/v1/matches', require('./routes/matches'));
app.use('/api/v1/ai', require('./routes/ai'));
app.use('/api/v1/pass', require('./routes/pass'));
app.use('/api/v1/loyalty', require('./routes/loyalty'));
app.use('/api/v1/chat', require('./routes/chat'));

app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CourtIQ API running on :${PORT}`));

module.exports = app;
