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
        console.log(`[getTicketByPaymentId] Request for paymentId: ${paymentId}`);

        if (!paymentId) {
            return res.status(400).json({ status: 0, msg: 'paymentId es requerido' });
        }

        // First try: Find approved ticket
        let ticket = await Ticket.findOne({ payment: paymentId, status: 'approved' })
            .sort({ purchasedAt: -1 })
            .populate('event', 'title date location imageUrl')
            .populate('user', 'name email');

        // Fallback: If no approved ticket, try any ticket for this payment
        if (!ticket) {
            console.log(`[getTicketByPaymentId] No approved ticket found, searching for any ticket...`);
            ticket = await Ticket.findOne({ payment: paymentId })
                .sort({ purchasedAt: -1 })
                .populate('event', 'title date location imageUrl')
                .populate('user', 'name email');
        }

        console.log(`[getTicketByPaymentId] Found ticket:`, ticket ? `${ticket._id} (status: ${ticket.status})` : 'NOT FOUND');

        if (!ticket) {
            console.log(`[getTicketByPaymentId] No ticket found for payment: ${paymentId}`);
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

/**
 * Get Ticket by ID (PUBLIC - no JWT required, no ownership check)
 * Used as last-resort fallback when user has no JWT
 * Security: The ticket ID is treated as an access token
 */
const getTicketByIdPublic = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[getTicketByIdPublic] Request for ticketId: ${id}`);

        if (!id) {
            return res.status(400).json({ status: 0, msg: 'ticketId es requerido' });
        }

        const ticket = await Ticket.findById(id)
            .populate('event', 'title date location imageUrl')
            .populate('user', 'name email');

        if (!ticket) {
            console.log(`[getTicketByIdPublic] Ticket not found: ${id}`);
            return res.status(404).json({ status: 0, msg: 'Ticket no encontrado' });
        }

        console.log(`[getTicketByIdPublic] ✅ Ticket found: ${ticket._id}`);
        res.json({
            status: 1,
            ticket
        });

    } catch (error) {
        console.error('Error fetching ticket publicly:', error);
        res.status(500).json({ status: 0, msg: 'Error interno' });
    }
};

module.exports = {
    checkTicketStatus,
    checkTicketStatusByPaymentId,
    getTicketById,
    getTicketByPaymentId,
    getTicketByIdPublic
};
