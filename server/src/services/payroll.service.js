/**
 * Payroll Engine Service
 *
 * Calculates the full monthly payroll for a single employee for a given month/year.
 * Handles:
 *   - Proration for mid-month joiners (CALENDAR / FIXED_26 / FIXED_30)
 *   - Employee PF deduction (12% of basic, optional cap at ₹15,000 basis)
 *   - Employee ESI deduction (0.75% of gross if gross ≤ ₹21,000)
 *   - Employer PF (12% of basic, same basis)
 *   - Employer ESI (3.25% of gross if gross ≤ ₹21,000)
 *   - Net pay = Gross − Employee PF − Employee ESI
 *
 * NO hardcoded component percentages — all from DB structure config.
 */

const { calculateSalaryComponents, calculateStatutoryDeductions } = require('./salary.service');

// ─── PRORATION HELPERS ──────────────────────────────────────────────────────

/**
 * Returns the total "divisor" days for a proration rule.
 */
function getProratedDivisor(prorationsRule, year, month) {
  switch (prorationsRule) {
    case 'FIXED_26':
      return 26;
    case 'FIXED_30':
      return 30;
    case 'CALENDAR':
    default:
      return new Date(year, month, 0).getDate(); // actual days in that month
  }
}

/**
 * Get days worked in the month for an employee who joined mid-month.
 * Returns { daysWorked, totalDays, isProrated }
 */
function getDaysWorked(startDate, year, month, prorationsRule) {
  const totalDays = getProratedDivisor(prorationsRule, year, month);
  const firstOfMonth = new Date(year, month - 1, 1);
  const joinDate = new Date(startDate);

  // Joined on or before the first of the month → full month
  if (joinDate <= firstOfMonth) {
    return { daysWorked: totalDays, totalDays, isProrated: false };
  }

  // Joined during this month → prorate
  let daysWorked;
  if (prorationsRule === 'CALENDAR') {
    const lastOfMonth = new Date(year, month, 0);
    const lastDay = Math.min(joinDate.getDate(), lastOfMonth.getDate());
    const joinDay = joinDate.getDate();
    daysWorked = totalDays - joinDay + 1;
  } else {
    // For FIXED_26 / FIXED_30, count calendar days remaining and scale
    const calendarTotal = new Date(year, month, 0).getDate();
    const joinDay = joinDate.getDate();
    const calendarDaysWorked = calendarTotal - joinDay + 1;
    daysWorked = Math.round((calendarDaysWorked / calendarTotal) * totalDays);
  }

  return { daysWorked: Math.max(daysWorked, 0), totalDays, isProrated: daysWorked < totalDays };
}

// ─── MAIN CALCULATION ───────────────────────────────────────────────────────

/**
 * Calculate payroll for one employee for a given month/year.
 *
 * @param {Object} employee - Employee record with salary_histories included
 * @param {Object} salaryHistory - The applicable EmployeeSalaryHistory record
 * @param {Object} structure - CTCStructure with components[]
 * @param {Object} client - Client config (proration_rule, pf_on_actual, esi_auto_apply)
 * @param {number} year
 * @param {number} month - 1-12
 *
 * @returns {Object} Full payroll entry data
 */
function calculateEmployeePayroll(employee, salaryHistory, structure, client, year, month, customDaysWorked) {
  const annualCTC = Number(salaryHistory.annual_ctc);

  // ── Step 1: Calculate full-month salary breakdown ─────────────────────────
  const breakdown = calculateSalaryComponents(
    annualCTC,
    structure.components,
    structure.rounding_rule,
    structure.remainder_comp
  );

  // ── Step 2: Check proration & attendance ──────────────────────────────────
  let { daysWorked, totalDays, isProrated } = getDaysWorked(
    employee.start_date,
    year,
    month,
    client.proration_rule || 'CALENDAR'
  );

  // Override with custom attendance / days worked if provided
  if (customDaysWorked !== undefined && customDaysWorked !== null && customDaysWorked !== '') {
    const customDays = Number(customDaysWorked);
    if (!isNaN(customDays) && customDays >= 0) {
      daysWorked = Math.min(customDays, totalDays);
      isProrated = daysWorked < totalDays;
    }
  }

  const prorFactor = totalDays > 0 ? daysWorked / totalDays : 1;

  // ── Step 3: Apply proration to each component ─────────────────────────────
  const proratedIncluded = breakdown.includedComponents.map((c) => ({
    ...c,
    prorated: isProrated ? Math.round(c.monthly * prorFactor) : c.monthly,
  }));

  const proratedAddedOnTop = breakdown.addedOnTopComponents.map((c) => ({
    ...c,
    prorated: isProrated ? Math.round(c.monthly * prorFactor) : c.monthly,
  }));

  // ── Step 4: Derive gross salary and basic (prorated) ─────────────────────
  const grossSalary = proratedIncluded.reduce((s, c) => s + c.prorated, 0);
  const basicComp = proratedIncluded.find((c) => c.name.toLowerCase() === 'basic');
  const basicSalary = basicComp ? basicComp.prorated : 0;

  // ── Step 5: Statutory deductions ─────────────────────────────────────────
  const { employeePF, employeeESI } = calculateStatutoryDeductions(
    basicSalary,
    grossSalary,
    Boolean(client.pf_on_actual),
    Boolean(client.esi_auto_apply)
  );

  // ── Step 6: Employer contributions (for Cost-to-Company tracking) ─────────
  const pfBasis = client.pf_on_actual ? basicSalary : Math.min(basicSalary, 15000);
  const employerPF = Math.round(pfBasis * 0.12);
  const employerESI = (client.esi_auto_apply && grossSalary <= 21000)
    ? Math.round(grossSalary * 0.0325)
    : 0;

  // ── Step 7: Net pay ───────────────────────────────────────────────────────
  const totalDeductions = employeePF + employeeESI;
  const netPay = grossSalary - totalDeductions;

  // ── Build components JSON for storage ────────────────────────────────────
  const componentsJson = JSON.stringify({
    included: proratedIncluded,
    addedOnTop: proratedAddedOnTop,
    fullMonthlyGross: breakdown.monthlyCTC,
  });

  return {
    employee_id: employee.id,
    salary_history_id: salaryHistory.id,
    total_days_in_month: totalDays,
    days_worked: daysWorked,
    is_prorated: isProrated,
    components_json: componentsJson,
    gross_salary: grossSalary,
    basic_salary: basicSalary,
    employee_pf: employeePF,
    employee_esi: employeeESI,
    total_deductions: totalDeductions,
    net_pay: Math.max(netPay, 0),
    employer_pf: employerPF,
    employer_esi: employerESI,
    // Extra summary for preview (not stored directly)
    _summary: {
      name: employee.name,
      roll_no: employee.roll_no,
      designation: employee.designation,
      annual_ctc: annualCTC,
      structure_version: structure.version_name,
      proration_factor: prorFactor,
      components: proratedIncluded,
      addedOnTop: proratedAddedOnTop,
    },
  };
}

module.exports = { calculateEmployeePayroll, getDaysWorked };
