const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        default: 1,
        required: true
    },
    ticketType: {
        type: String,
        enum: ['general', 'vip', 'other'],
        default: 'general'
    },
    // Mercado Pago IDs
    mp_preference_id: {
        type: String,
        unique: true,
        sparse: true
    },
    mp_payment_id: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    external_reference: {
        type: String,
        unique: true,
        sparse: true
    },
    // Payment Status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled', 'refunded'],
        default: 'pending',
        index: true
    },
    mp_status_detail: {
        type: String,
        default: null
    },
    // Transaction Details
    transaction_amount: {
        type: Number,
        default: 0
    },
    installments: {
        type: Number,
        default: 1
    },
    payment_method_id: {
        type: String,
        default: null
    },
    // Tracking
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    approvedAt: {
        type: Date,
        default: null
    },
    webhookReceivedAt: {
        type: Date,
        default: null
    },
    // For debugging
    lastWebhookData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
});

// Índices compuestos para búsquedas rápidas
paymentSchema.index({ user: 1, event: 1, status: 1 });
paymentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
