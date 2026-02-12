const { Router } = require('express');
const { getEvents, getEventById, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { getEventReviews, createReview, updateReview, deleteReview } = require('../controllers/reviewController');
const { validarJWT } = require('../middlewares/validate-jwt');
const { requireAdmin } = require('../middlewares/require-admin');

const router = Router();

// Public routes
router.get('/', getEvents);
router.get('/:id', getEventById);
router.get('/:id/reviews', getEventReviews);

// Protected routes (Admin only ideally, for now just JWT)
router.post('/', validarJWT, requireAdmin, createEvent);
router.put('/:id', validarJWT, requireAdmin, updateEvent);
router.delete('/:id', validarJWT, requireAdmin, deleteEvent);

// Reviews (requires login)
router.post('/:id/reviews', validarJWT, createReview);
router.put('/:id/reviews/:reviewId', validarJWT, updateReview);
router.delete('/:id/reviews/:reviewId', validarJWT, deleteReview);

module.exports = router;
