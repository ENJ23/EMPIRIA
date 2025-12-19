const { Schema, model } = require('mongoose');

const TicketSchema = Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    paymentId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['approved', 'pending', 'rejected'],
        default: 'pending'
    },
    amount: {
        type: Number,
        required: true
    },
    purchasedAt: {
        type: Date,
        default: Date.now
    },
    qrCode: {
        type: String // Optional: Store generated QR code for entry (backend generated)
    }
});

module.exports = model('Ticket', TicketSchema);
