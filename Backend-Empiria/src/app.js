const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
// Middleware
app.use(cors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-token']
}));
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/empiria')
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        try {
            // FIX: Drop the old troublesome index that causes duplicate key errors on null
            await mongoose.connection.collection('tickets').dropIndex('qrCode_1');
            console.log('🔥 SUCCESS: Dropped troublesome index "qrCode_1"');
        } catch (e) {
            // It might not exist or fail, which is fine
            console.log('ℹ️ Index cleanup:', e.message);
        }
    })
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
