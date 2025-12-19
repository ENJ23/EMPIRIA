const { Router } = require('express');
const { createPreference } = require('../controllers/paymentController');
const { validarJWT } = require('../middlewares/validate-jwt');

const router = Router();

// Create preference (requires login)
router.post('/create-preference', validarJWT, createPreference);

// Webhooks (optional for now, but good placeholder)
router.post('/webhook', (req, res) => {
    // console.log(req.query);
    res.sendStatus(200);
});

module.exports = router;
