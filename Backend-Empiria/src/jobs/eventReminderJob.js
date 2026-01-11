// src/jobs/eventReminderJob.js
const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const emailService = require('../services/emailService');

/**
 * Job que se ejecuta diariamente a las 9:00 AM
 * Envía recordatorios a usuarios 24 horas antes de sus eventos
 * 
 * Cron: '0 9 * * *' = Cada día a las 9:00 AM
 */
const eventReminderJob = cron.schedule('0 9 * * *', async () => {
    console.log('\n🔔 ========== INICIANDO JOB DE RECORDATORIOS ==========');
    console.log(`⏰ ${new Date().toLocaleString('es-AR')}\n`);
    
    try {
        // Calcular el rango: eventos en las próximas 24 horas
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

        console.log(`📅 Buscando eventos entre:`);
        console.log(`   ${in24h.toLocaleString('es-AR')}`);
        console.log(`   ${in25h.toLocaleString('es-AR')}\n`);

        // Buscar eventos que ocurran en las próximas 24 horas
        const upcomingEvents = await Event.find({
            date: {
                $gte: in24h,
                $lte: in25h
            }
        });

        console.log(`✅ Encontrados ${upcomingEvents.length} eventos en las próximas 24h\n`);

        let totalEmailsSent = 0;
        let totalEmailsFailed = 0;

        for (const event of upcomingEvents) {
            console.log(`📌 Procesando: ${event.title}`);
            console.log(`   📍 Ubicación: ${event.location}`);
            console.log(`   🕐 Fecha: ${new Date(event.date).toLocaleString('es-AR')}\n`);

            // Buscar todos los usuarios con tickets aprobados para este evento
            const tickets = await Ticket.find({
                event: event._id,
                status: 'approved'
            }).populate('user');

            console.log(`   👥 Encontrados ${tickets.length} usuarios con tickets\n`);

            for (const ticket of tickets) {
                const user = ticket.user;

                if (!user || !user.correo) {
                    console.log(`     ⚠️  Usuario sin email válido`);
                    continue;
                }

                try {
                    // Verificar si ya se envió email para este evento-usuario
                    const existingLog = await EmailLog.findOne({
                        to: user.correo,
                        templateName: 'eventReminder',
                        status: 'sent'
                    });

                    if (!existingLog) {
                        // Enviar email
                        const result = await emailService.sendEventReminder(user, event);
                        
                        if (result.success) {
                            console.log(`     ✅ ${user.correo}`);
                            totalEmailsSent++;
                        } else {
                            console.log(`     ❌ ${user.correo} - ${result.error}`);
                            totalEmailsFailed++;
                        }
                    } else {
                        console.log(`     ⏭️  ${user.correo} (ya enviado)`);
                    }
                } catch (error) {
                    console.log(`     ❌ Error procesando ${user.correo}: ${error.message}`);
                    totalEmailsFailed++;
                }
            }

            console.log('');
        }

        console.log('========== RESUMEN DEL JOB ==========');
        console.log(`✅ Emails enviados: ${totalEmailsSent}`);
        console.log(`❌ Emails fallidos: ${totalEmailsFailed}`);
        console.log(`📅 Eventos procesados: ${upcomingEvents.length}`);
        console.log('====================================\n');

    } catch (error) {
        console.error('❌ Error en eventReminderJob:', error);
    }
}, {
    timezone: "America/Argentina/Jujuy"
});

module.exports = eventReminderJob;
