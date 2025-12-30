// src/models/EmailLog.js
const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
    to: { 
        type: String, 
        required: true, 
        index: true,
        lowercase: true
    },
    subject: { 
        type: String, 
        required: true 
    },
    templateName: { 
        type: String, 
        required: true,
        enum: ['eventReminder', 'promotional', 'eventChanged', 'other']
    },
    status: { 
        type: String, 
        enum: ['sent', 'failed', 'pending'],
        default: 'pending',
        index: true
    },
    messageId: {
        type: String,
        sparse: true
    },
    error: {
        type: String,
        sparse: true
    },
    sentAt: { 
        type: Date, 
        default: Date.now, 
        index: true,
        expires: 2592000 // TTL: auto-eliminar después de 30 días
    }
});

// Índices compuestos
emailLogSchema.index({ to: 1, templateName: 1, status: 1 });
emailLogSchema.index({ sentAt: 1, status: 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
