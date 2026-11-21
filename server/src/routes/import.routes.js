const express = require('express');
const multer = require('multer');
const router = express.Router({ mergeParams: true });
const { downloadTemplate, validateImport, confirmImport } = require('../controllers/import.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { validate, importValidators } = require('../middlewares/validation.middleware');

// Store upload in memory (no disk) — buffer only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx / .xls) are accepted.'));
    }
  },
});

router.use(verifyToken);

// GET  /clients/:clientId/employees/import/template — download xlsx template
router.get('/template', validate(importValidators.template), downloadTemplate);

// POST /clients/:clientId/employees/import/validate — validate xlsx, return error report
router.post('/validate', requireRole('SUPER_ADMIN', 'ADMIN'), upload.single('file'), validate(importValidators.validateImport), validateImport);

// POST /clients/:clientId/employees/import/confirm  — bulk create validated rows
router.post('/confirm', requireRole('SUPER_ADMIN', 'ADMIN'), validate(importValidators.confirmImport), confirmImport);

module.exports = router;
