const express = require('express');
const router = express.Router();
const { createLead, getLeads, updateLeadStatus } = require('../controllers/lead.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

// Public inquiry submission
router.post('/', createLead);

// Admin-protected lead management
router.get('/admin', verifyToken, requireRole('SUPER_ADMIN', 'ADMIN'), getLeads);
router.patch('/admin/:id', verifyToken, requireRole('SUPER_ADMIN', 'ADMIN'), updateLeadStatus);

module.exports = router;
