const { Router } = require('express');
const { getEvents, getEventById, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { validarJWT } = require('../middlewares/validate-jwt');

const router = Router();

// Public routes
router.get('/', getEvents);
router.get('/:id', getEventById);

// Protected routes (Admin only ideally, for now just JWT)
router.post('/', validarJWT, createEvent);
router.put('/:id', validarJWT, updateEvent);
router.delete('/:id', validarJWT, deleteEvent);

module.exports = router;
