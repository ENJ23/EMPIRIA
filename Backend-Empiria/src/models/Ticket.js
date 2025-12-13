const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    qrCode: { type: String, unique: true }, // JWT or UUID
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    status: { type: String, enum: ['valid', 'used', 'cancelled'], default: 'valid' },
    usedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);
