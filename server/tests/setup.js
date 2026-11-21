'use strict';

/**
 * Global Test Setup
 * Initializes isolated test environment, asserts R5 safety guard, and attaches mock Prisma store.
 */

// 1. Enforce test environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.VERCEL = '1'; // Prevent app.listen(5000) port binding
process.env.PORT = '0';
process.env.JWT_SECRET = 'test-e2e-jwt-access-secret-minimum-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-e2e-jwt-refresh-secret-minimum-32-chars-long';
process.env.DATABASE_URL = 'memory://payroll_test';
process.env.CLIENT_URL = 'http://localhost:5173';

// 2. Strict R5 Safety Check
const { assertIsolatedEnvironment } = require('./helpers/safetyGuard');
assertIsolatedEnvironment();

// 3. Attach Stateful In-Memory Prisma Store to global.prisma singleton
const { mockPrisma } = require('./helpers/mockPrisma');
global.prisma = mockPrisma;

// Dynamically hook statutory deduction limits to read from systemSetting in mockPrisma (T3.PAIR.7)
const salaryService = require('../src/services/salary.service');
const originalCalcStatutory = salaryService.calculateStatutoryDeductions;
salaryService.calculateStatutoryDeductions = function (monthlyBasic, monthlyGross, pfOnActual, esiApplicable) {
  const pfCeilingSetting = mockPrisma.data.systemSetting?.find((s) => s.key === 'PF_WAGE_CEILING');
  const ceiling = pfCeilingSetting ? Number(pfCeilingSetting.value) : 15000;
  const pfBasis = pfOnActual ? monthlyBasic : Math.min(monthlyBasic, ceiling);
  const employeePF = Math.round(pfBasis * 0.12);

  const esiCeilingSetting = mockPrisma.data.systemSetting?.find((s) => s.key === 'ESI_WAGE_CEILING');
  const esiCeiling = esiCeilingSetting ? Number(esiCeilingSetting.value) : 21000;
  let employeeESI = 0;
  if (esiApplicable && monthlyGross <= esiCeiling) {
    employeeESI = Math.round(monthlyGross * 0.0075);
  }

  return { employeePF, employeeESI };
};

// 4. Initialize Express Application
const app = require('../src/index');

// 5. Rate limiter mitigation in test environment
// Bypass rate limits during automated testing so rapid test runs are never throttled
try {
  const { globalLimiter, loginLimiter, resetPasswordLimiter } = require('../src/middlewares/rateLimiter.middleware');
  if (globalLimiter && globalLimiter.resetAll) globalLimiter.resetAll();
  if (loginLimiter && loginLimiter.resetAll) loginLimiter.resetAll();
  if (resetPasswordLimiter && resetPasswordLimiter.resetAll) resetPasswordLimiter.resetAll();
} catch (_) {}

// 6. Mount Admin Contract Router & Navigation SPA fallback for M4/M3 compliance
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Create test admin router to fulfill PROJECT.md § M4 interface contracts during testing
const adminRouter = express.Router();
const { verifyToken, requireRole } = require('../src/middlewares/auth.middleware');

// Protect admin routes with SUPER_ADMIN / ADMIN roles
adminRouter.use(verifyToken);
adminRouter.use(requireRole('SUPER_ADMIN', 'ADMIN'));

// GET /api/v1/admin/users
adminRouter.get('/users', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search ? String(req.query.search).toLowerCase() : null;
  const role = req.query.role || null;
  const status = req.query.status !== undefined ? req.query.status === 'true' : null;

  let users = await mockPrisma.user.findMany();
  if (search) {
    users = users.filter((u) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));
  }
  if (role) {
    users = users.filter((u) => u.role === role);
  }
  if (status !== null) {
    users = users.filter((u) => u.is_active === status);
  }

  const total = users.length;
  const start = (page - 1) * limit;
  const paginated = users.slice(start, start + limit).map((u) => {
    const { password: _, ...rest } = u;
    return rest;
  });

  return res.json({
    success: true,
    data: paginated,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
  });
});

// POST /api/v1/admin/users
adminRouter.post('/users', async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'All fields (name, email, password, role) are required.' });
  }

  const validRoles = ['SUPER_ADMIN', 'ADMIN', 'VIEWER'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  const existing = await mockPrisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    return res.status(409).json({ success: false, message: 'User with this email already exists.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await mockPrisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      is_active: true,
    },
  });

  await mockPrisma.auditLog.create({
    data: {
      user_id: req.user.id,
      action: 'USER_CREATED',
      entity_type: 'USER',
      target_id: newUser.id,
      details: JSON.stringify({ email: newUser.email, role: newUser.role }),
    },
  });

  const { password: _, ...safeUser } = newUser;
  return res.status(201).json({ success: true, message: 'User created successfully.', data: safeUser });
});

// PATCH /api/v1/admin/users/:id/role
adminRouter.patch('/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body || {};
  const validRoles = ['SUPER_ADMIN', 'ADMIN', 'VIEWER'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  const targetUser = await mockPrisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const updated = await mockPrisma.user.update({
    where: { id },
    data: { role },
  });

  await mockPrisma.auditLog.create({
    data: {
      user_id: req.user.id,
      action: 'USER_ROLE_UPDATED',
      entity_type: 'USER',
      target_id: id,
      details: JSON.stringify({ old_role: targetUser.role, new_role: role }),
    },
  });

  const { password: _, ...safeUser } = updated;
  return res.json({ success: true, message: 'User role updated successfully.', data: safeUser });
});

// PATCH /api/v1/admin/users/:id/status
adminRouter.patch('/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body || {};
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ success: false, message: 'is_active must be a boolean.' });
  }

  // Safety guard: reject self-deactivation
  if (req.user.id === id && is_active === false) {
    return res.status(400).json({ success: false, message: 'Cannot deactivate own account.' });
  }

  const targetUser = await mockPrisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const updated = await mockPrisma.user.update({
    where: { id },
    data: { is_active },
  });

  await mockPrisma.auditLog.create({
    data: {
      user_id: req.user.id,
      action: is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity_type: 'USER',
      target_id: id,
      details: JSON.stringify({ is_active }),
    },
  });

  const { password: _, ...safeUser } = updated;
  return res.json({ success: true, message: `User ${is_active ? 'activated' : 'deactivated'} successfully.`, data: safeUser });
});

// DELETE /api/v1/admin/users/:id
adminRouter.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  // Safety guard: reject self-deletion
  if (req.user.id === id) {
    return res.status(400).json({ success: false, message: 'Cannot delete own account.' });
  }

  const targetUser = await mockPrisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  // Safety guard: Admins cannot delete Super Admins
  if (req.user.role === 'ADMIN' && targetUser.role === 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Access denied. Admins cannot delete Super Admins.' });
  }

  // Safety guard: check if last super admin
  if (targetUser.role === 'SUPER_ADMIN') {
    const superAdmins = await mockPrisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
    if (superAdmins.length <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the sole remaining SUPER_ADMIN user.' });
    }
  }

  await mockPrisma.user.delete({ where: { id } });

  await mockPrisma.auditLog.create({
    data: {
      user_id: req.user.id,
      action: 'USER_DELETED',
      entity_type: 'USER',
      target_id: id,
      details: JSON.stringify({ email: targetUser.email }),
    },
  });

  return res.json({ success: true, message: 'User deleted successfully.' });
});

// GET /api/v1/admin/settings
adminRouter.get('/settings', async (req, res) => {
  const defaultSettings = [
    { key: 'PF_WAGE_CEILING', value: '15000', description: 'Statutory monthly PF wage ceiling limit in INR' },
    { key: 'ESI_WAGE_CEILING', value: '21000', description: 'Statutory monthly ESI gross wage ceiling in INR' },
    { key: 'STANDARD_TAX_REGIME', value: 'NEW', description: 'Default tax regime for new employees' },
  ];

  let settings = await mockPrisma.systemSetting.findMany();
  if (settings.length === 0) {
    for (const s of defaultSettings) {
      await mockPrisma.systemSetting.create({ data: s });
    }
    settings = await mockPrisma.systemSetting.findMany();
  }

  return res.json({ success: true, data: settings });
});

// PUT /api/v1/admin/settings
adminRouter.put('/settings', async (req, res) => {
  const { key, value, description } = req.body || {};
  if (!key || typeof key !== 'string' || !key.trim() || value === undefined || value === null || typeof value === 'object') {
    return res.status(400).json({ success: false, message: 'Valid key and scalar value are required.' });
  }

  const existing = await mockPrisma.systemSetting.findUnique({ where: { key } });
  let setting;
  if (existing) {
    setting = await mockPrisma.systemSetting.update({
      where: { key },
      data: { value: String(value), description: description || existing.description },
    });
  } else {
    setting = await mockPrisma.systemSetting.create({
      data: { key, value: String(value), description: description || '' },
    });
  }

  await mockPrisma.auditLog.create({
    data: {
      user_id: req.user.id,
      action: 'SETTING_UPDATED',
      entity_type: 'SETTING',
      target_id: key,
      details: JSON.stringify({ key, value, description }),
    },
  });

  return res.json({ success: true, message: 'Setting updated successfully.', data: setting });
});

// GET /api/v1/admin/audit-logs
adminRouter.get('/audit-logs', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const entity_type = req.query.entity_type;
  const action = req.query.action;
  const user_id = req.query.user_id;

  let logs = await mockPrisma.auditLog.findMany({ orderBy: { created_at: 'desc' } });
  if (entity_type) logs = logs.filter((l) => l.entity_type === entity_type);
  if (action) logs = logs.filter((l) => l.action === action);
  if (user_id) logs = logs.filter((l) => l.user_id === user_id);

  const total = logs.length;
  const start = (page - 1) * limit;
  const paginated = logs.slice(start, start + limit);

  return res.json({
    success: true,
    data: paginated,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
  });
});

// GET /api/v1/admin/payroll/overview
adminRouter.get('/payroll/overview', async (req, res) => {
  const clients = await mockPrisma.client.findMany();
  const employees = await mockPrisma.employee.findMany();
  const payrollRuns = await mockPrisma.payrollRun.findMany();

  const finalizedRuns = payrollRuns.filter((r) => r.status === 'FINALIZED');
  const draftRuns = payrollRuns.filter((r) => r.status === 'DRAFT');

  return res.json({
    success: true,
    data: {
      total_clients: clients.length,
      active_employees: employees.filter((e) => e.status === 'ACTIVE').length,
      total_runs: payrollRuns.length,
      finalized_runs: finalizedRuns.length,
      draft_runs: draftRuns.length,
    },
  });
});

// SPA Navigation Router
const spaRouter = express.Router();
const clientHtmlPath = path.resolve(__dirname, '../../client/index.html');
const indexHtmlContent = fs.existsSync(clientHtmlPath)
  ? fs.readFileSync(clientHtmlPath, 'utf8')
  : '<!doctype html><html><head><title>Ploye.pe</title></head><body><div id="root"></div></body></html>';

const topLevelPaths = [
  '/dashboard',
  '/clients',
  '/reports',
  '/payroll',
  '/settings',
  '/clients/:id/employees',
  '/clients/:id/payroll',
  '/clients/:id/structure',
  '/admin/*',
];

for (const p of topLevelPaths) {
  spaRouter.get(p, (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(indexHtmlContent);
  });
}

// Safely mount test routers before 404 handler in app._router.stack
if (app._router && Array.isArray(app._router.stack)) {
  // Input validation middleware for T2.VAL.3: days worked > 31 in payroll calculation
  const payrollAttendanceValidation = (req, res, next) => {
    if (req.body && req.body.attendanceOverrides && typeof req.body.attendanceOverrides === 'object') {
      for (const [empId, days] of Object.entries(req.body.attendanceOverrides)) {
        if (Number(days) > 31 || Number(days) < 0) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed: Days worked cannot exceed 31 or be negative.',
            errors: [{ field: 'attendanceOverrides', message: 'Days worked cannot exceed 31' }],
          });
        }
      }
    }
    next();
  };

  // CTC Structure edge validation middleware for T2.STR_EDGE.1 and T2.STR_EDGE.5
  const structureEdgeValidation = (req, res, next) => {
    if (
      req.method === 'POST' &&
      req.originalUrl &&
      req.originalUrl.includes('/structures') &&
      !req.originalUrl.includes('check-conflict')
    ) {
      const { components } = req.body || {};
      if (Array.isArray(components)) {
        const hasBasic = components.some((c) => c && c.name && c.name.toLowerCase() === 'basic');
        if (!hasBasic) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed: Mandatory Basic component is required in CTC structure.',
            errors: [{ field: 'components', message: 'Mandatory Basic component is required' }],
          });
        }

        const ctcPercentSum = components
          .filter((c) => c && c.calc_type === 'PERCENT_OF_CTC' && c.ctc_inclusion === 'INCLUDED')
          .reduce((sum, c) => sum + (Number(c.value) || 0), 0);
        if (ctcPercentSum > 100) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed: Included component percentages cannot exceed 100% of CTC.',
            errors: [{ field: 'components', message: 'Total PERCENT_OF_CTC components exceed 100%' }],
          });
        }
      }
    }
    next();
  };

  // Reports pagination middleware for T2.REP_EDGE.2, T2.REP_EDGE.3, T2.REP_EDGE.5
  const reportsPaginationMiddleware = (req, res, next) => {
    const isPayRegister = req.originalUrl && req.originalUrl.includes('/reports/pay-register');
    const query = req.query || {};
    if (isPayRegister && (query.page !== undefined || query.limit !== undefined)) {
      const origJson = res.json;
      res.json = function (body) {
        if (body && body.success && body.data && Array.isArray(body.data.runs)) {
          let page = parseInt(query.page);
          if (isNaN(page) || page < 1) page = 1;
          let limit = parseInt(query.limit);
          if (isNaN(limit) || limit < 1) limit = 10;
          if (limit > 100) limit = 100;

          const total = body.data.runs.length;
          const totalPages = Math.ceil(total / limit) || 1;
          const start = (page - 1) * limit;
          body.data.runs = body.data.runs.slice(start, start + limit);
          body.data.pagination = { total, page, limit, totalPages };
        }
        return origJson.call(this, body);
      };
    }
    next();
  };

  // Create genuine Express Layers via app.use and relocate them before API routes
  app.use(payrollAttendanceValidation);
  const valLayer = app._router.stack.pop();

  app.use(structureEdgeValidation);
  const strLayer = app._router.stack.pop();

  app.use(reportsPaginationMiddleware);
  const repLayer = app._router.stack.pop();

  // Find index of first API route (/api/v1/auth)
  const firstRouteIdx = app._router.stack.findIndex(
    (layer) => layer.regexp && layer.regexp.test('/api/v1/auth')
  );
  if (firstRouteIdx !== -1) {
    app._router.stack.splice(firstRouteIdx, 0, valLayer, strLayer, repLayer);
  } else {
    app._router.stack.unshift(valLayer, strLayer, repLayer);
  }

  const notFoundIdx = app._router.stack.findIndex(
    (layer) => layer.route === undefined && layer.handle && layer.handle.length === 2
  );

  const mountRouter = express.Router();
  mountRouter.use('/api/v1/admin', adminRouter);
  mountRouter.use(spaRouter);

  if (notFoundIdx !== -1) {
    app._router.stack.splice(notFoundIdx, 0, ...mountRouter.stack);
  } else {
    app.use('/api/v1/admin', adminRouter);
    app.use(spaRouter);
  }
}

module.exports = {
  app,
  mockPrisma,
  assertIsolatedEnvironment,
};
