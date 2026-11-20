const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { successResponse, errorResponse } = require('../utils/response.utils');

/**
 * GET /api/v1/admin/stats
 * High-level system statistics and overview metrics
 */
async function getStats(req, res) {
  const [totalUsers, totalClients, totalEmployees, totalPayrollRuns, finalizedRuns] = await Promise.all([
    prisma.user.count(),
    prisma.client.count({ where: { is_active: true } }),
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.payrollRun.count(),
    prisma.payrollRun.count({ where: { status: 'FINALIZED' } }),
  ]);

  // Sum of net pay across finalized runs
  const aggregateNet = await prisma.payrollEntry.aggregate({
    _sum: { net_pay: true, gross_salary: true },
    where: { payroll_run: { status: 'FINALIZED' } },
  });

  return successResponse(res, {
    totalUsers,
    totalClients,
    totalEmployees,
    totalPayrollRuns,
    finalizedRuns,
    draftRuns: totalPayrollRuns - finalizedRuns,
    totalNetDisbursed: aggregateNet._sum.net_pay || 0,
    totalGrossProcessed: aggregateNet._sum.gross_salary || 0,
  });
}

/**
 * GET /api/v1/admin/users
 * List all users with activity counts
 */
async function getUsers(req, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      _count: {
        select: {
          payroll_runs: true,
          salary_changes: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return successResponse(res, users);
}

/**
 * POST /api/v1/admin/users
 * Create a new user (Super Admin or Admin only)
 */
async function createUser(req, res) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return errorResponse(res, 'Name, email, and password are required.', 400);
  }

  const validRoles = ['SUPER_ADMIN', 'ADMIN', 'VIEWER'];
  const userRole = validRoles.includes(role) ? role : 'ADMIN';

  // Only SUPER_ADMIN can create another SUPER_ADMIN
  if (userRole === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return errorResponse(res, 'Only Super Admins can create Super Admin accounts.', 403);
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return errorResponse(res, 'A user with that email already exists.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userRole,
      is_active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_active: true,
      created_at: true,
    },
  });

  return successResponse(res, newUser, 'User created successfully.', 201);
}

/**
 * PATCH /api/v1/admin/users/:id
 * Update user status (active/inactive) or role
 */
async function updateUser(req, res) {
  const { id } = req.params;
  const { is_active, role, name } = req.body;

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return errorResponse(res, 'User not found.', 404);
  }

  // Prevent disabling self
  if (id === req.user.id && is_active === false) {
    return errorResponse(res, 'You cannot deactivate your own account.', 400);
  }

  // Prevent non-super admin from modifying super admin
  if (targetUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return errorResponse(res, 'Only Super Admins can modify Super Admin accounts.', 403);
  }

  const updateData = {};
  if (typeof is_active === 'boolean') updateData.is_active = is_active;
  if (name) updateData.name = name;
  if (role) {
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return errorResponse(res, 'Invalid role.', 400);
    }
    if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return errorResponse(res, 'Only Super Admins can grant Super Admin role.', 403);
    }
    updateData.role = role;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_active: true,
      updated_at: true,
    },
  });

  return successResponse(res, updated, 'User updated successfully.');
}

/**
 * GET /api/v1/admin/clients-summary
 * Summary of all clients with active employee count, structure version, latest payroll run
 */
async function getClientsSummary(req, res) {
  const clients = await prisma.client.findMany({
    include: {
      _count: {
        select: {
          employees: true,
          payroll_runs: true,
          structures: true,
        },
      },
      payroll_runs: {
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 1,
        select: {
          id: true,
          month: true,
          year: true,
          status: true,
          finalized_at: true,
        },
      },
      structures: {
        where: { status: 'ACTIVE' },
        take: 1,
        select: { version_name: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const formatted = clients.map((c) => ({
    id: c.id,
    name: c.name,
    registration_no: c.registration_no,
    pan: c.pan,
    is_active: c.is_active,
    employee_count: c._count.employees,
    payroll_runs_count: c._count.payroll_runs,
    structures_count: c._count.structures,
    active_structure: c.structures[0]?.version_name || 'None',
    latest_run: c.payroll_runs[0] || null,
  }));

  return successResponse(res, formatted);
}

/**
 * GET /api/v1/admin/audit-logs
 * Recent system events (payroll runs and salary revisions)
 */
async function getAuditLogs(req, res) {
  const [recentPayroll, recentSalaries] = await Promise.all([
    prisma.payrollRun.findMany({
      take: 15,
      orderBy: { created_at: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        run_by_user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.employeeSalaryHistory.findMany({
      take: 15,
      orderBy: { created_at: 'desc' },
      include: {
        employee: { select: { id: true, name: true, roll_no: true } },
        created_by_user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const logs = [];

  recentPayroll.forEach((p) => {
    logs.push({
      id: `pr-${p.id}`,
      type: 'PAYROLL_RUN',
      title: `Payroll ${p.status === 'FINALIZED' ? 'Finalized' : 'Run Created'} — ${p.client.name}`,
      description: `Month: ${p.month}/${p.year} (Status: ${p.status})`,
      timestamp: p.finalized_at || p.created_at,
      user: p.run_by_user?.name || 'System',
      userEmail: p.run_by_user?.email,
    });
  });

  recentSalaries.forEach((s) => {
    logs.push({
      id: `sal-${s.id}`,
      type: 'SALARY_CHANGE',
      title: `CTC Revision / Change — ${s.employee.name} (${s.employee.roll_no})`,
      description: `Reason: ${s.change_reason} | New CTC: ₹${Number(s.annual_ctc).toLocaleString('en-IN')}`,
      timestamp: s.created_at,
      user: s.created_by_user?.name || 'System',
      userEmail: s.created_by_user?.email,
    });
  });

  // Sort descending by timestamp
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return successResponse(res, logs.slice(0, 25));
}

module.exports = {
  getStats,
  getUsers,
  createUser,
  updateUser,
  getClientsSummary,
  getAuditLogs,
};
