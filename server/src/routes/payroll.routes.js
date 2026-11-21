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
const { validate, payrollValidators } = require('../middlewares/validation.middleware');

router.use(verifyToken);

// GET  /clients/:clientId/payroll                — list all runs
router.get('/', validate(payrollValidators.listPayrollRuns), listPayrollRuns);

// POST /clients/:clientId/payroll/preview        — preview (no save)
router.post('/preview', requireRole('SUPER_ADMIN', 'ADMIN'), validate(payrollValidators.previewPayroll), previewPayroll);

// POST /clients/:clientId/payroll/run            — save as DRAFT
router.post('/run', requireRole('SUPER_ADMIN', 'ADMIN'), validate(payrollValidators.runPayroll), runPayroll);

// GET  /clients/:clientId/payroll/:runId         — get run detail
router.get('/:runId', validate(payrollValidators.getPayrollRun), getPayrollRun);

// POST /clients/:clientId/payroll/:runId/finalize — lock run
router.post('/:runId/finalize', requireRole('SUPER_ADMIN', 'ADMIN'), validate(payrollValidators.finalizePayroll), finalizePayroll);

// GET  /clients/:clientId/payroll/:runId/export  — download CSV (Admin/SuperAdmin only)
router.get('/:runId/export', requireRole('SUPER_ADMIN', 'ADMIN'), validate(payrollValidators.exportPayrollCSV), exportPayrollCSV);

// DELETE /clients/:clientId/payroll/:runId       — delete DRAFT run
router.delete('/:runId', requireRole('SUPER_ADMIN', 'ADMIN'), validate(payrollValidators.deletePayrollRun), deletePayrollRun);

module.exports = router;
