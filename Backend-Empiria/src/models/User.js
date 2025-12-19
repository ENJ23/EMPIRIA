const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, default: '' },
    correo: { type: String, required: true, unique: true },
    contraseña: { type: String, required: true },
    proveedor: { type: String, enum: ['manual', 'google'], default: 'manual' },
    tipo: { type: String, enum: ['Admin', 'Cliente'], default: 'Cliente' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
