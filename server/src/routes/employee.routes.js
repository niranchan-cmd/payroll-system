const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  listEmployees,
  getEmployee,
  previewSalary,
  createEmployee,
  reviseCTC,
  previewCTCRevision,
} = require('../controllers/employee.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.use(verifyToken);

// Nested under /clients/:clientId/employees
router.get('/', listEmployees);
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), createEmployee);
router.post('/preview-salary', requireRole('SUPER_ADMIN', 'ADMIN'), previewSalary);

module.exports = router;

// Flat employee routes
const flatRouter = express.Router();
flatRouter.use(verifyToken);
flatRouter.get('/:id', getEmployee);
flatRouter.post('/:id/revise-ctc', requireRole('SUPER_ADMIN', 'ADMIN'), reviseCTC);
flatRouter.post('/:id/preview-revision', requireRole('SUPER_ADMIN', 'ADMIN'), previewCTCRevision);

module.exports.flatRouter = flatRouter;
