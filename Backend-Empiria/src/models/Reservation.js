const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true,
        index: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    // Reservation valid for X milliseconds (default 600000 = 10 minutes)
    reservedUntil: {
        type: Date,
        required: true,
        index: true,
        expires: 600 // TTL index: auto-delete 10 minutes after reservedUntil
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    // If payment completes, mark as confirmed
    confirmed: {
        type: Boolean,
        default: false,
        index: true
    }
});

// Compound index for finding active reservations by event
ReservationSchema.index({ event: 1, confirmed: 1, reservedUntil: 1 });

module.exports = mongoose.model('Reservation', ReservationSchema);
