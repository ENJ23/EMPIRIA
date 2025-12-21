const Ticket = require('../models/Ticket');

/**
 * Public: Check ticket status by Payment record ID (no JWT required)
 * GET /api/tickets/status?paymentId=<Payment._id>
 * Optional legacy support: mpPaymentId=<MercadoPago payment id>
 */
const checkTicketStatusByPaymentId = async (req, res) => {
    try {
        const { paymentId, mpPaymentId } = req.query;

        if (!paymentId && !mpPaymentId) {
            return res.status(400).json({ status: 0, msg: 'paymentId (o mpPaymentId) es requerido' });
        }

        // Prefer primary relationship by Payment._id
        let ticket = null;
        if (paymentId) {
            ticket = await Ticket.findOne({ payment: paymentId, status: 'approved' }).sort({ purchasedAt: -1 });
        }

        // Legacy fallback using Mercado Pago payment id stored in legacy field paymentId
        if (!ticket && mpPaymentId) {
            ticket = await Ticket.findOne({ paymentId: String(mpPaymentId), status: 'approved' }).sort({ purchasedAt: -1 });
        }

        if (ticket) {
            return res.json({ status: 1, hasTicket: true, ticketId: ticket._id });
        }
        return res.json({ status: 1, hasTicket: false });
    } catch (error) {
        console.error('Error checking ticket by paymentId:', error);
        res.status(500).json({ status: 0, msg: 'Error interno' });
    }
};

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
 * Get Ticket Details by ID (AUTHENTICATED - requires JWT)
 * Only the ticket owner can view their ticket
 */
const getTicketById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.uid; // From JWT

        const ticket = await Ticket.findById(id)
            .populate('event', 'title date location imageUrl')
            .populate('user', 'name email');

        if (!ticket) {
            return res.status(404).json({ status: 0, msg: 'Ticket no encontrado' });
        }

        // Security check: Only the owner can view their ticket
        if (ticket.user._id.toString() !== userId) {
            return res.status(403).json({ status: 0, msg: 'No autorizado para ver este ticket' });
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

/**
 * Get Ticket Details by Payment ID (PUBLIC - no JWT required)
 * Fallback endpoint when JWT fails but we have the Payment ID
 * Used immediately after purchase when user is redirected
 */
const getTicketByPaymentId = async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!paymentId) {
            return res.status(400).json({ status: 0, msg: 'paymentId es requerido' });
        }

        const ticket = await Ticket.findOne({ payment: paymentId, status: 'approved' })
            .sort({ purchasedAt: -1 })
            .populate('event', 'title date location imageUrl')
            .populate('user', 'name email');

        if (!ticket) {
            return res.status(404).json({ status: 0, msg: 'Ticket no encontrado para este pago' });
        }

        res.json({
            status: 1,
            ticket
        });

    } catch (error) {
        console.error('Error fetching ticket by payment:', error);
        res.status(500).json({ status: 0, msg: 'Error interno' });
    }
};

module.exports = {
    checkTicketStatus,
    checkTicketStatusByPaymentId,
    getTicketById,
    getTicketByPaymentId
};
