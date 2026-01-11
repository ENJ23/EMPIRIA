// src/jobs/promotionalEmailJob.js
// TEMPORALMENTE DESHABILITADO: node-cron con timezone causa error en Vercel
// Se habilitará después de configurar las variables de entorno correctamente

const cron = require('node-cron');
const Promotion = require('../models/Promotion');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const emailService = require('../services/emailService');

/**
 * Job que se ejecuta diariamente a las 10:00 AM
 * Envía emails promocionales que están programados
 * 
 * Cron: '0 10 * * *' = Cada día a las 10:00 AM
 */
const promotionalEmailJobHandler = async () => {
    console.log('\n📢 ========== INICIANDO JOB DE PROMOCIONES ==========');
    console.log(`⏰ ${new Date().toLocaleString('es-AR')}\n`);
    
    try {
        // Buscar promociones activas no enviadas
        const now = new Date();
        const activePromotions = await Promotion.find({
            activo: true,
            enviados: false,
            fechaInicio: { $lte: now },
            fechaFin: { $gte: now }
        });

        console.log(`🎯 Encontradas ${activePromotions.length} promociones activas\n`);

        let totalEmailsSent = 0;
        let totalPromotionsSent = 0;

        for (const promotion of activePromotions) {
            console.log(`📌 Promoción: ${promotion.titulo}`);
            console.log(`   💰 Descuento: ${promotion.descuento}%`);
            console.log(`   📝 Código: ${promotion.codigo}`);
            console.log(`   👥 Destino: ${promotion.usuariosDestino}`);
            console.log(`   📅 Válida hasta: ${new Date(promotion.fechaFin).toLocaleDateString('es-AR')}\n`);

            let users = [];

            // Determinar usuarios destino
            try {
                if (promotion.usuariosDestino === 'todos') {
                    users = await User.find();
                    console.log(`   → Enviando a TODOS los usuarios (${users.length})\n`);

                } else if (promotion.usuariosDestino === 'sin_tickets') {
                    const usersWithTickets = await Ticket.distinct('user');
                    users = await User.find({ _id: { $nin: usersWithTickets } });
                    console.log(`   → Enviando a usuarios SIN tickets (${users.length})\n`);

                } else if (promotion.usuariosDestino === 'con_tickets') {
                    const usersWithTickets = await Ticket.distinct('user');
                    users = await User.find({ _id: { $in: usersWithTickets } });
                    console.log(`   → Enviando a usuarios CON tickets (${users.length})\n`);
                }

                // Enviar a cada usuario
                let promotionEmailsSent = 0;
                
                for (const user of users) {
                    try {
                        const result = await emailService.sendPromotionalEmail(user, promotion);
                        
                        if (result.success) {
                            console.log(`     ✅ ${user.correo}`);
                            promotionEmailsSent++;
                            totalEmailsSent++;
                        } else {
                            console.log(`     ❌ ${user.correo} - ${result.error}`);
                        }
                    } catch (error) {
                        console.log(`     ❌ Error: ${error.message}`);
                    }
                }

                // Marcar como enviada
                promotion.enviados = true;
                promotion.fechaEnvio = new Date();
                promotion.cantidadEnviados = promotionEmailsSent;
                await promotion.save();

                console.log(`\n   ✅ Promoción completada (${promotionEmailsSent} emails)\n`);
                totalPromotionsSent++;

            } catch (error) {
                console.error(`   ❌ Error procesando promoción: ${error.message}\n`);
            }
        }

        console.log('========== RESUMEN DEL JOB ==========');
        console.log(`✅ Emails enviados: ${totalEmailsSent}`);
        console.log(`✅ Promociones procesadas: ${totalPromotionsSent}`);
        console.log('====================================\n');

    } catch (error) {
        console.error('❌ Error en promotionalEmailJob:', error);
    }
};

// No inicializar automáticamente - solo exportar la función
module.exports = { promotionalEmailJobHandler };
