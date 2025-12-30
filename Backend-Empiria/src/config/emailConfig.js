// src/config/emailConfig.js
const nodemailer = require('nodemailer');

/**
 * Configuración de Nodemailer
 * Soporta múltiples proveedores de email
 */

const transporter = nodemailer.createTransport({
    // OPCIÓN 1: Gmail (recomendado para desarrollo)
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,        // tu_email@gmail.com
        pass: process.env.EMAIL_PASSWORD     // Contraseña de app generada
    }
    
    // OPCIÓN 2: SendGrid (recomendado para producción)
    // host: 'smtp.sendgrid.net',
    // port: 587,
    // secure: false,
    // auth: {
    //     user: 'apikey',
    //     pass: process.env.SENDGRID_API_KEY
    // }
    
    // OPCIÓN 3: Mailtrap (para testing)
    // host: 'smtp.mailtrap.io',
    // port: 2525,
    // auth: {
    //     user: process.env.MAILTRAP_USER,
    //     pass: process.env.MAILTRAP_PASSWORD
    // }
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
