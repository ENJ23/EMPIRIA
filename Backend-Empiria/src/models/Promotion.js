// src/models/Promotion.js
const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    titulo: { 
        type: String, 
        required: true 
    },
    descripcion: { 
        type: String, 
        required: true 
    },
    asunto: {
        type: String,
        sparse: true
    },
    descuento: { 
        type: Number, 
        required: true // ej: 20 para 20%
    },
    codigo: { 
        type: String, 
        unique: true, 
        required: true,
        uppercase: true,
        index: true
    },
    tipo: { 
        type: String,
        enum: ['descuento', 'preventa', 'finalizacion_preventa', 'otro'],
        required: true
    },
    evento: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        sparse: true
    },
    fechaInicio: { 
        type: Date, 
        required: true,
        index: true
    },
    fechaFin: { 
        type: Date, 
        required: true,
        index: true
    },
    usuariosDestino: {
        type: String,
        enum: ['todos', 'sin_tickets', 'con_tickets'],
        default: 'todos'
    },
    enviados: { 
        type: Boolean, 
        default: false,
        index: true
    },
    fechaEnvio: {
        type: Date,
        sparse: true
    },
    cantidadEnviados: {
        type: Number,
        default: 0
    },
    activo: {
        type: Boolean,
        default: true,
        index: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Índices compuestos
promotionSchema.index({ activo: 1, enviados: 1 });
promotionSchema.index({ fechaInicio: 1, fechaFin: 1, activo: 1 });

module.exports = mongoose.model('Promotion', promotionSchema);
