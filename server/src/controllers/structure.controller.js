const prisma = require('../utils/prisma');
const { successResponse, errorResponse } = require('../utils/response.utils');

// ─── LIST STRUCTURE VERSIONS ─────────────────────────────────────────────────

async function listStructures(req, res) {
  const { clientId } = req.params;

  const structures = await prisma.cTCStructure.findMany({
    where: { client_id: clientId },
    include: { components: { orderBy: { display_order: 'asc' } } },
    orderBy: { effective_from: 'desc' },
  });

  return successResponse(res, structures);
}

// ─── GET STRUCTURE ────────────────────────────────────────────────────────────

async function getStructure(req, res) {
  const { id } = req.params;
  const structure = await prisma.cTCStructure.findUnique({
    where: { id },
    include: { components: { orderBy: { display_order: 'asc' } } },
  });
  if (!structure) return errorResponse(res, 'Structure not found.', 404);
  return successResponse(res, structure);
}

// ─── CONFLICT CHECK (helper) ──────────────────────────────────────────────────

async function detectConflict(clientId, newEffectiveFrom, excludeId = null) {
  const newDate = new Date(newEffectiveFrom);

  // Find the most recent existing structure by effective_from
  const existing = await prisma.cTCStructure.findFirst({
    where: {
      client_id: clientId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { effective_from: 'desc' },
  });

  if (!existing) return null; // no conflict — first version

  const existingDate = new Date(existing.effective_from);

  // Conflict: new effective date is after or equal to an existing version
  if (newDate >= existingDate) {
    return existing;
  }

  return null;
}

// ─── CHECK CONFLICT (public endpoint) ────────────────────────────────────────

async function checkConflict(req, res) {
  const { clientId } = req.params;
  const { effective_from, exclude_id } = req.body;

  if (!effective_from) {
    return errorResponse(res, 'effective_from is required.', 400);
  }

  const conflict = await detectConflict(clientId, effective_from, exclude_id);
  return successResponse(res, { has_conflict: Boolean(conflict), conflicting_version: conflict });
}

// ─── CREATE STRUCTURE ─────────────────────────────────────────────────────────

async function createStructure(req, res) {
  const { clientId } = req.params;
  const {
    version_name,
    effective_from,
    rounding_rule = 'NEAREST_RUPEE',
    remainder_comp,
    components,
    resolve_conflict, // "AUTO_END" | null
  } = req.body;

  // Validate client
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || !client.is_active) return errorResponse(res, 'Client not found.', 404);

  // Required fields
  if (!version_name || !effective_from || !remainder_comp || !components?.length) {
    return errorResponse(res, 'version_name, effective_from, remainder_comp, and components are required.', 400);
  }

  // Validate components
  const validCalcTypes = ['PERCENT_OF_CTC', 'PERCENT_OF_BASIC', 'PERCENT_OF_GROSS', 'REMAINDER', 'FIXED'];
  const validInclusions = ['INCLUDED', 'ADDED_ON_TOP'];
  for (const comp of components) {
    if (!validCalcTypes.includes(comp.calc_type)) {
      return errorResponse(res, `Invalid calc_type: ${comp.calc_type}`, 400);
    }
    if (!validInclusions.includes(comp.ctc_inclusion)) {
      return errorResponse(res, `Invalid ctc_inclusion: ${comp.ctc_inclusion}`, 400);
    }
  }

  const newDate = new Date(effective_from);

  // Determine status
  const now = new Date();
  let newStatus;
  if (newDate > now) {
    newStatus = 'UPCOMING';
  } else {
    newStatus = 'ACTIVE';
  }

  // Handle conflict
  const conflict = await detectConflict(clientId, effective_from);

  if (conflict && resolve_conflict !== 'AUTO_END') {
    return res.status(409).json({
      success: false,
      message: `Conflict detected with ${conflict.version_name} (effective from ${conflict.effective_from.toISOString().split('T')[0]}).`,
      data: { conflicting_version: conflict },
      conflict: true,
    });
  }

  // Use a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Auto-end conflicting version
    if (conflict && resolve_conflict === 'AUTO_END') {
      const oneDayBefore = new Date(newDate);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);

      await tx.cTCStructure.update({
        where: { id: conflict.id },
        data: {
          effective_to: oneDayBefore,
          status: 'EXPIRED',
        },
      });
    }

    // Expire any currently ACTIVE structures if new one is also ACTIVE
    if (newStatus === 'ACTIVE') {
      await tx.cTCStructure.updateMany({
        where: { client_id: clientId, status: 'ACTIVE', id: { not: conflict?.id } },
        data: { status: 'EXPIRED', effective_to: new Date(newDate.getTime() - 86400000) },
      });
    }

    // Create new structure
    const structure = await tx.cTCStructure.create({
      data: {
        client_id: clientId,
        version_name,
        effective_from: newDate,
        status: newStatus,
        rounding_rule,
        remainder_comp,
        components: {
          create: components.map((c, idx) => ({
            name: c.name,
            calc_type: c.calc_type,
            value: c.value !== undefined ? c.value : null,
            basis: c.basis || 'N/A',
            ctc_inclusion: c.ctc_inclusion,
            is_taxable: Boolean(c.is_taxable),
            display_order: c.display_order ?? idx,
          })),
        },
      },
      include: { components: { orderBy: { display_order: 'asc' } } },
    });

    return structure;
  });

  return successResponse(res, result, 'CTC Structure created successfully.', 201);
}

module.exports = { listStructures, getStructure, checkConflict, createStructure };
