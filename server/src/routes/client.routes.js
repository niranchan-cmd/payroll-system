const express = require('express');
const router = express.Router();
const {
  listClients,
  getClient,
  createClient,
  updateClient,
  getClientReadiness,
  deleteClient,
} = require('../controllers/client.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { validate, clientValidators } = require('../middlewares/validation.middleware');

router.use(verifyToken);

router.get('/', listClients);
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), validate(clientValidators.createClient), createClient);
router.get('/:id', validate(clientValidators.getClient), getClient);
router.patch('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), validate(clientValidators.updateClient), updateClient);
router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), validate(clientValidators.deleteClient), deleteClient);
router.get('/:id/readiness', validate(clientValidators.getClientReadiness), getClientReadiness);

module.exports = router;
