const { Router } = require('express');
const { createPreference, receiveWebhook, getMyPayments, requestFreeTickets } = require('../controllers/paymentController');
const { validarJWT } = require('../middlewares/validate-jwt');

const router = Router();

// Create preference (requires login)
router.post('/create-preference', validarJWT, createPreference);

// Request free tickets for free events (requires login)
router.post('/request-free-tickets', validarJWT, requestFreeTickets);

// Get user's own payments (requires login)
router.get('/my-payments', validarJWT, getMyPayments);

// Webhooks
router.post('/webhook', receiveWebhook);

module.exports = router;
