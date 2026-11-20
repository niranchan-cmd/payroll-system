const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const {
  getStats,
  getUsers,
  createUser,
  updateUser,
  getClientsSummary,
  getAuditLogs,
} = require('../controllers/admin.controller');

// Require authentication and ADMIN or SUPER_ADMIN role for all admin routes
router.use(verifyToken);
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
router.get('/clients-summary', getClientsSummary);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
