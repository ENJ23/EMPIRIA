const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    imageUrl: { type: String },
    capacity: { type: Number, required: true },
    stock: { type: Number, required: true },
    isPreventa: { type: Boolean, default: false },
    categories: [String],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);
