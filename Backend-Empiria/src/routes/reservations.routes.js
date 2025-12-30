const { Router } = require('express');
const { validarJWT } = require('../middlewares/validate-jwt');
const { requireAdmin } = require('../middlewares/require-admin');
const Reservation = require('../models/Reservation');

const router = Router();

/**
 * Admin endpoint: Clean up expired reservations
 * DELETE /api/reservations/cleanup
 * Requires: Admin role
 */
router.delete('/cleanup', validarJWT, requireAdmin, async (req, res) => {
    try {
        const now = new Date();
        const result = await Reservation.deleteMany({
            confirmed: false,
            reservedUntil: { $lt: now }
        });
        
        console.log(`[cleanup] Deleted ${result.deletedCount} expired reservations`);
        
        res.json({
            status: 1,
            msg: `${result.deletedCount} expired reservations cleaned up`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('[cleanup] Error:', error.message);
        res.status(500).json({ status: 0, msg: 'Error al limpiar reservas' });
    }
});

/**
 * Admin endpoint: Get active reservations for an event
 * GET /api/reservations?eventId=<id>
 * Requires: Admin role
 */
router.get('/', validarJWT, requireAdmin, async (req, res) => {
    try {
        const { eventId } = req.query;
        const query = { confirmed: false, reservedUntil: { $gt: new Date() } };
        
        if (eventId) {
            query.event = eventId;
        }
        
        const reservations = await Reservation.find(query)
            .populate('user', 'nombre apellido correo')
            .populate('event', 'title capacity ticketsSold')
            .sort({ reservedUntil: 1 });
        
        res.json({
            status: 1,
            reservations,
            count: reservations.length
        });
    } catch (error) {
        console.error('[getReservations] Error:', error.message);
        res.status(500).json({ status: 0, msg: 'Error al obtener reservas' });
    }
});

module.exports = router;
