const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validate-fields');
const { validarJWT } = require('../middlewares/validate-jwt');
const { requireAdmin } = require('../middlewares/require-admin');
const { checkTicketStatus, checkTicketStatusByPaymentId, getTicketById, getTicketByPaymentId, getTicketByIdPublic, listTickets } = require('../controllers/ticketController');

const router = Router();

// PUBLIC ROUTES (no JWT required) - Must be defined BEFORE /:id
// These are more specific routes, so they go first
router.get('/status', checkTicketStatusByPaymentId);
router.get('/by-payment/:paymentId', getTicketByPaymentId);
router.get('/public/:id', getTicketByIdPublic);

// Legacy back-compat: /status/:eventId without JWT if paymentId is in query
router.get('/status/:eventId', (req, res, next) => {
	// If client passes paymentId in query, treat it as public polling and bypass JWT
	if (req.query && req.query.paymentId) {
		return checkTicketStatusByPaymentId(req, res);
	}
	// otherwise continue to the authenticated handler
	return next();
});

// AUTHENTICATED ROUTES (require JWT) - Apply middleware then define specific routes
router.use(validarJWT);
// Admin list of tickets with optional filters
router.get('/', requireAdmin, listTickets);
router.get('/status/:eventId', checkTicketStatus);
router.get('/:id', getTicketById);

module.exports = router;
