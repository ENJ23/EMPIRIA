const Event = require('../models/Event');

const getEvents = async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json({
            status: 1,
            msg: 'Eventos obtenidos con éxito',
            events
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
        res.json({
            status: 1,
            msg: 'Evento obtenido',
            event
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
    deleteEvent
};
