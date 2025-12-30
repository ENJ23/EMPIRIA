const { Router } = require('express');
const { createPreference, receiveWebhook, getMyPayments } = require('../controllers/paymentController');
const { validarJWT } = require('../middlewares/validate-jwt');

const router = Router();

// Create preference (requires login)
router.post('/create-preference', validarJWT, createPreference);

// Get user's own payments (requires login)
router.get('/my-payments', validarJWT, getMyPayments);

// Webhooks
router.post('/webhook', receiveWebhook);

module.exports = router;
