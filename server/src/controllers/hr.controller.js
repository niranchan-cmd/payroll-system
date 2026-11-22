const prisma = require('../utils/prisma');
const { successResponse, errorResponse } = require('../utils/response.utils');

// ─── HR OVERVIEW & STATS ──────────────────────────────────────────────────────

async function getHROverview(req, res) {
  const { clientId } = req.params;

  const [
    totalEmployees,
    pendingLeaves,
    pendingDocs,
    totalAssets,
    totalLetters,
    recentLeaves,
    recentDocs,
  ] = await Promise.all([
    prisma.employee.count({ where: { client_id: clientId, status: 'ACTIVE' } }),
    prisma.leaveRequest.count({ where: { client_id: clientId, status: 'PENDING' } }),
    prisma.employeeDocument.count({ where: { client_id: clientId, verification_status: 'PENDING' } }),
    prisma.assetAssignment.count({ where: { client_id: clientId, status: 'ASSIGNED' } }),
    prisma.issuedLetter.count({ where: { client_id: clientId } }),
    prisma.leaveRequest.findMany({
      where: { client_id: clientId },
      include: {
        employee: {
          select: { id: true, name: true, roll_no: true, designation: true, department: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),
    prisma.employeeDocument.findMany({
      where: { client_id: clientId },
      include: {
        employee: {
          select: { id: true, name: true, roll_no: true, designation: true, department: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    }),
  ]);

  return successResponse(res, {
    metrics: {
      totalEmployees,
      pendingLeaves,
      pendingDocs,
      totalAssets,
      totalLetters,
    },
    recentLeaves,
    recentDocs,
  });
}

// ─── LEAVES & ATTENDANCE ──────────────────────────────────────────────────────

async function getLeaveBalances(req, res) {
  const { clientId } = req.params;
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  const employees = await prisma.employee.findMany({
    where: { client_id: clientId, status: 'ACTIVE' },
    select: { id: true, name: true, roll_no: true, designation: true, department: true },
    orderBy: { name: 'asc' },
  });

  const balances = await prisma.leaveBalance.findMany({
    where: { client_id: clientId, year },
  });

  const balanceMap = new Map();
  balances.forEach((b) => balanceMap.set(b.employee_id, b));

  // Merge so every active employee has a balance record
  const result = employees.map((emp) => {
    const existing = balanceMap.get(emp.id);
    if (existing) {
      return {
        ...existing,
        employee: emp,
      };
    }
    return {
      id: `virtual-${emp.id}`,
      client_id: clientId,
      employee_id: emp.id,
      year,
      casual_allocated: 12,
      casual_used: 0,
      sick_allocated: 10,
      sick_used: 0,
      priv_allocated: 15,
      priv_used: 0,
      unpaid_days: 0,
      employee: emp,
    };
  });

  return successResponse(res, result);
}

async function getLeaveRequests(req, res) {
  const { clientId } = req.params;
  const { status, employee_id } = req.query;

  const where = { client_id: clientId };
  if (status) where.status = status;
  if (employee_id) where.employee_id = employee_id;

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: {
        select: { id: true, name: true, roll_no: true, designation: true, department: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return successResponse(res, requests);
}

async function createLeaveRequest(req, res) {
  const { clientId } = req.params;
  const { employee_id, leave_type, start_date, end_date, total_days, reason } = req.body;

  if (!employee_id || !leave_type || !start_date || !end_date || total_days === undefined) {
    return errorResponse(res, 'Missing required leave request fields', 400);
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employee_id, client_id: clientId },
  });
  if (!employee) {
    return errorResponse(res, 'Employee not found in this client entity', 404);
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      client_id: clientId,
      employee_id,
      leave_type,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      total_days: Number(total_days),
      reason: reason || 'Personal Leave',
      status: 'PENDING',
    },
    include: {
      employee: {
        select: { id: true, name: true, roll_no: true, designation: true, department: true },
      },
    },
  });

  return successResponse(res, leave, 'Leave request submitted successfully', 201);
}

async function updateLeaveStatus(req, res) {
  const { clientId, id } = req.params;
  const { status } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return errorResponse(res, 'Status must be APPROVED or REJECTED', 400);
  }

  const leave = await prisma.leaveRequest.findFirst({
    where: { id, client_id: clientId },
  });
  if (!leave) {
    return errorResponse(res, 'Leave request not found', 404);
  }

  const approverInfo = req.user?.email || req.user?.id || 'Admin';

  if (status === 'APPROVED' && leave.status !== 'APPROVED') {
    const year = new Date(leave.start_date).getFullYear();
    const days = Math.round(Number(leave.total_days));

    // Update leave balance
    const existingBalance = await prisma.leaveBalance.findUnique({
      where: {
        client_id_employee_id_year: {
          client_id: clientId,
          employee_id: leave.employee_id,
          year,
        },
      },
    });

    if (existingBalance) {
      const updateData = {};
      if (leave.leave_type === 'CASUAL') updateData.casual_used = existingBalance.casual_used + days;
      else if (leave.leave_type === 'SICK') updateData.sick_used = existingBalance.sick_used + days;
      else if (leave.leave_type === 'PRIVILEGE') updateData.priv_used = existingBalance.priv_used + days;
      else if (leave.leave_type === 'UNPAID') updateData.unpaid_days = existingBalance.unpaid_days + days;

      await prisma.leaveBalance.update({
        where: { id: existingBalance.id },
        data: updateData,
      });
    } else {
      const createData = {
        client_id: clientId,
        employee_id: leave.employee_id,
        year,
        casual_allocated: 12,
        casual_used: leave.leave_type === 'CASUAL' ? days : 0,
        sick_allocated: 10,
        sick_used: leave.leave_type === 'SICK' ? days : 0,
        priv_allocated: 15,
        priv_used: leave.leave_type === 'PRIVILEGE' ? days : 0,
        unpaid_days: leave.leave_type === 'UNPAID' ? days : 0,
      };
      await prisma.leaveBalance.create({ data: createData });
    }
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status,
      approved_by: approverInfo,
      approved_at: new Date(),
    },
    include: {
      employee: {
        select: { id: true, name: true, roll_no: true, designation: true, department: true },
      },
    },
  });

  return successResponse(res, updated, `Leave request marked as ${status}`);
}

// ─── UNPAID LEAVE (LOP) FOR PAYROLL SUGGESTIONS ────────────────────────────────

async function getMonthlyLOP(req, res) {
  const { clientId } = req.params;
  const month = parseInt(req.query.month, 10); // 1 - 12
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  if (!month || month < 1 || month > 12) {
    return errorResponse(res, 'Valid month (1-12) is required', 400);
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const lopLeaves = await prisma.leaveRequest.findMany({
    where: {
      client_id: clientId,
      leave_type: 'UNPAID',
      status: 'APPROVED',
      start_date: { lte: endDate },
      end_date: { gte: startDate },
    },
    include: {
      employee: {
        select: { id: true, name: true, roll_no: true },
      },
    },
  });

  const lopByEmployee = {};
  lopLeaves.forEach((leave) => {
    const empId = leave.employee_id;
    if (!lopByEmployee[empId]) {
      lopByEmployee[empId] = {
        employee_id: empId,
        roll_no: leave.employee.roll_no,
        name: leave.employee.name,
        unpaid_days: 0,
      };
    }
    lopByEmployee[empId].unpaid_days += Number(leave.total_days);
  });

  return successResponse(res, Object.values(lopByEmployee));
}

// ─── DIGITAL ONBOARDING & DOCUMENTS ───────────────────────────────────────────

async function getDocuments(req, res) {
  const { clientId } = req.params;
  const { employee_id, verification_status } = req.query;

  const where = { client_id: clientId };
  if (employee_id) where.employee_id = employee_id;
  if (verification_status) where.verification_status = verification_status;

  const docs = await prisma.employeeDocument.findMany({
    where,
    include: {
      employee: {
        select: { id: true, name: true, roll_no: true, designation: true, department: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return successResponse(res, docs);
}

async function addDocument(req, res) {
  const { clientId } = req.params;
  const { employee_id, doc_type, doc_name, file_url, verification_status } = req.body;

  if (!employee_id || !doc_type || !doc_name) {
    return errorResponse(res, 'employee_id, doc_type, and doc_name are required', 400);
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employee_id, client_id: clientId },
  });
  if (!employee) {
    return errorResponse(res, 'Employee not found in this client entity', 404);
  }

  const doc = await prisma.employeeDocument.create({
    data: {
      client_id: clientId,
      employee_id,
      doc_type,
      doc_name,
      file_url: file_url || `/vault/docs/${clientId}/${employee_id}/${encodeURIComponent(doc_name)}.pdf`,
      verification_status: verification_status || 'PENDING',
    },
    include: {
      employee: {
        select: { id: true, name: true, roll_no: true, designation: true, department: true },
      },
    },
  });

  return successResponse(res, doc, 'Document record added successfully', 201);
}

async function verifyDocument(req, res) {
  const { clientId, id } = req.params;
  const { verification_status } = req.body;

  if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(verification_status)) {
    return errorResponse(res, 'verification_status must be VERIFIED, REJECTED, or PENDING', 400);
  }

  const doc = await prisma.employeeDocument.findFirst({
    where: { id, client_id: clientId },
  });
  if (!doc) {
    return errorResponse(res, 'Document record not found', 404);
  }

  const updated = await prisma.employeeDocument.update({
    where: { id },
    data: {
      verification_status,
      verified_by: req.user?.email || req.user?.id || 'Admin',
      verified_at: new Date(),
    },
    include: {
      employee: {
        select: { id: true, name: true, roll_no: true, designation: true, department: true },
      },
    },
  });

  return successResponse(res, updated, `Document marked as ${verification_status}`);
}

// ─── ASSET ASSIGNMENT ─────────────────────────────────────────────────────────

async function getAssets(req, res) {
  const { clientId } = req.params;
  const { employee_id, status } = req.query;

  const where = { client_id: clientId };
  if (employee_id) where.employee_id = employee_id;
  if (status) where.status = status;

  const assets = await prisma.assetAssignment.findMany({
    where,
    include: {
      employee: {
        select: { id: true, name: true, roll_no: true, designation: true, department: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return successResponse(res, assets);
}

async function assignAsset(req, res) {
  const { clientId } = req.params;
  const { employee_id, asset_name, asset_tag, serial_number } = req.body;

  if (!employee_id || !asset_name) {
    return errorResponse(res, 'employee_id and asset_name are required', 400);
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employee_id, client_id: clientId },
  });
  if (!employee) {
    return errorResponse(res, 'Employee not found in this client entity', 404);
  }

  const asset = await prisma.assetAssignment.create({
    data: {
      client_id: clientId,
      employee_id,
      asset_name,
      asset_tag: asset_tag || `NH-HW-${Date.now().toString().slice(-4)}`,
      serial_number: serial_number || 'N/A',
      status: 'ASSIGNED',
      assigned_date: new Date(),
    },
    include: {
      employee: {
        select: { id: true, name: true, roll_no: true, designation: true, department: true },
      },
    },
  });

  return successResponse(res, asset, 'Asset assigned successfully', 201);
}

async function updateAssetStatus(req, res) {
  const { clientId, id } = req.params;
  const { status } = req.body;

  if (!['ASSIGNED', 'RETURNED', 'DAMAGED'].includes(status)) {
    return errorResponse(res, 'Status must be ASSIGNED, RETURNED, or DAMAGED', 400);
  }

  const asset = await prisma.assetAssignment.findFirst({
    where: { id, client_id: clientId },
  });
  if (!asset) {
    return errorResponse(res, 'Asset record not found', 404);
  }

  const updated = await prisma.assetAssignment.update({
    where: { id },
    data: {
      status,
      returned_date: status === 'RETURNED' ? new Date() : asset.returned_date,
    },
    include: {
      employee: {
        select: { id: true, name: true, roll_no: true, designation: true, department: true },
      },
    },
  });

  return successResponse(res, updated, `Asset status updated to ${status}`);
}

// ─── ORG DIRECTORY & HIERARCHY ────────────────────────────────────────────────

async function getOrgHierarchy(req, res) {
  const { clientId } = req.params;

  const employees = await prisma.employee.findMany({
    where: { client_id: clientId, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      roll_no: true,
      designation: true,
      department: true,
      email: true,
      start_date: true,
      manager_id: true,
      manager: {
        select: { id: true, name: true, designation: true },
      },
      subordinates: {
        select: { id: true, name: true, designation: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Department breakdown
  const departmentStats = {};
  employees.forEach((emp) => {
    const dept = emp.department || 'General';
    departmentStats[dept] = (departmentStats[dept] || 0) + 1;
  });

  return successResponse(res, {
    employees,
    departments: Object.entries(departmentStats).map(([name, count]) => ({ name, count })),
    totalCount: employees.length,
  });
}

async function updateEmployeeManager(req, res) {
  const { clientId, employeeId } = req.params;
  const { manager_id } = req.body;

  if (manager_id === employeeId) {
    return errorResponse(res, 'An employee cannot be their own manager', 400);
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, client_id: clientId },
  });
  if (!employee) {
    return errorResponse(res, 'Employee not found', 404);
  }

  if (manager_id) {
    const manager = await prisma.employee.findFirst({
      where: { id: manager_id, client_id: clientId },
    });
    if (!manager) {
      return errorResponse(res, 'Manager not found in this client entity', 404);
    }
  }

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: { manager_id: manager_id || null },
    include: {
      manager: { select: { id: true, name: true, designation: true } },
    },
  });

  return successResponse(res, updated, 'Manager assignment updated');
}

// ─── POLICIES ─────────────────────────────────────────────────────────────────

async function getPolicies(req, res) {
  const { clientId } = req.params;

  let policies = await prisma.companyPolicy.findMany({
    where: { client_id: clientId },
    orderBy: { created_at: 'desc' },
  });

  // Seed default compliant policies if none exist for this client yet
  if (policies.length === 0) {
    const defaults = [
      {
        client_id: clientId,
        title: 'PoSH Compliance Policy 2026',
        category: 'COMPLIANCE',
        summary: 'Statutory anti-sexual harassment workplace policy and internal complaints committee mandate.',
      },
      {
        client_id: clientId,
        title: 'Annual & Sick Leave Guidelines',
        category: 'LEAVE',
        summary: 'Standard quota allocation: 12 Casual Leaves, 10 Sick Leaves, 15 Privilege Leaves with rollover caps.',
      },
      {
        client_id: clientId,
        title: 'Corporate Code of Conduct & NDA',
        category: 'GENERAL',
        summary: 'Guidelines on confidentiality, non-disclosure of proprietary source code, and client data governance.',
      },
      {
        client_id: clientId,
        title: 'Hybrid & Remote Work Agreement',
        category: 'REMOTE_WORK',
        summary: 'Hardware asset care, internet stipend guidelines, and core availability hours.',
      },
    ];

    await prisma.companyPolicy.createMany({ data: defaults });
    policies = await prisma.companyPolicy.findMany({
      where: { client_id: clientId },
      orderBy: { created_at: 'desc' },
    });
  }

  return successResponse(res, policies);
}

async function createPolicy(req, res) {
  const { clientId } = req.params;
  const { title, category, summary, file_url } = req.body;

  if (!title) {
    return errorResponse(res, 'Policy title is required', 400);
  }

  const policy = await prisma.companyPolicy.create({
    data: {
      client_id: clientId,
      title,
      category: category || 'GENERAL',
      summary: summary || '',
      file_url: file_url || null,
    },
  });

  return successResponse(res, policy, 'Policy published successfully', 201);
}

async function deletePolicy(req, res) {
  const { clientId, id } = req.params;

  await prisma.companyPolicy.deleteMany({
    where: { id, client_id: clientId },
  });

  return successResponse(res, null, 'Policy removed successfully');
}

// ─── LETTERHEAD STUDIO ────────────────────────────────────────────────────────

async function getIssuedLetters(req, res) {
  const { clientId } = req.params;
  const { employee_id, letter_type } = req.query;

  const where = { client_id: clientId };
  if (employee_id) where.employee_id = employee_id;
  if (letter_type) where.letter_type = letter_type;

  const letters = await prisma.IssuedLetter.findMany({
    where,
    include: {
      employee: {
        select: { id: true, name: true, roll_no: true, designation: true, department: true, start_date: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return successResponse(res, letters);
}

async function issueLetter(req, res) {
  const { clientId } = req.params;
  const { employee_id, letter_type, signatory_name, signatory_title } = req.body;

  if (!employee_id || !letter_type) {
    return errorResponse(res, 'employee_id and letter_type are required', 400);
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employee_id, client_id: clientId },
    include: { client: true },
  });
  if (!employee) {
    return errorResponse(res, 'Employee not found in this client entity', 404);
  }

  const typeCode = letter_type.substring(0, 4).toUpperCase();
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const reference_no = req.body.reference_no || `NH/${year}/${typeCode}/${randomSuffix}`;

  const letter = await prisma.IssuedLetter.create({
    data: {
      client_id: clientId,
      employee_id,
      letter_type,
      reference_no,
      signatory_name: signatory_name || 'Managing Director',
      signatory_title: signatory_title || 'NH Associates / Authorized Signatory',
      pdf_url: `/vault/letters/${clientId}/${reference_no.replace(/\//g, '_')}.pdf`,
    },
    include: {
      employee: {
        select: { id: true, name: true, roll_no: true, designation: true, department: true, start_date: true },
      },
    },
  });

  return successResponse(res, letter, 'Letter issued and registered successfully', 201);
}

module.exports = {
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
};
