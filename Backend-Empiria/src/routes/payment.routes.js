const { Router } = require('express');
const { createPreference, receiveWebhook } = require('../controllers/paymentController');
const { validarJWT } = require('../middlewares/validate-jwt');

const router = Router();

// Create preference (requires login)
router.post('/create-preference', validarJWT, createPreference);

// Webhooks
router.post('/webhook', receiveWebhook);

module.exports = router;
