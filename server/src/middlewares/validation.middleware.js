/**
 * server/src/middlewares/validation.middleware.js
 *
 * Centralized Input Validation & Sanitization Middleware using express-validator v7.
 * Provides standardized error formatting adhering to:
 * { success: false, message: 'Validation failed', errors: [{ field, message }] }
 */

const { validationResult, body, param, query } = require('express-validator');
const { errorResponse } = require('../utils/response.utils');

/**
 * Higher-order middleware factory. Executes an array of express-validator chains.
 * If any validations fail, halts request processing and returns 400 Bad Request.
 *
 * @param {Array} validations - Array of validation chains
 * @returns {Function} Express middleware (req, res, next)
 */
const validate = (validations) => {
  return async (req, res, next) => {
    for (const validation of validations) {
      await validation.run(req);
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return errorResponse(res, 'Validation failed', 400, formattedErrors);
  };
};

// ─── AUTHENTICATION VALIDATION SCHEMAS ─────────────────────────────────────────
const authValidators = {
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Valid email address is required')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
  ],
  changePassword: [
    body('currentPassword')
      .notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  ],
};

// ─── CLIENT VALIDATION SCHEMAS ─────────────────────────────────────────────────
const clientValidators = {
  createClient: [
    body('name')
      .trim()
      .notEmpty().withMessage('Client name is required')
      .isLength({ max: 255 }).withMessage('Client name must not exceed 255 characters'),
    body('pan')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .toUpperCase()
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
      .withMessage('PAN must be in valid Indian Income Tax format (e.g. ABCDE1234F)'),
    body('registration_no')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 }).withMessage('Registration number must not exceed 100 characters'),
    body('address')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
    body('state')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 }).withMessage('State must not exceed 100 characters'),
  ],
  updateClient: [
    param('id')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Client name cannot be empty')
      .isLength({ max: 255 }).withMessage('Client name must not exceed 255 characters'),
    body('pan')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .toUpperCase()
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
      .withMessage('PAN must be in valid Indian Income Tax format (e.g. ABCDE1234F)'),
    body('registration_no')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 }).withMessage('Registration number must not exceed 100 characters'),
    body('address')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
    body('state')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 }).withMessage('State must not exceed 100 characters'),
    body('proration_rule')
      .optional({ nullable: true })
      .isIn(['CALENDAR', 'FIXED_26', 'FIXED_30', 'WORKING_DAYS'])
      .withMessage('Invalid proration_rule. Must be one of: CALENDAR, FIXED_26, FIXED_30, WORKING_DAYS'),
    body('pf_on_actual')
      .optional({ nullable: true })
      .isBoolean().withMessage('pf_on_actual must be a boolean (true or false)'),
    body('esi_auto_apply')
      .optional({ nullable: true })
      .isBoolean().withMessage('esi_auto_apply must be a boolean (true or false)'),
    body('payroll_cycle')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 50 }).withMessage('payroll_cycle must not exceed 50 characters'),
    body('payroll_cutoff')
      .optional({ nullable: true })
      .isInt({ min: 1, max: 31 })
      .withMessage('Payroll cutoff must be an integer between 1 and 31'),
  ],
  getClient: [
    param('id')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
  ],
  deleteClient: [
    param('id')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('password')
      .notEmpty().withMessage('Authentication password is required to delete a client'),
  ],
  getClientReadiness: [
    param('id')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
  ],
};

// ─── EMPLOYEE VALIDATION SCHEMAS ───────────────────────────────────────────────
const employeeValidators = {
  listEmployees: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    query('status')
      .optional()
      .isIn(['ACTIVE', 'INACTIVE', 'ALL'])
      .withMessage('status query parameter must be ACTIVE, INACTIVE, or ALL'),
    query('search')
      .optional()
      .trim(),
  ],
  getEmployee: [
    param('id')
      .isUUID().withMessage('Invalid employee ID format (must be UUID)'),
    query('clientId')
      .optional()
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
  ],
  createEmployee: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('name')
      .trim()
      .notEmpty().withMessage('Employee name is required')
      .isLength({ max: 255 }).withMessage('Name must not exceed 255 characters'),
    body('roll_no')
      .trim()
      .notEmpty().withMessage('Roll number is required')
      .isLength({ max: 100 }).withMessage('Roll number must not exceed 100 characters'),
    body('designation')
      .trim()
      .notEmpty().withMessage('Designation is required')
      .isLength({ max: 255 }).withMessage('Designation must not exceed 255 characters'),
    body('start_date')
      .notEmpty().withMessage('start_date is required')
      .isISO8601().withMessage('start_date must be a valid ISO8601 date (YYYY-MM-DD)'),
    body('annual_ctc')
      .notEmpty().withMessage('annual_ctc is required')
      .isFloat({ min: 0.01 }).withMessage('Annual CTC must be a positive number greater than 0'),
    body('tax_regime')
      .notEmpty().withMessage('tax_regime is required')
      .isIn(['OLD', 'NEW']).withMessage('tax_regime must be either OLD or NEW'),
    body('department')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 255 }).withMessage('Department must not exceed 255 characters'),
    body('email')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('confirmed')
      .optional()
      .isBoolean().withMessage('confirmed must be a boolean'),
  ],
  previewSalary: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('annual_ctc')
      .notEmpty().withMessage('annual_ctc is required')
      .isFloat({ min: 0.01 }).withMessage('Annual CTC must be a positive number greater than 0'),
    body('start_date')
      .notEmpty().withMessage('start_date is required')
      .isISO8601().withMessage('start_date must be a valid ISO8601 date (YYYY-MM-DD)'),
  ],
  updateEmployee: [
    param('id')
      .isUUID().withMessage('Invalid employee ID format (must be UUID)'),
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Name cannot be empty')
      .isLength({ max: 255 }).withMessage('Name must not exceed 255 characters'),
    body('roll_no')
      .optional()
      .trim()
      .notEmpty().withMessage('Roll number cannot be empty')
      .isLength({ max: 100 }).withMessage('Roll number must not exceed 100 characters'),
    body('designation')
      .optional()
      .trim()
      .notEmpty().withMessage('Designation cannot be empty')
      .isLength({ max: 255 }).withMessage('Designation must not exceed 255 characters'),
    body('department')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 255 }).withMessage('Department must not exceed 255 characters'),
    body('email')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('start_date')
      .optional()
      .isISO8601().withMessage('start_date must be a valid ISO8601 date (YYYY-MM-DD)'),
    body('tax_regime')
      .optional()
      .isIn(['OLD', 'NEW']).withMessage('tax_regime must be OLD or NEW'),
    body('status')
      .optional()
      .isIn(['ACTIVE', 'INACTIVE']).withMessage('status must be ACTIVE or INACTIVE'),
    body('annual_ctc')
      .optional()
      .isFloat({ min: 0.01 }).withMessage('Annual CTC must be a positive number greater than 0'),
  ],
  reviseCTC: [
    param('id')
      .isUUID().withMessage('Invalid employee ID format (must be UUID)'),
    body('new_annual_ctc')
      .notEmpty().withMessage('new_annual_ctc is required')
      .isFloat({ min: 0.01 }).withMessage('New Annual CTC must be a positive number greater than 0'),
    body('effective_from')
      .notEmpty().withMessage('effective_from is required')
      .isISO8601().withMessage('Valid effective_from date is required (YYYY-MM-DD)'),
    body('confirmed')
      .custom((value) => value === true || value === 'true')
      .withMessage('Salary preview confirmation is required. Set confirmed: true'),
    body('notes')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
  ],
  previewCTCRevision: [
    param('id')
      .isUUID().withMessage('Invalid employee ID format (must be UUID)'),
    body('new_annual_ctc')
      .notEmpty().withMessage('new_annual_ctc is required')
      .isFloat({ min: 0.01 }).withMessage('New Annual CTC must be a positive number greater than 0'),
    body('effective_from')
      .notEmpty().withMessage('effective_from is required')
      .isISO8601().withMessage('Valid effective_from date is required (YYYY-MM-DD)'),
  ],
  deleteEmployee: [
    param('id')
      .isUUID().withMessage('Invalid employee ID format (must be UUID)'),
  ],
};

// ─── CTC STRUCTURE VALIDATION SCHEMAS ─────────────────────────────────────────
const structureValidators = {
  listStructures: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
  ],
  getStructure: [
    param('id')
      .isUUID().withMessage('Invalid structure ID format (must be UUID)'),
    query('clientId')
      .optional()
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
  ],
  checkConflict: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('effective_from')
      .notEmpty().withMessage('effective_from is required')
      .isISO8601().withMessage('effective_from must be a valid ISO8601 date (YYYY-MM-DD)'),
    body('exclude_id')
      .optional({ nullable: true })
      .isUUID().withMessage('Invalid exclude_id format (must be UUID)'),
  ],
  createStructure: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('version_name')
      .trim()
      .notEmpty().withMessage('version_name is required')
      .isLength({ max: 50 }).withMessage('version_name must not exceed 50 characters'),
    body('effective_from')
      .notEmpty().withMessage('effective_from is required')
      .isISO8601().withMessage('effective_from must be a valid ISO8601 date (YYYY-MM-DD)'),
    body('rounding_rule')
      .optional()
      .isIn(['NEAREST_RUPEE', 'NEAREST_10', 'NONE'])
      .withMessage('Invalid rounding_rule. Must be NEAREST_RUPEE, NEAREST_10, or NONE'),
    body('remainder_comp')
      .trim()
      .notEmpty().withMessage('remainder_comp is required'),
    body('components')
      .isArray({ min: 1 }).withMessage('components must be a non-empty array'),
    body('components.*.name')
      .trim()
      .notEmpty().withMessage('Component name is required in each component entry'),
    body('components.*.calc_type')
      .isIn(['PERCENT_OF_CTC', 'PERCENT_OF_BASIC', 'PERCENT_OF_GROSS', 'REMAINDER', 'FIXED'])
      .withMessage('Invalid calc_type. Must be PERCENT_OF_CTC, PERCENT_OF_BASIC, PERCENT_OF_GROSS, REMAINDER, or FIXED'),
    body('components.*.ctc_inclusion')
      .isIn(['INCLUDED', 'ADDED_ON_TOP'])
      .withMessage('ctc_inclusion must be INCLUDED or ADDED_ON_TOP'),
    body('components.*.value')
      .optional({ nullable: true })
      .isFloat({ min: 0 }).withMessage('Component value must be a non-negative number'),
    body('components.*.is_taxable')
      .optional()
      .isBoolean().withMessage('is_taxable must be boolean'),
    body('components.*.display_order')
      .optional()
      .isInt({ min: 0 }).withMessage('display_order must be an integer'),
    body('resolve_conflict')
      .optional({ nullable: true })
      .isIn(['AUTO_END']).withMessage('resolve_conflict must be AUTO_END if specified'),
  ],
};

// ─── PAYROLL VALIDATION SCHEMAS ───────────────────────────────────────────────
const payrollValidators = {
  listPayrollRuns: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
  ],
  previewPayroll: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('month')
      .notEmpty().withMessage('month is required')
      .isInt({ min: 1, max: 12 }).withMessage('month must be an integer between 1 and 12'),
    body('year')
      .notEmpty().withMessage('year is required')
      .isInt({ min: 2020, max: 2100 }).withMessage('year must be an integer between 2020 and 2100'),
    body('attendanceOverrides')
      .optional()
      .isObject().withMessage('attendanceOverrides must be an object'),
    body('otOverrides')
      .optional()
      .isObject().withMessage('otOverrides must be an object'),
  ],
  runPayroll: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('month')
      .notEmpty().withMessage('month is required')
      .isInt({ min: 1, max: 12 }).withMessage('month must be an integer between 1 and 12'),
    body('year')
      .notEmpty().withMessage('year is required')
      .isInt({ min: 2020, max: 2100 }).withMessage('year must be an integer between 2020 and 2100'),
    body('notes')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
    body('excludedEmployeeIds')
      .optional()
      .isArray().withMessage('excludedEmployeeIds must be an array'),
    body('excludedEmployeeIds.*')
      .optional()
      .isUUID().withMessage('Each excluded employee ID must be a valid UUID'),
    body('attendanceOverrides')
      .optional()
      .isObject().withMessage('attendanceOverrides must be an object'),
    body('otOverrides')
      .optional()
      .isObject().withMessage('otOverrides must be an object'),
  ],
  getPayrollRun: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    param('runId')
      .isUUID().withMessage('Invalid payroll run ID format (must be UUID)'),
  ],
  finalizePayroll: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    param('runId')
      .isUUID().withMessage('Invalid payroll run ID format (must be UUID)'),
  ],
  exportPayrollCSV: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    param('runId')
      .isUUID().withMessage('Invalid payroll run ID format (must be UUID)'),
  ],
  deletePayrollRun: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    param('runId')
      .isUUID().withMessage('Invalid payroll run ID format (must be UUID)'),
  ],
};

// ─── IMPORT VALIDATION SCHEMAS ────────────────────────────────────────────────
const importValidators = {
  template: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
  ],
  validateImport: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
  ],
  confirmImport: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('rows')
      .isArray({ min: 1 }).withMessage('rows must be a non-empty array'),
    body('rows.*.name')
      .trim()
      .notEmpty().withMessage('Employee name is required in each row')
      .isLength({ max: 255 }).withMessage('Name must not exceed 255 characters'),
    body('rows.*.rollNo')
      .trim()
      .notEmpty().withMessage('Roll number is required in each row')
      .isLength({ max: 100 }).withMessage('Roll number must not exceed 100 characters'),
    body('rows.*.designation')
      .trim()
      .notEmpty().withMessage('Designation is required in each row')
      .isLength({ max: 255 }).withMessage('Designation must not exceed 255 characters'),
    body('rows.*.startDate')
      .notEmpty().withMessage('startDate is required in each row')
      .isISO8601().withMessage('startDate must be a valid ISO8601 date (YYYY-MM-DD)'),
    body('rows.*.annualCTC')
      .notEmpty().withMessage('annualCTC is required in each row')
      .isFloat({ min: 0.01 }).withMessage('annualCTC must be a positive number greater than 0'),
    body('rows.*.taxRegime')
      .notEmpty().withMessage('taxRegime is required in each row')
      .isIn(['OLD', 'NEW']).withMessage('taxRegime must be OLD or NEW'),
    body('rows.*.email')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isEmail().withMessage('Invalid email in row')
      .normalizeEmail(),
    body('rows.*.department')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 255 }).withMessage('Department must not exceed 255 characters'),
  ],
};

// ─── REPORT VALIDATION SCHEMAS ────────────────────────────────────────────────
const reportValidators = {
  payRegister: [
    query('clientId')
      .optional()
      .custom((val) => val === 'all' || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val))
      .withMessage('clientId must be "all" or a valid UUID'),
    query('month')
      .optional()
      .custom((val) => val === 'all' || (parseInt(val, 10) >= 1 && parseInt(val, 10) <= 12))
      .withMessage('month must be "all" or an integer between 1 and 12'),
    query('year')
      .optional()
      .custom((val) => val === 'all' || (parseInt(val, 10) >= 2020 && parseInt(val, 10) <= 2100))
      .withMessage('year must be "all" or an integer between 2020 and 2100'),
    query('status')
      .optional()
      .isIn(['FINALIZED', 'DRAFT', 'ALL'])
      .withMessage('status must be FINALIZED, DRAFT, or ALL'),
    query('search')
      .optional()
      .trim(),
  ],
};

// ─── HR VALIDATION SCHEMAS ───────────────────────────────────────────────────
const hrValidators = {
  clientIdParam: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
  ],
  createLeaveRequest: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('employee_id')
      .isUUID().withMessage('Valid employee UUID is required'),
    body('leave_type')
      .isIn(['CASUAL', 'SICK', 'PRIVILEGE', 'UNPAID'])
      .withMessage('leave_type must be one of: CASUAL, SICK, PRIVILEGE, UNPAID'),
    body('start_date')
      .notEmpty().withMessage('start_date is required')
      .isISO8601().withMessage('start_date must be a valid ISO8601 date'),
    body('end_date')
      .notEmpty().withMessage('end_date is required')
      .isISO8601().withMessage('end_date must be a valid ISO8601 date'),
    body('total_days')
      .notEmpty().withMessage('total_days is required')
      .isFloat({ min: 0.5, max: 365 }).withMessage('total_days must be between 0.5 and 365'),
    body('reason')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters'),
  ],
  updateLeaveStatus: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    param('id')
      .isUUID().withMessage('Invalid leave request ID format (must be UUID)'),
    body('status')
      .isIn(['APPROVED', 'REJECTED'])
      .withMessage('status must be APPROVED or REJECTED'),
  ],
  addDocument: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('employee_id')
      .isUUID().withMessage('Valid employee UUID is required'),
    body('doc_type')
      .isIn(['PAN', 'AADHAAR', 'BANK_PASSBOOK', 'SIGNED_NDA', 'EXPERIENCE', 'OTHER'])
      .withMessage('Invalid doc_type. Must be PAN, AADHAAR, BANK_PASSBOOK, SIGNED_NDA, EXPERIENCE, or OTHER'),
    body('doc_name')
      .trim()
      .notEmpty().withMessage('doc_name is required')
      .isLength({ max: 255 }).withMessage('doc_name must not exceed 255 characters'),
    body('file_url')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 1000 }).withMessage('file_url must not exceed 1000 characters'),
  ],
  verifyDocument: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    param('id')
      .isUUID().withMessage('Invalid document ID format (must be UUID)'),
    body('verification_status')
      .isIn(['VERIFIED', 'REJECTED', 'PENDING'])
      .withMessage('verification_status must be VERIFIED, REJECTED, or PENDING'),
  ],
  assignAsset: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('employee_id')
      .isUUID().withMessage('Valid employee UUID is required'),
    body('asset_name')
      .trim()
      .notEmpty().withMessage('asset_name is required')
      .isLength({ max: 255 }).withMessage('asset_name must not exceed 255 characters'),
    body('asset_tag')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 }).withMessage('asset_tag must not exceed 100 characters'),
    body('serial_number')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 }).withMessage('serial_number must not exceed 100 characters'),
  ],
  updateAssetStatus: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    param('id')
      .isUUID().withMessage('Invalid asset ID format (must be UUID)'),
    body('status')
      .isIn(['ASSIGNED', 'RETURNED', 'DAMAGED'])
      .withMessage('status must be ASSIGNED, RETURNED, or DAMAGED'),
  ],
  updateEmployeeManager: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    param('employeeId')
      .isUUID().withMessage('Invalid employee ID format (must be UUID)'),
    body('manager_id')
      .optional({ nullable: true })
      .custom((val) => val === null || val === '' || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val))
      .withMessage('manager_id must be a valid UUID or null'),
  ],
  createPolicy: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('title')
      .trim()
      .notEmpty().withMessage('Policy title is required')
      .isLength({ max: 255 }).withMessage('title must not exceed 255 characters'),
    body('category')
      .optional({ nullable: true })
      .isIn(['COMPLIANCE', 'LEAVE', 'REMOTE_WORK', 'GENERAL'])
      .withMessage('Invalid category'),
    body('summary')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 1000 }).withMessage('summary must not exceed 1000 characters'),
  ],
  issueLetter: [
    param('clientId')
      .isUUID().withMessage('Invalid client ID format (must be UUID)'),
    body('employee_id')
      .isUUID().withMessage('Valid employee UUID is required'),
    body('letter_type')
      .isIn(['APPOINTMENT', 'CONFIRMATION', 'RELIEVING', 'BONAFIDE'])
      .withMessage('letter_type must be APPOINTMENT, CONFIRMATION, RELIEVING, or BONAFIDE'),
    body('signatory_name')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 }).withMessage('signatory_name must not exceed 100 characters'),
    body('signatory_title')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 }).withMessage('signatory_title must not exceed 100 characters'),
  ],
};

module.exports = {
  validate,
  authValidators,
  clientValidators,
  employeeValidators,
  structureValidators,
  payrollValidators,
  importValidators,
  reportValidators,
  hrValidators,
};
