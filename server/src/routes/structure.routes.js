const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  listStructures,
  getStructure,
  checkConflict,
  createStructure,
} = require('../controllers/structure.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.use(verifyToken);

// Nested under /clients/:clientId/structures
router.get('/', listStructures);
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), createStructure);
router.post('/check-conflict', requireRole('SUPER_ADMIN', 'ADMIN'), checkConflict);

module.exports = router;

// Flat routes for single structure
const flatRouter = express.Router();
flatRouter.use(verifyToken);
flatRouter.get('/:id', getStructure);

module.exports.flatRouter = flatRouter;
