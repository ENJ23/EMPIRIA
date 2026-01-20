// ACTUALIZACIÓN PARA: src/controllers/eventController.js
// Reemplaza el método updateEvent con esta versión mejorada:

const { notifyEventDateChange } = require('../jobs/eventChangeJob');

const updateEvent = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Obtener evento actual antes de actualizar
        const oldEvent = await Event.findById(id);
        
        if (!oldEvent) {
            return res.status(404).json({ 
                status: 0, 
                msg: 'Evento no encontrado' 
            });
        }

        // Actualizar evento
        const updated = await Event.findByIdAndUpdate(id, req.body, { new: true });

        // Si cambió la fecha, notificar a todos los usuarios con tickets
        let emailsNotified = 0;
        let notificationError = null;

        if (oldEvent.date.getTime() !== updated.date.getTime()) {
            console.log(`\n⚠️  CAMBIO DETECTADO en fecha del evento: ${oldEvent.title}`);
            
            const result = await notifyEventDateChange(
                id, 
                oldEvent.date, 
                updated.date
            );

            if (result.success) {
                emailsNotified = result.notified;
                console.log(`✅ Notificaciones completadas: ${result.notified} usuarios`);
            } else {
                notificationError = result.error;
                console.log(`❌ Error en notificaciones: ${notificationError}`);
            }
        }

        res.json({ 
            status: 1, 
            msg: 'Evento actualizado',
            event: updated,
            emailNotification: {
                dateChanged: oldEvent.date.getTime() !== updated.date.getTime(),
                emailsSent: emailsNotified,
                error: notificationError
            }
        });

    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ 
            status: 0, 
            msg: 'Error al actualizar evento',
            error: error.message
        });
    }
};

module.exports = {
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
};
