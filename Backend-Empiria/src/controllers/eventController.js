const Event = require('../models/Event');
const Reservation = require('../models/Reservation');
const { notifyEventDateChange } = require('../jobs/eventChangeJob');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const diacriticMap = {
    a: '[aáàäâã]',
    e: '[eéèëê]',
    i: '[iíìïî]',
    o: '[oóòöôõ]',
    u: '[uúùüû]',
    n: '[nñ]',
    c: '[cç]'
};

const buildDiacriticRegex = (value) => {
    const normalized = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    let pattern = '';
    for (const char of normalized) {
        const lower = char.toLowerCase();
        if (diacriticMap[lower]) {
            pattern += diacriticMap[lower];
        } else {
            pattern += escapeRegExp(char);
        }
    }

    return new RegExp(pattern, 'i');
};

const getEvents = async (req, res) => {
    try {
        const {
            category,
            dateFrom,
            dateTo,
            priceMin,
            priceMax,
            sortBy
        } = req.query;

        const filters = [];

        if (category) {
            const parts = String(category)
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean);

            if (parts.length <= 1) {
                const categoryRegex = buildDiacriticRegex(category);
                filters.push({ categories: { $elemMatch: { $regex: categoryRegex } } });
            } else {
                const regexes = parts.map(buildDiacriticRegex);
                filters.push({ categories: { $in: regexes } });
            }
        }

        if (dateFrom || dateTo) {
            const dateFilter = {};
            if (dateFrom) dateFilter.$gte = new Date(dateFrom);
            if (dateTo) dateFilter.$lte = new Date(dateTo);
            filters.push({ date: dateFilter });
        }

        const min = priceMin !== undefined ? Number(priceMin) : undefined;
        const max = priceMax !== undefined ? Number(priceMax) : undefined;
        const hasMin = Number.isFinite(min);
        const hasMax = Number.isFinite(max);

        if (hasMin || hasMax) {
            const paidCondition = {};
            if (hasMax) {
                paidCondition['priceRange.min'] = { $lte: max };
            }
            if (hasMin) {
                paidCondition['priceRange.max'] = { $gte: min };
            }

            const includeFree = (hasMin ? min <= 0 : true) && (hasMax ? max >= 0 : true);
            if (includeFree) {
                filters.push({ $or: [paidCondition, { isFree: true }] });
            } else {
                filters.push(paidCondition);
            }
        }

        const mongoFilter = filters.length ? { $and: filters } : {};
        const events = await Event.find(mongoFilter);

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

        const sortKey = sortBy || 'date';
        if (sortKey === 'price') {
            eventsWithAvailability.sort((a, b) => {
                const aPrice = a.isFree ? 0 : (a.priceRange?.min ?? 0);
                const bPrice = b.isFree ? 0 : (b.priceRange?.min ?? 0);
                return aPrice - bPrice;
            });
        } else if (sortKey === 'popularity') {
            eventsWithAvailability.sort((a, b) => (b.ticketsSold || 0) - (a.ticketsSold || 0));
        } else {
            eventsWithAvailability.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        res.json({
            status: 1,
            msg: 'Eventos obtenidos con exito',
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
