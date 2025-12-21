const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validate-fields');
const { validarJWT } = require('../middlewares/validate-jwt');
const { checkTicketStatus, checkTicketStatusByPaymentId, getTicketById } = require('../controllers/ticketController');

const router = Router();

// Public polling endpoint using Payment ID (no JWT)
router.get('/status', checkTicketStatusByPaymentId);

// Back-compat: Allow old path /status/:eventId to work without JWT when paymentId is provided as query param
router.get('/status/:eventId', (req, res, next) => {
	// If client passes paymentId in query, treat it as public polling and bypass JWT
	if (req.query && req.query.paymentId) {
		return checkTicketStatusByPaymentId(req, res);
	}
	// otherwise continue to the authenticated handler
	return next();
});

// Authenticated routes (require JWT)
router.use(validarJWT);
router.get('/:id', getTicketById);
router.get('/status/:eventId', checkTicketStatus);

module.exports = router;
