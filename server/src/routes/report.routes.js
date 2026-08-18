const express = require('express');
const router = express.Router();
const { getPayRegister, exportPayRegisterCSV } = require('../controllers/report.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.use(verifyToken);

// GET /api/v1/reports/pay-register — aggregated pay register
router.get('/pay-register', getPayRegister);

// GET /api/v1/reports/pay-register/export — CSV export
router.get('/pay-register/export', exportPayRegisterCSV);

module.exports = router;
