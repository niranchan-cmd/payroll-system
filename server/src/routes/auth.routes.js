const express = require('express');
const router = express.Router();
const { login, refresh, logout, me, changePassword } = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { loginLimiter } = require('../middlewares/rateLimiter.middleware');
const { validate, authValidators } = require('../middlewares/validation.middleware');

router.post('/login', loginLimiter, validate(authValidators.login), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/change-password', verifyToken, validate(authValidators.changePassword), changePassword);
router.get('/me', verifyToken, me);

module.exports = router;
