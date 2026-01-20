// src/services/emailService.js
const transporter = require('../config/emailConfig');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const EmailLog = require('../models/EmailLog');

class EmailService {
    constructor() {
        this.transporter = transporter;
    }

    /**
     * Cargar y compilar template HTML con Handlebars
     * @param {string} templateName - Nombre del template (sin .html)
     * @param {object} data - Datos para interpolar en el template
     * @returns {string} HTML compilado
     */
    loadTemplate(templateName, data) {
        try {
            const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
            const templateContent = fs.readFileSync(templatePath, 'utf-8');
            const template = handlebars.compile(templateContent);
            return template(data);
        } catch (error) {
            console.error(`❌ Error loading template ${templateName}:`, error);
            throw error;
        }
    }

    /**
     * Enviar email genérico
     * @param {string} to - Email destinatario
     * @param {string} subject - Asunto del email
     * @param {string} templateName - Nombre del template
     * @param {object} templateData - Datos para el template
     * @returns {Promise<object>} Resultado del envío
     */
    async sendEmail(to, subject, templateName, templateData) {
        try {
            const htmlContent = this.loadTemplate(templateName, templateData);

            const mailOptions = {
                from: `${process.env.EMAIL_FROM_NAME || 'Empiria Jujuy'} <${process.env.EMAIL_FROM}>`,
                to,
                subject,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);

            // Registrar en base de datos
            await EmailLog.create({
                to,
                subject,
                templateName,
                status: 'sent',
                messageId: info.messageId,
                sentAt: new Date()
            });

            console.log(`✅ Email enviado a ${to}: ${info.messageId}`);
            return { success: true, messageId: info.messageId };

        } catch (error) {
            console.error(`❌ Error enviando email a ${to}:`, error.message);
            
            // Registrar error en base de datos
            try {
                await EmailLog.create({
                    to,
                    subject,
                    templateName,
                    status: 'failed',
                    error: error.message,
                    sentAt: new Date()
                });
            } catch (logError) {
                console.error('Error logging email failure:', logError);
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * Enviar recordatorio de evento (24h antes)
     * @param {object} user - Documento User
     * @param {object} event - Documento Event
     */
    async sendEventReminder(user, event) {
        const eventDate = new Date(event.date);
        const templateData = {
            nombre: user.nombre,
            titulo: event.title,
            fecha: eventDate.toLocaleDateString('es-AR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            hora: eventDate.toLocaleTimeString('es-AR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            ubicacion: event.location,
            descripcion: event.description.substring(0, 200) + '...',
            enlaceEvento: `${process.env.FRONTEND_URL}/events/${event._id}`,
            enlaceTickets: `${process.env.FRONTEND_URL}/tickets`
        };

        return this.sendEmail(
            user.correo,
            `¡Tu evento "${event.title}" comienza mañana!`,
            'eventReminder',
            templateData
        );
    }

    /**
     * Enviar email promocional
     * @param {object} user - Documento User
     * @param {object} promotion - Documento Promotion
     */
    async sendPromotionalEmail(user, promotion) {
        const templateData = {
            nombre: user.nombre,
            titulo: promotion.titulo,
            descripcion: promotion.descripcion,
            descuento: promotion.descuento,
            codigoPromocion: promotion.codigo,
            enlace: `${process.env.FRONTEND_URL}/events?promo=${promotion.codigo}`,
            fechaFin: new Date(promotion.fechaFin).toLocaleDateString('es-AR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };

        return this.sendEmail(
            user.correo,
            promotion.asunto || `¡${promotion.descuento}% de descuento en eventos!`,
            'promotional',
            templateData
        );
    }

    /**
     * Enviar notificación de cambio de fecha de evento
     * @param {object} user - Documento User
     * @param {object} event - Documento Event
     * @param {Date} oldDate - Fecha anterior
     * @param {Date} newDate - Nueva fecha
     */
    async sendEventChangedEmail(user, event, oldDate, newDate) {
        const newEventDate = new Date(newDate);
        const oldEventDate = new Date(oldDate);
        
        const templateData = {
            nombre: user.nombre,
            titulo: event.title,
            fechaAnterior: oldEventDate.toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            fechaNueva: newEventDate.toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            hora: newEventDate.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            ubicacion: event.location,
            razon: event.changeReason || 'Cambio temporal por inconvenientes',
            enlaceEvento: `${process.env.FRONTEND_URL}/events/${event._id}`
        };

        return this.sendEmail(
            user.correo,
            `⚠️ Cambio de fecha: ${event.title}`,
            'eventChanged',
            templateData
        );
    }

    /**
     * Enviar confirmación de entradas gratuitas
     * @param {object} user - Documento User
     * @param {object} event - Documento Event
     * @param {number} quantity - Cantidad de entradas
     * @param {array} tickets - Array de tickets creados
     */
    async sendFreeTicketConfirmation(user, event, quantity, tickets) {
        const eventDate = new Date(event.date);
        const templateData = {
            nombre: user.nombre,
            titulo: event.title,
            cantidad: quantity,
            fecha: eventDate.toLocaleDateString('es-AR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            hora: eventDate.toLocaleTimeString('es-AR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            ubicacion: event.location,
            descripcion: event.description.substring(0, 200) + '...',
            enlaceTickets: `${process.env.FRONTEND_URL}/my-tickets`,
            enlaceEvento: `${process.env.FRONTEND_URL}/events/${event._id}`,
            ticketIds: tickets.map(t => t._id.toString()).join(', ')
        };

        return this.sendEmail(
            user.correo,
            `✅ Confirmación: Entradas para "${event.title}"`,
            'freeTicketConfirmation',
            templateData
        );
    }

    /**
     * Obtener logs de emails
     * @param {object} filter - Filtro de búsqueda
     * @param {number} limit - Límite de resultados
     */
    async getEmailLogs(filter = {}, limit = 50) {
        try {
            const logs = await EmailLog.find(filter)
                .sort({ sentAt: -1 })
                .limit(limit);
            return logs;
        } catch (error) {
            console.error('Error fetching email logs:', error);
            return [];
        }
    }
}

module.exports = new EmailService();
