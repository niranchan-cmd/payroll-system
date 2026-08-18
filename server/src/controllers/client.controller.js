const prisma = require('../utils/prisma');
const { successResponse, errorResponse } = require('../utils/response.utils');

// ─── CLIENT READINESS CHECK ──────────────────────────────────────────────────

function checkReadiness(client) {
  const items = [
    {
      key: 'ctc_structure',
      label: 'CTC Structure Created & Active',
      // Checked separately via structure query
      passed: null,
    },
    {
      key: 'proration_rule',
      label: 'Proration Rule Configured',
      passed: Boolean(client.proration_rule),
    },
    {
      key: 'pf_settings',
      label: 'PF Settings Configured',
      passed: client.pf_on_actual !== null && client.pf_on_actual !== undefined,
    },
    {
      key: 'esi_settings',
      label: 'ESI Settings Configured',
      passed: client.esi_auto_apply !== null && client.esi_auto_apply !== undefined,
    },
    {
      key: 'payroll_cycle',
      label: 'Payroll Cycle Defined',
      passed: Boolean(client.payroll_cycle),
    },
    {
      key: 'payroll_cutoff',
      label: 'Payroll Cut-off Date Set',
      passed: client.payroll_cutoff !== null && client.payroll_cutoff !== undefined,
    },
  ];
  return items;
}

// ─── LIST CLIENTS ────────────────────────────────────────────────────────────

async function listClients(req, res) {
  const clients = await prisma.client.findMany({
    where: { is_active: true },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      name: true,
      registration_no: true,
      pan: true,
      state: true,
      created_at: true,
      _count: { select: { employees: true } },
    },
  });
  return successResponse(res, clients);
}

// ─── GET CLIENT ──────────────────────────────────────────────────────────────

async function getClient(req, res) {
  const { id } = req.params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client || !client.is_active) {
    return errorResponse(res, 'Client not found.', 404);
  }
  return successResponse(res, client);
}

// ─── CREATE CLIENT ───────────────────────────────────────────────────────────

async function createClient(req, res) {
  const { name, registration_no, pan, address, state } = req.body;

  if (!name || name.trim() === '') {
    return errorResponse(res, 'Client name is required.', 400);
  }

  const client = await prisma.client.create({
    data: {
      name: name.trim(),
      registration_no: registration_no?.trim() || null,
      pan: pan?.trim() || null,
      address: address?.trim() || null,
      state: state?.trim() || null,
    },
  });

  return successResponse(res, client, 'Client created successfully.', 201);
}

// ─── UPDATE CLIENT ────────────────────────────────────────────────────────────

async function updateClient(req, res) {
  const { id } = req.params;
  const {
    name,
    registration_no,
    pan,
    address,
    state,
    proration_rule,
    pf_on_actual,
    esi_auto_apply,
    payroll_cycle,
    payroll_cutoff,
  } = req.body;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client || !client.is_active) {
    return errorResponse(res, 'Client not found.', 404);
  }

  // Validate proration_rule if provided
  const validProration = ['CALENDAR', 'FIXED_26', 'FIXED_30', 'WORKING_DAYS'];
  if (proration_rule && !validProration.includes(proration_rule)) {
    return errorResponse(res, `Invalid proration_rule. Must be one of: ${validProration.join(', ')}`, 400);
  }

  // Validate payroll_cutoff
  if (payroll_cutoff !== undefined && (payroll_cutoff < 1 || payroll_cutoff > 31)) {
    return errorResponse(res, 'Payroll cutoff must be between 1 and 31.', 400);
  }

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(registration_no !== undefined && { registration_no }),
      ...(pan !== undefined && { pan }),
      ...(address !== undefined && { address }),
      ...(state !== undefined && { state }),
      ...(proration_rule !== undefined && { proration_rule }),
      ...(pf_on_actual !== undefined && { pf_on_actual: Boolean(pf_on_actual) }),
      ...(esi_auto_apply !== undefined && { esi_auto_apply: Boolean(esi_auto_apply) }),
      ...(payroll_cycle !== undefined && { payroll_cycle }),
      ...(payroll_cutoff !== undefined && { payroll_cutoff: parseInt(payroll_cutoff) }),
    },
  });

  return successResponse(res, updated, 'Client updated successfully.');
}

// ─── CLIENT READINESS ────────────────────────────────────────────────────────

async function getClientReadiness(req, res) {
  const { id } = req.params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client || !client.is_active) {
    return errorResponse(res, 'Client not found.', 404);
  }

  // Check for active structure
  const activeStructure = await prisma.cTCStructure.findFirst({
    where: {
      client_id: id,
      status: 'ACTIVE',
    },
  });

  const items = checkReadiness(client);
  // Fill in the structure check
  const structureItem = items.find((i) => i.key === 'ctc_structure');
  structureItem.passed = Boolean(activeStructure);

  const allPassed = items.every((i) => i.passed);
  const missing = items.filter((i) => !i.passed).map((i) => i.label);

  return successResponse(res, {
    is_ready: allPassed,
    items,
    missing,
  });
}

module.exports = { listClients, getClient, createClient, updateClient, getClientReadiness };
