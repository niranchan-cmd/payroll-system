const express = require('express');
const router = express.Router({ mergeParams: true });
const prisma = require('../utils/prisma');
const { errorResponse } = require('../utils/response.utils');
const {
  getHROverview,
  getLeaveBalances,
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus,
  getMonthlyLOP,
  getDocuments,
  addDocument,
  verifyDocument,
  getAssets,
  assignAsset,
  updateAssetStatus,
  getOrgHierarchy,
  updateEmployeeManager,
  getPolicies,
  createPolicy,
  deletePolicy,
  getIssuedLetters,
  issueLetter,
} = require('../controllers/hr.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { validate, hrValidators } = require('../middlewares/validation.middleware');

// ─── CLIENT TENANT ISOLATION GUARD ───────────────────────────────────────────
async function verifyClientExists(req, res, next) {
  const { clientId } = req.params;
  if (!clientId) {
    return errorResponse(res, 'Client ID is required', 400);
  }
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    });
    if (!client) {
      return errorResponse(res, 'Client organization not found or access denied', 404);
    }
    req.client = client;
    next();
  } catch (err) {
    return errorResponse(res, 'Failed to verify client entity', 500);
  }
}

// All HR routes require valid authentication and existing client tenant
router.use(verifyToken);
router.use(validate(hrValidators.clientIdParam));
router.use(verifyClientExists);

// ─── OVERVIEW ────────────────────────────────────────────────────────────────
router.get('/overview', getHROverview);

// ─── LEAVES & ATTENDANCE ─────────────────────────────────────────────────────
router.get('/leaves/balances', getLeaveBalances);
router.get('/leaves/requests', getLeaveRequests);
router.post('/leaves/requests', requireRole('SUPER_ADMIN', 'ADMIN'), validate(hrValidators.createLeaveRequest), createLeaveRequest);
router.patch('/leaves/requests/:id/status', requireRole('SUPER_ADMIN', 'ADMIN'), validate(hrValidators.updateLeaveStatus), updateLeaveStatus);
router.get('/leaves/lop', getMonthlyLOP);

// ─── ONBOARDING & DOCUMENTS ──────────────────────────────────────────────────
router.get('/documents', getDocuments);
router.post('/documents', requireRole('SUPER_ADMIN', 'ADMIN'), validate(hrValidators.addDocument), addDocument);
router.patch('/documents/:id/verify', requireRole('SUPER_ADMIN', 'ADMIN'), validate(hrValidators.verifyDocument), verifyDocument);

// ─── ASSET ASSIGNMENT ────────────────────────────────────────────────────────
router.get('/assets', getAssets);
router.post('/assets', requireRole('SUPER_ADMIN', 'ADMIN'), validate(hrValidators.assignAsset), assignAsset);
router.patch('/assets/:id/status', requireRole('SUPER_ADMIN', 'ADMIN'), validate(hrValidators.updateAssetStatus), updateAssetStatus);

// ─── ORG DIRECTORY & HIERARCHY ───────────────────────────────────────────────
router.get('/hierarchy', getOrgHierarchy);
router.patch('/hierarchy/:employeeId/manager', requireRole('SUPER_ADMIN', 'ADMIN'), validate(hrValidators.updateEmployeeManager), updateEmployeeManager);

// ─── POLICIES ────────────────────────────────────────────────────────────────
router.get('/policies', getPolicies);
router.post('/policies', requireRole('SUPER_ADMIN', 'ADMIN'), validate(hrValidators.createPolicy), createPolicy);
router.delete('/policies/:id', requireRole('SUPER_ADMIN', 'ADMIN'), deletePolicy);

// ─── LETTERHEAD STUDIO ───────────────────────────────────────────────────────
router.get('/letters', getIssuedLetters);
router.post('/letters', requireRole('SUPER_ADMIN', 'ADMIN'), validate(hrValidators.issueLetter), issueLetter);

module.exports = router;
