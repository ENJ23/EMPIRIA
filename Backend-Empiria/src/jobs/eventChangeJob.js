// src/jobs/eventChangeJob.js
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const User = require('../models/User');
const emailService = require('../services/emailService');

/**
 * Función para notificar cambio de fecha de evento
 * Se llama cuando un admin actualiza la fecha de un evento
 * 
 * @param {string} eventId - ID del evento
 * @param {Date} oldDate - Fecha anterior
 * @param {Date} newDate - Nueva fecha
 * @returns {Promise<object>} Resultado de las notificaciones
 */
const notifyEventDateChange = async (eventId, oldDate, newDate) => {
    console.log('\n📧 ========== NOTIFICANDO CAMBIO DE FECHA ==========');
    console.log(`🆔 Evento ID: ${eventId}`);
    console.log(`📅 Fecha anterior: ${new Date(oldDate).toLocaleString('es-AR')}`);
    console.log(`📅 Nueva fecha: ${new Date(newDate).toLocaleString('es-AR')}\n`);
    
    try {
        const event = await Event.findById(eventId);
        
        if (!event) {
            console.error('❌ Evento no encontrado');
            return { success: false, error: 'Evento no encontrado' };
        }

        console.log(`📌 Evento: ${event.title}\n`);

        // Buscar todos los usuarios con tickets aprobados para este evento
        const tickets = await Ticket.find({
            event: eventId,
            status: 'approved'
        }).populate('user');

        console.log(`👥 ${tickets.length} usuarios a notificar\n`);

        let successCount = 0;
        let failureCount = 0;

        // Enviar email a cada usuario
        for (const ticket of tickets) {
            const user = ticket.user;

            if (!user || !user.correo) {
                console.log(`  ⚠️  Usuario sin email válido`);
                continue;
            }

            try {
                const result = await emailService.sendEventChangedEmail(
                    user, 
                    event, 
                    oldDate, 
                    newDate
                );

                if (result.success) {
                    console.log(`  ✅ ${user.correo}`);
                    successCount++;
                } else {
                    console.log(`  ❌ ${user.correo} - ${result.error}`);
                    failureCount++;
                }
            } catch (error) {
                console.log(`  ❌ ${user.correo} - ${error.message}`);
                failureCount++;
            }
        }

        console.log('\n========== RESUMEN ==========');
        console.log(`✅ Notificaciones enviadas: ${successCount}`);
        console.log(`❌ Notificaciones fallidas: ${failureCount}`);
        console.log('=============================\n');

        return { 
            success: true, 
            notified: successCount,
            failed: failureCount,
            total: tickets.length
        };

    } catch (error) {
        console.error('❌ Error notificando cambio:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { notifyEventDateChange };
