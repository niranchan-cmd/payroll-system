'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { signAccessToken, signRefreshToken } = require('../../src/utils/jwt.utils');
const { mockPrisma } = require('./mockPrisma');

const DEFAULT_PASSWORD = 'Password@123';

/**
 * Generate a signed JWT access token for testing
 */
function createToken(role = 'SUPER_ADMIN', overrides = {}) {
  const userId = overrides.id || crypto.randomUUID();
  const email = overrides.email || `${role.toLowerCase()}@payroll.test`;
  const name = overrides.name || `Test ${role}`;

  return signAccessToken({
    id: userId,
    email,
    role,
    name,
    ...overrides,
  });
}

/**
 * Generate a signed JWT refresh token for testing
 */
function createRefreshToken(overrides = {}) {
  const userId = overrides.id || crypto.randomUUID();
  const email = overrides.email || `user@payroll.test`;

  return signRefreshToken({
    id: userId,
    email,
    ...overrides,
  });
}

/**
 * Seed a user in the in-memory mock database
 */
async function seedUser(role = 'SUPER_ADMIN', overrides = {}) {
  const rawPassword = overrides.password || DEFAULT_PASSWORD;
  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  const userId = overrides.id || crypto.randomUUID();
  const email = (overrides.email || `${role.toLowerCase()}-${Date.now()}@payroll.test`).toLowerCase().trim();
  const name = overrides.name || `Test ${role} User`;

  const { password: _pw, ...cleanOverrides } = overrides;

  const user = await mockPrisma.user.create({
    data: {
      id: userId,
      email,
      name,
      password: hashedPassword,
      role,
      is_active: cleanOverrides.is_active !== undefined ? cleanOverrides.is_active : true,
      ...cleanOverrides,
    },
  });

  const token = createToken(role, { id: user.id, email: user.email, name: user.name });

  return { user, token, rawPassword };
}

/**
 * Seed a client organization
 */
async function seedClient(overrides = {}) {
  const clientId = overrides.id || crypto.randomUUID();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  const client = await mockPrisma.client.create({
    data: {
      id: clientId,
      name: overrides.name || `Client Org ${randomSuffix}`,
      registration_no: overrides.registration_no || `REG-${randomSuffix}`,
      pan: overrides.pan || `ABCDE${randomSuffix}F`,
      address: overrides.address || '100 Innovation Way, Tech Park',
      state: overrides.state || 'Karnataka',
      proration_rule: overrides.proration_rule || 'CALENDAR',
      pf_on_actual: overrides.pf_on_actual !== undefined ? overrides.pf_on_actual : false,
      esi_auto_apply: overrides.esi_auto_apply !== undefined ? overrides.esi_auto_apply : true,
      payroll_cycle: overrides.payroll_cycle || 'MONTHLY',
      payroll_cutoff: overrides.payroll_cutoff !== undefined ? overrides.payroll_cutoff : 25,
      is_active: overrides.is_active !== undefined ? overrides.is_active : true,
      ...overrides,
    },
  });

  return client;
}

/**
 * Seed a CTC structure with standard components
 */
async function seedCTCStructure(clientId, overrides = {}) {
  const structureId = overrides.id || crypto.randomUUID();
  const versionName = overrides.version_name || 'V1';
  const effectiveFrom = overrides.effective_from || new Date('2026-01-01');

  const components = overrides.components || [
    {
      name: 'Basic',
      calc_type: 'PERCENT_OF_CTC',
      value: 40.0,
      basis: 'ANNUAL_CTC',
      ctc_inclusion: 'INCLUDED',
      is_taxable: true,
      display_order: 1,
    },
    {
      name: 'HRA',
      calc_type: 'PERCENT_OF_BASIC',
      value: 50.0,
      basis: 'MONTHLY_BASIC',
      ctc_inclusion: 'INCLUDED',
      is_taxable: true,
      display_order: 2,
    },
    {
      name: 'Special Allowance',
      calc_type: 'REMAINDER',
      value: null,
      basis: 'N/A',
      ctc_inclusion: 'INCLUDED',
      is_taxable: true,
      display_order: 3,
    },
    {
      name: 'Employer PF',
      calc_type: 'PERCENT_OF_BASIC',
      value: 12.0,
      basis: 'MONTHLY_BASIC',
      ctc_inclusion: 'INCLUDED',
      is_taxable: false,
      display_order: 4,
    },
  ];

  const structure = await mockPrisma.cTCStructure.create({
    data: {
      id: structureId,
      client_id: clientId,
      version_name: versionName,
      effective_from: effectiveFrom,
      effective_to: overrides.effective_to || null,
      status: overrides.status || 'ACTIVE',
      rounding_rule: overrides.rounding_rule || 'NEAREST_RUPEE',
      remainder_comp: overrides.remainder_comp || 'Special Allowance',
      components: {
        create: components,
      },
    },
    include: {
      components: { orderBy: { display_order: 'asc' } },
    },
  });

  return structure;
}

/**
 * Seed an employee with salary history
 */
async function seedEmployee(clientId, structureVersionId, overrides = {}) {
  const empId = overrides.id || crypto.randomUUID();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const rollNo = overrides.roll_no || `EMP-${randomNum}`;

  const employee = await mockPrisma.employee.create({
    data: {
      id: empId,
      client_id: clientId,
      roll_no: rollNo,
      name: overrides.name || `Employee ${randomNum}`,
      designation: overrides.designation || 'Software Engineer',
      department: overrides.department || 'Engineering',
      email: overrides.email || `emp${randomNum}@payroll.test`,
      start_date: overrides.start_date || new Date('2026-01-01'),
      tax_regime: overrides.tax_regime || 'NEW',
      status: overrides.status || 'ACTIVE',
    },
  });

  const salaryHistory = await mockPrisma.employeeSalaryHistory.create({
    data: {
      employee_id: empId,
      annual_ctc: overrides.annual_ctc !== undefined ? overrides.annual_ctc : 600000,
      structure_version_id: structureVersionId,
      effective_from: overrides.salary_effective_from || overrides.start_date || new Date('2026-01-01'),
      effective_to: overrides.salary_effective_to || null,
      change_reason: overrides.change_reason || 'INITIAL_JOINING',
      notes: overrides.notes || 'Initial appointment',
      created_by: overrides.created_by || crypto.randomUUID(),
    },
  });

  return { employee, salaryHistory };
}

/**
 * Reset all collections in mockPrisma
 */
function resetDatabase() {
  mockPrisma.reset();
}

module.exports = {
  createToken,
  createRefreshToken,
  seedUser,
  seedClient,
  seedCTCStructure,
  seedEmployee,
  resetDatabase,
  DEFAULT_PASSWORD,
};
