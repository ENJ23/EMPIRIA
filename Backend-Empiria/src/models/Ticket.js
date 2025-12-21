const { Schema, model } = require('mongoose');

const TicketSchema = Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    payment: {
        type: Schema.Types.ObjectId,
        ref: 'Payment',
        required: true,
        unique: true,
        index: true
    },
    // Legacy field for backwards compatibility (will be removed)
    paymentId: {
        type: String,
        sparse: true
    },
    status: {
        type: String,
        enum: ['approved', 'pending', 'rejected'],
        default: 'pending',
        index: true
    },
    amount: {
        type: Number,
        required: true
    },
    purchasedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    entryQr: {
        type: String,
        sparse: true,
        unique: true
    }
});

// Índices compuestos
TicketSchema.index({ user: 1, event: 1 });
TicketSchema.index({ user: 1, status: 1 });

module.exports = model('Ticket', TicketSchema);
