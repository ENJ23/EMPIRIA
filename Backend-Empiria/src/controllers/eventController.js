const Event = require('../models/Event');
const Reservation = require('../models/Reservation');

const getEvents = async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        
        // For each event, calculate available tickets considering active reservations
        const eventsWithAvailability = await Promise.all(
            events.map(async (event) => {
                const reservations = await Reservation.aggregate([
                    {
                        $match: {
                            event: event._id,
                            confirmed: false,
                            reservedUntil: { $gt: new Date() }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalReserved: { $sum: '$quantity' }
                        }
                    }
                ]);
                const reservedCount = reservations.length > 0 ? reservations[0].totalReserved : 0;
                const ticketsSold = event.ticketsSold || 0;
                const availableTickets = event.capacity - ticketsSold - reservedCount;
                
                return {
                    ...event.toObject(),
                    availableTickets: Math.max(0, availableTickets)
                };
            })
        );
        
        res.json({
            status: 1,
            msg: 'Eventos obtenidos con éxito',
            events: eventsWithAvailability
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, msg: 'Error al obtener eventos' });
    }
};

const getEventById = async (req, res) => {
    const { id } = req.params;
    try {
        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ status: 0, msg: 'Evento no encontrado' });
        }
        
        // Calculate available tickets considering active reservations
        const reservations = await Reservation.aggregate([
            {
                $match: {
                    event: event._id,
                    confirmed: false,
                    reservedUntil: { $gt: new Date() }
                }
            },
            {
                $group: {
                    _id: null,
                    totalReserved: { $sum: '$quantity' }
                }
            }
        ]);
        const reservedCount = reservations.length > 0 ? reservations[0].totalReserved : 0;
        const ticketsSold = event.ticketsSold || 0;
        const availableTickets = Math.max(0, event.capacity - ticketsSold - reservedCount);
        
        const eventWithAvailability = {
            ...event.toObject(),
            availableTickets
        };
        
        res.json({
            status: 1,
            msg: 'Evento obtenido',
            event: eventWithAvailability
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, msg: 'Error al obtener el evento' });
    }
};

const createEvent = async (req, res) => {
    try {
        const event = new Event(req.body);
        await event.save();
        res.status(201).json({
            status: 1,
            msg: 'Evento creado',
            event
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, msg: 'Error al crear evento' });
    }
};

const updateEvent = async (req, res) => {
    const { id } = req.params;
    try {
        const updated = await Event.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) {
            return res.status(404).json({ status: 0, msg: 'Evento no encontrado' });
        }
        res.json({ status: 1, msg: 'Evento actualizado', event: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, msg: 'Error al actualizar evento' });
    }
};

const deleteEvent = async (req, res) => {
    const { id } = req.params;
    try {
        const event = await Event.findByIdAndDelete(id);
        if (!event) {
            return res.status(404).json({ status: 0, msg: 'Evento no encontrado' });
        }
        res.json({
            status: 1,
            msg: 'Evento eliminado'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 0, msg: 'Error al eliminar evento' });
    }
};

module.exports = {
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
};
