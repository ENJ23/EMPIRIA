const express = require('express');
const router = express.Router();
const { loginManual, loginGoogle, registerAdmin, register } = require('../controllers/authController');

router.post('/login', loginManual);
router.post('/register', register);
router.post('/google', loginGoogle);
router.post('/register-admin', registerAdmin); // Helper endpoint

module.exports = router;
