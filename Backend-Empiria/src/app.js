const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
let helmet;
let rateLimit;
try { helmet = require('helmet'); } catch(e) { helmet = null; }
try { rateLimit = require('express-rate-limit'); } catch(e) { rateLimit = null; }
require('dotenv').config();

const app = express();

// Middleware
// Middleware
// CORS: restrict to known origins
const defaultOrigins = [
    'http://localhost:4200',
    process.env.FRONTEND_URL || '',
].filter(Boolean);
const allowedOrigins = (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : defaultOrigins);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'x-token']
}));

// Security headers
if (helmet) {
    app.use(helmet());
}

// Basic rate limit for webhooks and auth
if (rateLimit) {
    const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
    app.use('/api/', limiter);
}
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/empiria')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/events', require('./routes/events.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/tickets', require('./routes/ticket.routes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
