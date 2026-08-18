const express = require('express');
const router = express.Router();
const {
  listClients,
  getClient,
  createClient,
  updateClient,
  getClientReadiness,
} = require('../controllers/client.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.use(verifyToken);

router.get('/', listClients);
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), createClient);
router.get('/:id', getClient);
router.patch('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), updateClient);
router.get('/:id/readiness', getClientReadiness);

module.exports = router;
