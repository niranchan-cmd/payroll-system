const express = require('express');
const router = express.Router();
const { getPayRegister, exportPayRegisterCSV } = require('../controllers/report.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { validate, reportValidators } = require('../middlewares/validation.middleware');

router.use(verifyToken);

// GET /api/v1/reports/pay-register — aggregated pay register (Admin/SuperAdmin only)
router.get('/pay-register', requireRole('SUPER_ADMIN', 'ADMIN'), validate(reportValidators.payRegister), getPayRegister);

// GET /api/v1/reports/pay-register/export — CSV export (Admin/SuperAdmin only)
router.get('/pay-register/export', requireRole('SUPER_ADMIN', 'ADMIN'), validate(reportValidators.payRegister), exportPayRegisterCSV);

module.exports = router;
