const Ticket = require('../models/Ticket');

/**
 * Check if the user has a ticket for a specific event
 * Used for polling from the frontend
 */
const checkTicketStatus = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.uid; // From JWT

        // console.log(`Checking ticket for User: ${userId} Event: ${eventId}`);

        // Find the most recent approved ticket for this user and event
        const ticket = await Ticket.findOne({
            user: userId,
            event: eventId,
            status: 'approved'
        }).sort({ createdAt: -1 });

        if (ticket) {
            console.log('✅ Ticket FOUND:', ticket._id);
            return res.json({
                status: 1,
                hasTicket: true,
                ticketId: ticket._id
            });
        }

        // console.log('❌ Ticket NOT found yet');
        res.json({
            status: 1,
            hasTicket: false
        });

    } catch (error) {
        console.error('Error checking ticket status:', error);
        res.status(500).json({ status: 0, msg: 'Error interno' });
    }
};

/**
 * Get Ticket Details by ID
 */
const getTicketById = async (req, res) => {
    try {
        const { id } = req.params;

        const ticket = await Ticket.findById(id)
            .populate('event', 'title date location imageUrl')
            .populate('user', 'name email');

        if (!ticket) {
            return res.status(404).json({ status: 0, msg: 'Ticket no encontrado' });
        }

        // Security check: Only the owner or admin should view it (skipping admin check for MVP simplicity, just owner)
        if (ticket.user._id.toString() !== req.uid) {
            return res.status(401).json({ status: 0, msg: 'No autorizado' });
        }

        res.json({
            status: 1,
            ticket
        });

    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ status: 0, msg: 'Error interno' });
    }
};

module.exports = {
    checkTicketStatus,
    getTicketById
};
