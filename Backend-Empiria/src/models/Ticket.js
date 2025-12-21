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
    entryQr: {
        type: String,
        sparse: true,
        unique: true
    }
});

module.exports = model('Ticket', TicketSchema);
