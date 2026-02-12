const { Schema, model } = require('mongoose');

const ReviewSchema = Schema({
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
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

ReviewSchema.index({ event: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = model('Review', ReviewSchema);
