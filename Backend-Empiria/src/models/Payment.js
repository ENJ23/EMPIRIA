const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    mp_preference_id: { type: String },
    mp_payment_id: { type: String },
    external_reference: { type: String, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    ticketType: { type: String, default: 'general' },
    quantity: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
