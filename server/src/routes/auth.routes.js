const express = require('express');
const router = express.Router();
const { login, refresh, logout, me, resetPassword, changePassword } = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { loginLimiter, resetPasswordLimiter } = require('../middlewares/rateLimiter.middleware');

router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/reset-password', resetPasswordLimiter, resetPassword);
router.post('/change-password', verifyToken, changePassword);
router.get('/me', verifyToken, me);

module.exports = router;
