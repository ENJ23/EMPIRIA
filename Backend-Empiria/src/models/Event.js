const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    imageUrl: { type: String, required: true },
    
    // Configuración de precios
    priceRange: {
        min: { type: Number, required: true },
        max: { type: Number, required: true }
    },
    
    // Capacidad de entradas
    capacity: { type: Number, required: true },
    ticketsSold: { type: Number, default: 0 },
    
    // Preventa
    isPreventa: { type: Boolean, default: false },
    preventaPrice: { type: Number },
    preventaLimit: { type: Number },
    preventaTicketsSold: { type: Number, default: 0 },
    
    // NUEVO: Evento gratuito (sin necesidad de pagar, solo solicitar entrada)
    isFree: { type: Boolean, default: false },
    
    // NUEVO: Solo precio general (sin opción VIP)
    onlyGeneralPrice: { type: Boolean, default: false },
    
    categories: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', EventSchema);
