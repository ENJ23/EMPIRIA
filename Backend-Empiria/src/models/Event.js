const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    imageUrl: { type: String, required: true },
    priceRange: {
        min: { type: Number, required: true },
        max: { type: Number, required: true }
    },
    capacity: { type: Number, required: true },
    ticketsSold: { type: Number, default: 0 },
    isPreventa: { type: Boolean, default: false },
    preventaPrice: { type: Number },
    preventaLimit: { type: Number },
    categories: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', EventSchema);
