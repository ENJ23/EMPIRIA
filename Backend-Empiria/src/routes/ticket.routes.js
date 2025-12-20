const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validate-fields');
const { validarJWT } = require('../middlewares/validate-jwt');
const { checkTicketStatus, getTicketById } = require('../controllers/ticketController');

const router = Router();

// All routes here require Authentication
router.use(validarJWT);

router.get('/status/:eventId', checkTicketStatus);
router.get('/:id', getTicketById);

module.exports = router;
