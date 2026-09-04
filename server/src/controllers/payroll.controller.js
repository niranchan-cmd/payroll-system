const prisma = require('../utils/prisma');
const { successResponse, errorResponse } = require('../utils/response.utils');
const { resolveEmployeeCTC, resolveStructureForDate } = require('../services/salary.service');
const { calculateEmployeePayroll } = require('../services/payroll.service');

// ── HELPERS ────────────────────────────────────────────────────────────────

function monthName(month) {
  return new Date(2000, month - 1, 1).toLocaleString('en-IN', { month: 'long' });
}

/**
 * Core computation shared by preview and run.
 */
async function computePayroll(clientId, year, month, customDaysWorkedMap = {}, customOtHoursMap = {}) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw Object.assign(new Error('Client not found.'), { status: 404 });

  // Determine last day of the target month for structure/CTC resolution
  const lastDayOfMonth = new Date(year, month, 0); // e.g. 2026-08-31

  // Fetch all active employees with their salary history for the period
  const employees = await prisma.employee.findMany({
    where: { client_id: clientId, status: 'ACTIVE' },
    include: {
      salary_histories: {
        include: {
          structure_version: {
            include: { components: { orderBy: { display_order: 'asc' } } },
          },
        },
        orderBy: { effective_from: 'desc' },
      },
    },
  });

  if (employees.length === 0) {
    throw Object.assign(new Error('No active employees found.'), { status: 400 });
  }

  const entries = [];
  const errors = [];

  for (const emp of employees) {
    try {
      // Find the salary history effective on the last day of the payroll month
      const history = emp.salary_histories.find((h) => {
        const from = new Date(h.effective_from);
        const to = h.effective_to ? new Date(h.effective_to) : null;
        return from <= lastDayOfMonth && (!to || to >= lastDayOfMonth);
      });

      if (!history) {
        // Check if employee joined after this month
        const earliestHistory = emp.salary_histories[emp.salary_histories.length - 1];
        if (earliestHistory && new Date(earliestHistory.effective_from) > lastDayOfMonth) {
          // Employee didn't exist in this period — skip silently
          continue;
        }
        errors.push({ employee: emp.name, roll_no: emp.roll_no, reason: 'No salary history for this period' });
        continue;
      }

      const structure = history.structure_version;
      if (!structure) {
        errors.push({ employee: emp.name, roll_no: emp.roll_no, reason: 'No CTC structure linked to salary history' });
        continue;
      }

      const customDays = customDaysWorkedMap[emp.id] ?? customDaysWorkedMap[emp.roll_no];
      const customOt = customOtHoursMap[emp.id] ?? customOtHoursMap[emp.roll_no];
      const entry = calculateEmployeePayroll(emp, history, structure, client, year, month, customDays, customOt);
      entries.push({ ...entry, history_id: history.id });
    } catch (err) {
      errors.push({ employee: emp.name, roll_no: emp.roll_no, reason: err.message });
    }
  }

  return { entries, errors, client, month, year };
}

// ── LIST PAYROLL RUNS ──────────────────────────────────────────────────────

async function listPayrollRuns(req, res) {
  const { clientId } = req.params;

  const runs = await prisma.payrollRun.findMany({
    where: { client_id: clientId },
    include: {
      run_by_user: { select: { name: true } },
      _count: { select: { entries: true } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  return successResponse(res, runs);
}

// ── PREVIEW PAYROLL ────────────────────────────────────────────────────────

async function previewPayroll(req, res) {
  const { clientId } = req.params;
  const { month, year, attendanceOverrides = {}, otOverrides = {} } = req.body;

  if (!month || !year) {
    return errorResponse(res, 'month and year are required.', 400);
  }
  const m = parseInt(month);
  const y = parseInt(year);
  if (m < 1 || m > 12) return errorResponse(res, 'month must be 1–12.', 400);
  if (y < 2020 || y > 2100) return errorResponse(res, 'year out of range.', 400);

  // Check if already finalized or exists as DRAFT
  const existing = await prisma.payrollRun.findUnique({
    where: { client_id_month_year: { client_id: clientId, month: m, year: y } },
    include: { entries: true },
  });
  if (existing?.status === 'FINALIZED') {
    return errorResponse(res, `Payroll for ${monthName(m)} ${y} is already finalized.`, 409);
  }

  // If a DRAFT exists and no specific overrides passed, pre-populate with previously saved draft days & OT
  const draftDaysMap = {};
  const draftOtMap = {};
  if (existing?.status === 'DRAFT' && existing.entries) {
    existing.entries.forEach((e) => {
      draftDaysMap[e.employee_id] = Number(e.days_worked);
      try {
        const comps = JSON.parse(e.components_json);
        if (comps.ot_hours !== undefined) {
          draftOtMap[e.employee_id] = Number(comps.ot_hours);
        }
      } catch (err) {}
    });
  }

  const effectiveAttendance = {
    ...draftDaysMap,
    ...attendanceOverrides,
  };

  const effectiveOt = {
    ...draftOtMap,
    ...otOverrides,
  };

  const { entries, errors, client } = await computePayroll(clientId, y, m, effectiveAttendance, effectiveOt);

  const preview = entries.map((e) => ({
    employee_id: e.employee_id,
    name: e._summary.name,
    roll_no: e._summary.roll_no,
    designation: e._summary.designation,
    annual_ctc: e._summary.annual_ctc,
    structure_version: e._summary.structure_version,
    is_prorated: e.is_prorated,
    days_worked: e.days_worked,
    total_days: e.total_days_in_month,
    ot_hours: e.ot_hours || 0,
    ot_amount: e.ot_amount || 0,
    gross_salary: e.gross_salary,
    basic_salary: e.basic_salary,
    employee_pf: e.employee_pf,
    employee_esi: e.employee_esi,
    total_deductions: e.total_deductions,
    net_pay: e.net_pay,
    employer_pf: e.employer_pf,
    employer_esi: e.employer_esi,
    components: e._summary.components,
  }));

  const totals = {
    total_gross: preview.reduce((s, e) => s + Number(e.gross_salary), 0),
    total_pf: preview.reduce((s, e) => s + Number(e.employee_pf), 0),
    total_esi: preview.reduce((s, e) => s + Number(e.employee_esi), 0),
    total_net_pay: preview.reduce((s, e) => s + Number(e.net_pay), 0),
    total_employer_pf: preview.reduce((s, e) => s + Number(e.employer_pf), 0),
    total_employer_esi: preview.reduce((s, e) => s + Number(e.employer_esi), 0),
    total_ot_hours: preview.reduce((s, e) => s + Number(e.ot_hours || 0), 0),
    total_ot_amount: preview.reduce((s, e) => s + Number(e.ot_amount || 0), 0),
    employee_count: preview.length,
    prorated_count: preview.filter((e) => e.is_prorated).length,
  };

  return successResponse(res, {
    month: m,
    year: y,
    month_name: monthName(m),
    already_draft: existing?.status === 'DRAFT',
    draft_run_id: existing?.id || null,
    draft_notes: existing?.notes || '',
    is_intravision: client?.name?.toLowerCase().includes('intravision'),
    preview,
    entries: preview,
    totals,
    errors,
    total_employees: preview.length,
  });
}

// ── RUN PAYROLL (Save as DRAFT) ────────────────────────────────────────────

async function runPayroll(req, res) {
  const { clientId } = req.params;
  const { month, year, notes, excludedEmployeeIds = [], attendanceOverrides = {}, otOverrides = {} } = req.body;

  if (!month || !year) return errorResponse(res, 'month and year are required.', 400);
  const m = parseInt(month);
  const y = parseInt(year);

  // Check if already finalized
  const existing = await prisma.payrollRun.findUnique({
    where: { client_id_month_year: { client_id: clientId, month: m, year: y } },
  });
  if (existing?.status === 'FINALIZED') {
    return errorResponse(res, `Payroll for ${monthName(m)} ${y} is already finalized. Cannot re-run.`, 409);
  }

  let { entries, errors } = await computePayroll(clientId, y, m, attendanceOverrides, otOverrides);

  // Filter out skipped/ignored employees for this month
  if (Array.isArray(excludedEmployeeIds) && excludedEmployeeIds.length > 0) {
    const excludedSet = new Set(excludedEmployeeIds);
    entries = entries.filter((e) => !excludedSet.has(e.employee_id));
  }

  if (entries.length === 0) {
    return errorResponse(res, `No payroll entries to save (all employees were skipped or errored).`, 400);
  }

  // Upsert run record + entries in a transaction
  const run = await prisma.$transaction(async (tx) => {
    // Delete existing DRAFT and its entries if re-running
    if (existing?.status === 'DRAFT') {
      await tx.payrollEntry.deleteMany({ where: { payroll_run_id: existing.id } });
      await tx.payrollRun.delete({ where: { id: existing.id } });
    }

    const newRun = await tx.payrollRun.create({
      data: {
        client_id: clientId,
        month: m,
        year: y,
        status: 'DRAFT',
        run_by: req.user.id,
        notes: notes?.trim() || null,
      },
    });

    await tx.payrollEntry.createMany({
      data: entries.map((e) => ({
        payroll_run_id: newRun.id,
        employee_id: e.employee_id,
        salary_history_id: e.salary_history_id || e.history_id,
        total_days_in_month: e.total_days_in_month,
        days_worked: e.days_worked,
        is_prorated: e.is_prorated,
        components_json: e.components_json,
        gross_salary: e.gross_salary,
        basic_salary: e.basic_salary,
        employee_pf: e.employee_pf,
        employee_esi: e.employee_esi,
        total_deductions: e.total_deductions,
        net_pay: e.net_pay,
        employer_pf: e.employer_pf,
        employer_esi: e.employer_esi,
      })),
    });

    return newRun;
  });

  return successResponse(res, { run_id: run.id, month: m, year: y, entry_count: entries.length, errors }, 'Payroll run saved as DRAFT.', 201);
}

// ── GET PAYROLL RUN DETAIL ─────────────────────────────────────────────────

async function getPayrollRun(req, res) {
  const { clientId, runId } = req.params;

  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, client_id: clientId },
    include: {
      client: true,
      run_by_user: { select: { name: true, email: true } },
      entries: {
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              roll_no: true,
              designation: true,
              department: true,
              email: true,
              tax_regime: true,
              start_date: true,
            },
          },
        },
        orderBy: { employee: { name: 'asc' } },
      },
    },
  });

  if (!run) return errorResponse(res, 'Payroll run not found.', 404);

  // Parse components JSON
  const entries = run.entries.map((e) => ({
    ...e,
    components: JSON.parse(e.components_json),
  }));

  const totals = {
    total_gross: entries.reduce((s, e) => s + Number(e.gross_salary), 0),
    total_pf: entries.reduce((s, e) => s + Number(e.employee_pf), 0),
    total_esi: entries.reduce((s, e) => s + Number(e.employee_esi), 0),
    total_net_pay: entries.reduce((s, e) => s + Number(e.net_pay), 0),
    total_employer_pf: entries.reduce((s, e) => s + Number(e.employer_pf), 0),
    total_employer_esi: entries.reduce((s, e) => s + Number(e.employer_esi), 0),
    employee_count: entries.length,
  };

  return successResponse(res, { ...run, entries, totals });
}

// ── FINALIZE PAYROLL ───────────────────────────────────────────────────────

async function finalizePayroll(req, res) {
  const { clientId, runId } = req.params;

  const run = await prisma.payrollRun.findFirst({ where: { id: runId, client_id: clientId } });
  if (!run) return errorResponse(res, 'Payroll run not found.', 404);
  if (run.status === 'FINALIZED') return errorResponse(res, 'Already finalized.', 409);

  const updated = await prisma.payrollRun.update({
    where: { id: runId },
    data: { status: 'FINALIZED', finalized_at: new Date() },
  });

  return successResponse(res, updated, `Payroll for ${monthName(run.month)} ${run.year} finalized.`);
}

// ── EXPORT PAYROLL CSV ─────────────────────────────────────────────────────

async function exportPayrollCSV(req, res) {
  const { clientId, runId } = req.params;

  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, client_id: clientId },
    include: {
      client: { select: { name: true } },
      entries: {
        include: {
          employee: { select: { name: true, roll_no: true, designation: true, department: true, tax_regime: true } },
        },
        orderBy: { employee: { name: 'asc' } },
      },
    },
  });

  if (!run) return errorResponse(res, 'Payroll run not found.', 404);

  const rows = [
    ['Roll No', 'Name', 'Designation', 'Department', 'Tax Regime', 'Days Worked', 'Total Days', 'Prorated', 'Gross Salary', 'Basic', 'Employee PF', 'Employee ESI', 'Total Deductions', 'Net Pay', 'Employer PF', 'Employer ESI'],
  ];

  for (const e of run.entries) {
    const comps = JSON.parse(e.components_json);
    rows.push([
      e.employee.roll_no,
      e.employee.name,
      e.employee.designation,
      e.employee.department || '',
      e.employee.tax_regime,
      e.days_worked,
      e.total_days_in_month,
      e.is_prorated ? 'Yes' : 'No',
      Number(e.gross_salary),
      Number(e.basic_salary),
      Number(e.employee_pf),
      Number(e.employee_esi),
      Number(e.total_deductions),
      Number(e.net_pay),
      Number(e.employer_pf),
      Number(e.employer_esi),
    ]);
  }

  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const filename = `payroll_${run.client.name}_${monthName(run.month)}_${run.year}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
}

// ── DELETE DRAFT PAYROLL RUN ───────────────────────────────────────────────

async function deletePayrollRun(req, res) {
  const { clientId, runId } = req.params;

  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, client_id: clientId },
  });

  if (!run) return errorResponse(res, 'Payroll run not found.', 404);
  if (run.status === 'FINALIZED') {
    return errorResponse(res, 'Cannot delete a finalized payroll run.', 400);
  }

  await prisma.$transaction([
    prisma.payrollEntry.deleteMany({ where: { payroll_run_id: runId } }),
    prisma.payrollRun.delete({ where: { id: runId } }),
  ]);

  return successResponse(res, { id: runId }, 'Draft payroll run discarded successfully.');
}

module.exports = {
  listPayrollRuns,
  previewPayroll,
  runPayroll,
  getPayrollRun,
  finalizePayroll,
  exportPayrollCSV,
  deletePayrollRun,
};

