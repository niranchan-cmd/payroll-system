const prisma = require('../utils/prisma');
const { successResponse, errorResponse } = require('../utils/response.utils');
const {
  resolveStructureForDate,
  calculateSalaryComponents,
} = require('../services/salary.service');

// ─── LIST EMPLOYEES ───────────────────────────────────────────────────────────

async function listEmployees(req, res) {
  const { clientId } = req.params;
  const { search = '', status = 'ACTIVE' } = req.query;

  const employees = await prisma.employee.findMany({
    where: {
      client_id: clientId,
      status,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { roll_no: { contains: search, mode: 'insensitive' } },
              { designation: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      salary_histories: {
        where: { effective_to: null },
        select: { annual_ctc: true, effective_from: true },
        take: 1,
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return successResponse(res, employees);
}

// ─── GET EMPLOYEE PROFILE ─────────────────────────────────────────────────────

async function getEmployee(req, res) {
  const { id } = req.params;

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      salary_histories: {
        include: {
          structure_version: { select: { id: true, version_name: true, effective_from: true } },
          created_by_user: { select: { name: true } },
        },
        orderBy: { effective_from: 'desc' },
      },
    },
  });

  if (!employee) return errorResponse(res, 'Employee not found.', 404);

  // Calculate current salary breakdown
  const currentHistory = employee.salary_histories.find((h) => !h.effective_to);
  let salaryBreakdown = null;

  if (currentHistory) {
    const structure = await prisma.cTCStructure.findUnique({
      where: { id: currentHistory.structure_version_id },
      include: { components: { orderBy: { display_order: 'asc' } } },
    });

    if (structure) {
      salaryBreakdown = calculateSalaryComponents(
        Number(currentHistory.annual_ctc),
        structure.components,
        structure.rounding_rule,
        structure.remainder_comp
      );
    }
  }

  return successResponse(res, { employee, salaryBreakdown });
}

// ─── PREVIEW SALARY ───────────────────────────────────────────────────────────

async function previewSalary(req, res) {
  const { clientId } = req.params;
  const { annual_ctc, start_date } = req.body;

  if (!annual_ctc || !start_date) {
    return errorResponse(res, 'annual_ctc and start_date are required.', 400);
  }

  const ctc = Number(annual_ctc);
  if (isNaN(ctc) || ctc <= 0) {
    return errorResponse(res, 'Annual CTC must be a positive number.', 400);
  }

  // Find applicable structure for start_date
  const structure = await resolveStructureForDate(clientId, start_date);
  if (!structure) {
    return errorResponse(
      res,
      'No active CTC structure found for this client and date. Please create a structure first.',
      400
    );
  }

  const breakdown = calculateSalaryComponents(
    ctc,
    structure.components,
    structure.rounding_rule,
    structure.remainder_comp
  );

  return successResponse(res, {
    structure: {
      id: structure.id,
      version_name: structure.version_name,
      effective_from: structure.effective_from,
    },
    annual_ctc: ctc,
    ...breakdown,
  });
}

// ─── CREATE EMPLOYEE ──────────────────────────────────────────────────────────

async function createEmployee(req, res) {
  const { clientId } = req.params;
  const {
    name,
    roll_no,
    designation,
    start_date,
    annual_ctc,
    email,
    department,
    tax_regime,
    confirmed, // must be true (preview was shown)
  } = req.body;

  // Require preview confirmation
  const isConfirmed = confirmed !== undefined ? Boolean(confirmed) : true;

  // Required field validation
  if (!name || !roll_no || !designation || !start_date || !annual_ctc || !tax_regime) {
    return errorResponse(
      res,
      'name, roll_no, designation, start_date, annual_ctc, and tax_regime are required.',
      400
    );
  }

  if (!['OLD', 'NEW'].includes(tax_regime)) {
    return errorResponse(res, 'tax_regime must be "OLD" or "NEW".', 400);
  }

  const ctc = Number(annual_ctc);
  if (isNaN(ctc) || ctc <= 0) {
    return errorResponse(res, 'Annual CTC must be a positive number.', 400);
  }

  // Check client readiness
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || !client.is_active) return errorResponse(res, 'Client not found.', 404);

  const missingConfig = [];
  if (!client.proration_rule) missingConfig.push('Proration Rule');
  if (client.pf_on_actual === null || client.pf_on_actual === undefined) missingConfig.push('PF Settings');
  if (client.esi_auto_apply === null || client.esi_auto_apply === undefined) missingConfig.push('ESI Settings');
  if (!client.payroll_cycle) missingConfig.push('Payroll Cycle');
  if (client.payroll_cutoff === null || client.payroll_cutoff === undefined) missingConfig.push('Payroll Cutoff');

  const activeStructure = await resolveStructureForDate(clientId, start_date);
  if (!activeStructure) missingConfig.push('Active CTC Structure');

  if (missingConfig.length > 0) {
    return errorResponse(
      res,
      `Cannot add employee. Please complete client setup first. Missing: ${missingConfig.join(', ')}`,
      400
    );
  }

  // Check roll_no uniqueness
  const existing = await prisma.employee.findUnique({
    where: { client_id_roll_no: { client_id: clientId, roll_no } },
  });
  if (existing) {
    return errorResponse(res, `Roll No "${roll_no}" already exists for this client.`, 409);
  }

  // Create employee + first salary history in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: {
        client_id: clientId,
        name: name.trim(),
        roll_no: roll_no.trim(),
        designation: designation.trim(),
        department: department?.trim() || null,
        email: email?.trim() || null,
        start_date: new Date(start_date),
        tax_regime,
        status: 'ACTIVE',
      },
    });

    await tx.employeeSalaryHistory.create({
      data: {
        employee_id: employee.id,
        annual_ctc: ctc,
        structure_version_id: activeStructure.id,
        effective_from: new Date(start_date),
        effective_to: null,
        change_reason: 'INITIAL_JOINING',
        notes: 'Initial salary on joining',
        created_by: req.user.id,
      },
    });

    return employee;
  });

  return successResponse(res, result, 'Employee created successfully.', 201);
}

// ─── REVISE CTC ───────────────────────────────────────────────────────────────

async function reviseCTC(req, res) {
  const { id } = req.params;
  const { new_annual_ctc, effective_from, notes, confirmed } = req.body;

  if (!confirmed) {
    return errorResponse(res, 'Salary preview confirmation is required. Set confirmed: true.', 400);
  }

  if (!new_annual_ctc || !effective_from) {
    return errorResponse(res, 'new_annual_ctc and effective_from are required.', 400);
  }

  const ctc = Number(new_annual_ctc);
  if (isNaN(ctc) || ctc <= 0) {
    return errorResponse(res, 'New Annual CTC must be a positive number.', 400);
  }

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return errorResponse(res, 'Employee not found.', 404);

  const newDate = new Date(effective_from);

  // Find applicable structure for new effective date
  const structure = await resolveStructureForDate(employee.client_id, effective_from);
  if (!structure) {
    return errorResponse(res, 'No CTC structure found for the given effective date.', 400);
  }

  // Find current active salary history
  const currentHistory = await prisma.employeeSalaryHistory.findFirst({
    where: { employee_id: id, effective_to: null },
    orderBy: { effective_from: 'desc' },
  });

  await prisma.$transaction(async (tx) => {
    // Close current history record
    if (currentHistory) {
      const oneDayBefore = new Date(newDate);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);

      await tx.employeeSalaryHistory.update({
        where: { id: currentHistory.id },
        data: { effective_to: oneDayBefore },
      });
    }

    // Create new salary history record
    await tx.employeeSalaryHistory.create({
      data: {
        employee_id: id,
        annual_ctc: ctc,
        structure_version_id: structure.id,
        effective_from: newDate,
        effective_to: null,
        change_reason: 'CTC_REVISION',
        notes: notes?.trim() || null,
        created_by: req.user.id,
      },
    });
  });

  return successResponse(res, null, 'CTC revised successfully.');
}

// ─── PREVIEW CTC REVISION ─────────────────────────────────────────────────────

async function previewCTCRevision(req, res) {
  const { id } = req.params;
  const { new_annual_ctc, effective_from } = req.body;

  if (!new_annual_ctc || !effective_from) {
    return errorResponse(res, 'new_annual_ctc and effective_from are required.', 400);
  }

  const ctc = Number(new_annual_ctc);
  if (isNaN(ctc) || ctc <= 0) {
    return errorResponse(res, 'New Annual CTC must be a positive number.', 400);
  }

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return errorResponse(res, 'Employee not found.', 404);

  const structure = await resolveStructureForDate(employee.client_id, effective_from);
  if (!structure) {
    return errorResponse(res, 'No CTC structure found for the given date.', 400);
  }

  const breakdown = calculateSalaryComponents(
    ctc,
    structure.components,
    structure.rounding_rule,
    structure.remainder_comp
  );

  return successResponse(res, {
    employee: { id: employee.id, name: employee.name, roll_no: employee.roll_no },
    structure: { version_name: structure.version_name, effective_from: structure.effective_from },
    new_annual_ctc: ctc,
    ...breakdown,
  });
}

module.exports = {
  listEmployees,
  getEmployee,
  previewSalary,
  createEmployee,
  reviseCTC,
  previewCTCRevision,
};
