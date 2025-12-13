const express = require('express');
const router = express.Router();
const { createPayment, handleWebhook } = require('../controllers/paymentController');

router.post('/create', createPayment);
router.post('/webhook', handleWebhook);

module.exports = router;
