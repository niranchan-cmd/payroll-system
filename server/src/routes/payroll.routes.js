const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  listPayrollRuns,
  previewPayroll,
  runPayroll,
  getPayrollRun,
  finalizePayroll,
  exportPayrollCSV,
  deletePayrollRun,
} = require('../controllers/payroll.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.use(verifyToken);

// GET  /clients/:clientId/payroll                — list all runs
router.get('/', listPayrollRuns);

// POST /clients/:clientId/payroll/preview        — preview (no save)
router.post('/preview', requireRole('SUPER_ADMIN', 'ADMIN'), previewPayroll);

// POST /clients/:clientId/payroll/run            — save as DRAFT
router.post('/run', requireRole('SUPER_ADMIN', 'ADMIN'), runPayroll);

// GET  /clients/:clientId/payroll/:runId         — get run detail
router.get('/:runId', getPayrollRun);

// POST /clients/:clientId/payroll/:runId/finalize — lock run
router.post('/:runId/finalize', requireRole('SUPER_ADMIN', 'ADMIN'), finalizePayroll);

// GET  /clients/:clientId/payroll/:runId/export  — download CSV
router.get('/:runId/export', exportPayrollCSV);

// DELETE /clients/:clientId/payroll/:runId       — delete DRAFT run
router.delete('/:runId', requireRole('SUPER_ADMIN', 'ADMIN'), deletePayrollRun);

module.exports = router;
