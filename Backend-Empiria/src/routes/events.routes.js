const { Router } = require('express');
const { getEvents, getEventById, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { validarJWT } = require('../middlewares/validate-jwt');
const { requireAdmin } = require('../middlewares/require-admin');

const router = Router();

// Public routes
router.get('/', getEvents);
router.get('/:id', getEventById);

// Protected routes (Admin only ideally, for now just JWT)
router.post('/', validarJWT, requireAdmin, createEvent);
router.put('/:id', validarJWT, requireAdmin, updateEvent);
router.delete('/:id', validarJWT, requireAdmin, deleteEvent);

module.exports = router;
