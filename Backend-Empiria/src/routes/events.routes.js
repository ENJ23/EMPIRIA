const { Router } = require('express');
const { getEvents, getEventById, createEvent, deleteEvent } = require('../controllers/eventController');
const { validarJWT } = require('../middlewares/validate-jwt');

const router = Router();

// Public routes
router.get('/', getEvents);
router.get('/:id', getEventById);

// Protected routes (Admin only ideally, for now just JWT)
router.post('/', validarJWT, createEvent);
router.delete('/:id', validarJWT, deleteEvent);

module.exports = router;
