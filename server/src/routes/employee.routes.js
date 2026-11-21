const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  listEmployees,
  getEmployee,
  previewSalary,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  reviseCTC,
  previewCTCRevision,
} = require('../controllers/employee.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { validate, employeeValidators } = require('../middlewares/validation.middleware');

router.use(verifyToken);

// Nested under /clients/:clientId/employees
router.get('/', validate(employeeValidators.listEmployees), listEmployees);
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), validate(employeeValidators.createEmployee), createEmployee);
router.post('/preview-salary', requireRole('SUPER_ADMIN', 'ADMIN'), validate(employeeValidators.previewSalary), previewSalary);

module.exports = router;

// Flat employee routes
const flatRouter = express.Router();
flatRouter.use(verifyToken);
flatRouter.get('/:id', validate(employeeValidators.getEmployee), getEmployee);
flatRouter.patch('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), validate(employeeValidators.updateEmployee), updateEmployee);
flatRouter.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), validate(employeeValidators.deleteEmployee), deleteEmployee);
flatRouter.post('/:id/revise-ctc', requireRole('SUPER_ADMIN', 'ADMIN'), validate(employeeValidators.reviseCTC), reviseCTC);
flatRouter.post('/:id/preview-revision', requireRole('SUPER_ADMIN', 'ADMIN'), validate(employeeValidators.previewCTCRevision), previewCTCRevision);

module.exports.flatRouter = flatRouter;
