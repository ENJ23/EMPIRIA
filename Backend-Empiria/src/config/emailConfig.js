// src/config/emailConfig.js
const nodemailer = require('nodemailer');

/**
 * Configuración de Nodemailer
 * Soporta múltiples proveedores de email
 */

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,        // tu_email@gmail.com
        pass: process.env.EMAIL_PASSWORD     // App Password de 16 caracteres
    }
});

// Verificar conexión
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email service ready:', success);
    }
});

module.exports = transporter;
