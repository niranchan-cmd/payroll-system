const prisma = require('../utils/prisma');
const { successResponse, errorResponse } = require('../utils/response.utils');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * GET /api/v1/reports/pay-register
 * Query params:
 *   - clientId (optional, 'all' or uuid)
 *   - month (optional, 1-12)
 *   - year (optional, e.g. 2026)
 *   - status (optional, 'FINALIZED', 'DRAFT', 'ALL')
 *   - search (optional, employee name or roll_no)
 */
async function getPayRegister(req, res) {
  const { clientId, month, year, status = 'ALL', search } = req.query;

  // Build filter condition for PayrollRun
  const runWhere = {};
  if (clientId && clientId !== 'all') {
    runWhere.client_id = clientId;
  }
  if (month && month !== 'all') {
    runWhere.month = parseInt(month);
  }
  if (year && year !== 'all') {
    runWhere.year = parseInt(year);
  }
  if (status && status !== 'ALL') {
    runWhere.status = status;
  }

  // Fetch runs matching criteria
  const runs = await prisma.payrollRun.findMany({
    where: runWhere,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      run_by_user: {
        select: { name: true, email: true },
      },
      entries: {
        include: {
          employee: {
            select: {
              id: true,
              roll_no: true,
              name: true,
              designation: true,
              department: true,
              email: true,
              tax_regime: true,
              start_date: true,
            },
          },
        },
        orderBy: [{ employee: { name: 'asc' } }],
      },
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
      { client: { name: 'asc' } },
    ],
  });

  // Filter entries if search query provided
  let totalEmployees = 0;
  let totalGross = 0;
  let totalBasic = 0;
  let totalEmpPF = 0;
  let totalEmpESI = 0;
  let totalDeductions = 0;
  let totalNetPay = 0;
  let totalEmployerPF = 0;
  let totalEmployerESI = 0;
  let totalCTC = 0;

  const formattedRuns = runs.map((run) => {
    let entries = run.entries;

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      entries = entries.filter((e) =>
        e.employee.name.toLowerCase().includes(q) ||
        e.employee.roll_no.toLowerCase().includes(q) ||
        (e.employee.department && e.employee.department.toLowerCase().includes(q))
      );
    }

    const runEntries = entries.map((entry) => {
      let comps = { included: [], addedOnTop: [] };
      try {
        comps = JSON.parse(entry.components_json);
      } catch (err) {
        // ignore parse error
      }

      const gross = Number(entry.gross_salary);
      const basic = Number(entry.basic_salary);
      const pf = Number(entry.employee_pf);
      const esi = Number(entry.employee_esi);
      const deductions = Number(entry.total_deductions);
      const net = Number(entry.net_pay);
      const erPF = Number(entry.employer_pf);
      const erESI = Number(entry.employer_esi);
      const ctcCost = gross + erPF + erESI;

      // Extract common earnings breakdown components
      const included = comps.included || [];
      const hraComp = included.find((c) => c.name.toLowerCase().includes('hra'));
      const hra = hraComp ? (hraComp.prorated ?? hraComp.monthly) : 0;
      const otherAllowances = Math.max(gross - basic - hra, 0);

      totalGross += gross;
      totalBasic += basic;
      totalEmpPF += pf;
      totalEmpESI += esi;
      totalDeductions += deductions;
      totalNetPay += net;
      totalEmployerPF += erPF;
      totalEmployerESI += erESI;
      totalCTC += ctcCost;
      totalEmployees++;

      return {
        id: entry.id,
        employee_id: entry.employee.id,
        roll_no: entry.employee.roll_no,
        name: entry.employee.name,
        designation: entry.employee.designation,
        department: entry.employee.department || '—',
        tax_regime: entry.employee.tax_regime,
        total_days: entry.total_days_in_month,
        days_worked: entry.days_worked,
        is_prorated: entry.is_prorated,
        basic,
        hra,
        other_allowances: otherAllowances,
        gross_salary: gross,
        employee_pf: pf,
        employee_esi: esi,
        total_deductions: deductions,
        net_pay: net,
        employer_pf: erPF,
        employer_esi: erESI,
        total_ctc_cost: ctcCost,
        components: comps,
      };
    });

    const runTotals = {
      gross: runEntries.reduce((sum, e) => sum + e.gross_salary, 0),
      basic: runEntries.reduce((sum, e) => sum + e.basic, 0),
      employee_pf: runEntries.reduce((sum, e) => sum + e.employee_pf, 0),
      employee_esi: runEntries.reduce((sum, e) => sum + e.employee_esi, 0),
      total_deductions: runEntries.reduce((sum, e) => sum + e.total_deductions, 0),
      net_pay: runEntries.reduce((sum, e) => sum + e.net_pay, 0),
      employer_pf: runEntries.reduce((sum, e) => sum + e.employer_pf, 0),
      employer_esi: runEntries.reduce((sum, e) => sum + e.employer_esi, 0),
      total_ctc_cost: runEntries.reduce((sum, e) => sum + e.total_ctc_cost, 0),
      count: runEntries.length,
    };

    return {
      id: run.id,
      month: run.month,
      year: run.year,
      month_name: MONTH_NAMES[run.month - 1],
      period_label: `${MONTH_NAMES[run.month - 1]} ${run.year}`,
      status: run.status,
      finalized_at: run.finalized_at,
      client: run.client,
      run_by: run.run_by_user?.name,
      entries: runEntries,
      totals: runTotals,
    };
  });

  // Grand summary across all queried runs
  const grandTotals = {
    total_employees: totalEmployees,
    total_runs: runs.length,
    total_gross: totalGross,
    total_basic: totalBasic,
    total_employee_pf: totalEmpPF,
    total_employee_esi: totalEmpESI,
    total_deductions: totalDeductions,
    total_net_pay: totalNetPay,
    total_employer_pf: totalEmployerPF,
    total_employer_esi: totalEmployerESI,
    total_ctc_cost: totalCTC,
  };

  return successResponse(res, {
    runs: formattedRuns,
    grand_totals: grandTotals,
  });
}

/**
 * GET /api/v1/reports/pay-register/export
 * Downloads comprehensive CSV pay register
 */
async function exportPayRegisterCSV(req, res) {
  const { clientId, month, year, status = 'ALL' } = req.query;

  const runWhere = {};
  if (clientId && clientId !== 'all') runWhere.client_id = clientId;
  if (month && month !== 'all') runWhere.month = parseInt(month);
  if (year && year !== 'all') runWhere.year = parseInt(year);
  if (status && status !== 'ALL') runWhere.status = status;

  const runs = await prisma.payrollRun.findMany({
    where: runWhere,
    include: {
      client: { select: { name: true, code: true } },
      entries: {
        include: {
          employee: {
            select: {
              roll_no: true,
              name: true,
              designation: true,
              department: true,
              tax_regime: true,
            },
          },
        },
        orderBy: { employee: { roll_no: 'asc' } },
      },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { client: { name: 'asc' } }],
  });

  const headers = [
    'Month/Year',
    'Client',
    'Status',
    'Roll No',
    'Employee Name',
    'Designation',
    'Department',
    'Tax Regime',
    'Paid Days',
    'Total Days',
    'Prorated',
    'Basic Salary',
    'HRA',
    'Other Allowances',
    'Gross Salary',
    'Employee PF (12%)',
    'Employee ESI (0.75%)',
    'Total Deductions',
    'Net Pay (Take Home)',
    'Employer PF',
    'Employer ESI',
    'Total Company Cost (CTC)',
  ];

  const rows = [headers];

  for (const run of runs) {
    const period = `${MONTH_NAMES[run.month - 1]} ${run.year}`;
    const clientName = run.client.name;

    for (const entry of run.entries) {
      let comps = { included: [] };
      try {
        comps = JSON.parse(entry.components_json);
      } catch (err) {}

      const gross = Number(entry.gross_salary);
      const basic = Number(entry.basic_salary);
      const pf = Number(entry.employee_pf);
      const esi = Number(entry.employee_esi);
      const deductions = Number(entry.total_deductions);
      const net = Number(entry.net_pay);
      const erPF = Number(entry.employer_pf);
      const erESI = Number(entry.employer_esi);
      const ctcCost = gross + erPF + erESI;

      const included = comps.included || [];
      const hraComp = included.find((c) => c.name.toLowerCase().includes('hra'));
      const hra = hraComp ? (hraComp.prorated ?? hraComp.monthly) : 0;
      const otherAllowances = Math.max(gross - basic - hra, 0);

      rows.push([
        period,
        clientName,
        run.status,
        entry.employee.roll_no,
        entry.employee.name,
        entry.employee.designation,
        entry.employee.department || '',
        entry.employee.tax_regime,
        entry.days_worked,
        entry.total_days_in_month,
        entry.is_prorated ? 'Yes' : 'No',
        basic,
        hra,
        otherAllowances,
        gross,
        pf,
        esi,
        deductions,
        net,
        erPF,
        erESI,
        ctcCost,
      ]);
    }
  }

  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const filename = `pay_register_${year || 'all'}_${month || 'all'}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
}

module.exports = {
  getPayRegister,
  exportPayRegisterCSV,
};
