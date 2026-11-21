const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  listStructures,
  getStructure,
  checkConflict,
  createStructure,
} = require('../controllers/structure.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { validate, structureValidators } = require('../middlewares/validation.middleware');

router.use(verifyToken);

// Nested under /clients/:clientId/structures
router.get('/', validate(structureValidators.listStructures), listStructures);
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), validate(structureValidators.createStructure), createStructure);
router.post('/check-conflict', requireRole('SUPER_ADMIN', 'ADMIN'), validate(structureValidators.checkConflict), checkConflict);

module.exports = router;

// Flat routes for single structure
const flatRouter = express.Router();
flatRouter.use(verifyToken);
flatRouter.get('/:id', validate(structureValidators.getStructure), getStructure);

module.exports.flatRouter = flatRouter;
