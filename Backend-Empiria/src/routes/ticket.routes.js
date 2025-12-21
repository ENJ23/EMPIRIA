const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validate-fields');
const { validarJWT } = require('../middlewares/validate-jwt');
const { checkTicketStatus, checkTicketStatusByPaymentId, getTicketById } = require('../controllers/ticketController');

const router = Router();

// Public polling endpoint using Payment ID (no JWT)
router.get('/status', checkTicketStatusByPaymentId);

// Authenticated routes
router.use(validarJWT);
router.get('/status/:eventId', checkTicketStatus);
router.get('/:id', getTicketById);

module.exports = router;
