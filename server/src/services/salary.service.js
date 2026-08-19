/**
 * Salary Calculation Service
 *
 * Core engine — NO hardcoded percentages. All values come from DB structure config.
 *
 * Responsibilities:
 *  - resolveStructureForDate      → find correct CTCStructure version for a given date
 *  - resolveEmployeeCTC           → find employee's CTC for a given date
 *  - calculateSalaryComponents    → apply structure rules to an annual CTC
 */

const prisma = require('../utils/prisma');
const { Decimal } = require('@prisma/client/runtime/library');

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Round a Decimal value based on the rounding rule.
 * Returns a plain JS number (2 decimal places max).
 */
function applyRounding(value, roundingRule) {
  const num = Number(value);
  switch (roundingRule) {
    case 'NEAREST_RUPEE':
      return Math.round(num);
    case 'NEAREST_10':
      return Math.round(num / 10) * 10;
    case 'NONE':
    default:
      return Math.round(num * 100) / 100; // 2dp max
  }
}

// ─── STRUCTURE RESOLUTION ───────────────────────────────────────────────────

/**
 * Find the applicable CTC Structure version for a given clientId and date.
 * Picks the most recent version whose effective_from <= targetDate,
 * or falls back to the client's active / initial structure if employee joined prior to version date.
 */
async function resolveStructureForDate(clientId, targetDate) {
  const date = new Date(targetDate);

  let structure = await prisma.cTCStructure.findFirst({
    where: {
      client_id: clientId,
      effective_from: { lte: date },
    },
    orderBy: { effective_from: 'desc' },
    include: {
      components: { orderBy: { display_order: 'asc' } },
    },
  });

  // Fallback: If employee joined before the structure effective date, use the client's active or first structure
  if (!structure) {
    structure = await prisma.cTCStructure.findFirst({
      where: {
        client_id: clientId,
      },
      orderBy: [{ status: 'asc' }, { effective_from: 'asc' }],
      include: {
        components: { orderBy: { display_order: 'asc' } },
      },
    });
  }

  return structure;
}

/**
 * Find the employee's salary history record applicable for a given date.
 */
async function resolveEmployeeCTC(employeeId, targetDate) {
  const date = new Date(targetDate);

  const history = await prisma.employeeSalaryHistory.findFirst({
    where: {
      employee_id: employeeId,
      effective_from: { lte: date },
      OR: [{ effective_to: null }, { effective_to: { gte: date } }],
    },
    orderBy: { effective_from: 'desc' },
    include: {
      structure_version: {
        include: { components: { orderBy: { display_order: 'asc' } } },
      },
    },
  });

  return history;
}

// ─── CALCULATION ENGINE ─────────────────────────────────────────────────────

/**
 * Calculate all salary components from a given annualCTC and structure.
 *
 * @param {number} annualCTC - The employee's annual CTC
 * @param {Array}  components - CTCComponent[] from DB (ordered by display_order)
 * @param {string} roundingRule - "NEAREST_RUPEE" | "NEAREST_10" | "NONE"
 * @param {string} remainderComp - Name of the component that absorbs rounding remainder
 *
 * @returns {Object} {
 *   includedComponents: [{ name, monthly, annual, ctc_inclusion, is_taxable }],
 *   addedOnTopComponents: [...],
 *   monthlyCtc: number,
 *   annualCtc: number,
 *   monthlyTotalCostToCompany: number,
 *   annualTotalCostToCompany: number,
 * }
 */
function calculateSalaryComponents(annualCTC, components, roundingRule, remainderComp) {
  const monthlyCtc = annualCTC / 12;

  // Separate INCLUDED vs ADDED_ON_TOP
  const includedComps = components.filter((c) => c.ctc_inclusion === 'INCLUDED');
  const addedOnTopComps = components.filter((c) => c.ctc_inclusion === 'ADDED_ON_TOP');

  // ─── Pass 1: Calculate INCLUDED components ───────────────────────────────

  let calculatedIncluded = [];
  let allocatedAnnual = 0;
  let hasRemainder = false;
  let remainderIndex = -1;

  // Calculate monthly Basic first (needed for PERCENT_OF_BASIC components)
  let monthlyBasic = 0;
  const basicComp = includedComps.find(
    (c) => c.name.toLowerCase() === 'basic' && c.calc_type === 'PERCENT_OF_CTC'
  );
  if (basicComp) {
    monthlyBasic = (Number(basicComp.value) / 100) * monthlyCtc;
  }

  for (let i = 0; i < includedComps.length; i++) {
    const comp = includedComps[i];

    if (comp.calc_type === 'REMAINDER') {
      hasRemainder = true;
      remainderIndex = i;
      calculatedIncluded.push({ ...comp, _annual: null, _monthly: null });
      continue;
    }

    let annualAmount = 0;

    switch (comp.calc_type) {
      case 'PERCENT_OF_CTC':
        annualAmount = (Number(comp.value) / 100) * annualCTC;
        break;
      case 'PERCENT_OF_BASIC':
        annualAmount = (Number(comp.value) / 100) * monthlyBasic * 12;
        break;
      case 'FIXED':
        annualAmount = Number(comp.value) * 12;
        break;
      default:
        annualAmount = 0;
    }

    // Apply rounding to monthly amount, then annualize
    const monthlyRaw = annualAmount / 12;
    const monthlyRounded = applyRounding(monthlyRaw, roundingRule);
    const annualRounded = monthlyRounded * 12;

    allocatedAnnual += annualRounded;
    calculatedIncluded.push({
      ...comp,
      _annual: annualRounded,
      _monthly: monthlyRounded,
    });
  }

  // Assign remainder
  if (hasRemainder && remainderIndex >= 0) {
    const remainderAnnual = annualCTC - allocatedAnnual;
    const remainderMonthlyRaw = remainderAnnual / 12;
    const remainderMonthly = applyRounding(remainderMonthlyRaw, roundingRule);
    // Use exact remainder to keep CTC sum correct
    const finalRemainderAnnual = remainderAnnual;

    calculatedIncluded[remainderIndex] = {
      ...includedComps[remainderIndex],
      _annual: Math.round(finalRemainderAnnual * 100) / 100,
      _monthly: remainderMonthly,
    };
  }

  // ─── Pass 2: Calculate ADDED ON TOP components ───────────────────────────

  // Derive gross salary from included components
  const grossMonthly = calculatedIncluded.reduce((sum, c) => sum + (c._monthly || 0), 0);

  // Re-derive monthly basic from calculated values
  const basicCalculated = calculatedIncluded.find(
    (c) => c.name.toLowerCase() === 'basic'
  );
  const monthlyBasicFinal = basicCalculated ? basicCalculated._monthly : monthlyBasic;

  let calculatedAddedOnTop = [];
  for (const comp of addedOnTopComps) {
    let monthlyAmount = 0;

    switch (comp.calc_type) {
      case 'PERCENT_OF_BASIC':
        monthlyAmount = (Number(comp.value) / 100) * monthlyBasicFinal;
        break;
      case 'PERCENT_OF_GROSS':
        monthlyAmount = (Number(comp.value) / 100) * grossMonthly;
        break;
      case 'PERCENT_OF_CTC':
        monthlyAmount = (Number(comp.value) / 100) * monthlyCtc;
        break;
      case 'FIXED':
        monthlyAmount = Number(comp.value);
        break;
      default:
        monthlyAmount = 0;
    }

    const monthlyRounded = applyRounding(monthlyAmount, roundingRule);
    calculatedAddedOnTop.push({
      ...comp,
      _monthly: monthlyRounded,
      _annual: monthlyRounded * 12,
    });
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  const monthlyAddedOnTop = calculatedAddedOnTop.reduce((s, c) => s + c._monthly, 0);
  const annualAddedOnTop = monthlyAddedOnTop * 12;

  const monthlyTotalCTC = calculatedIncluded.reduce((s, c) => s + (c._monthly || 0), 0);
  const annualTotalCTC = monthlyTotalCTC * 12;

  const monthlyTotalCostToCompany = monthlyTotalCTC + monthlyAddedOnTop;
  const annualTotalCostToCompany = monthlyTotalCostToCompany * 12;

  // Format output
  const formatComp = (c) => ({
    name: c.name,
    calc_type: c.calc_type,
    value: c.value ? Number(c.value) : null,
    basis: c.basis,
    ctc_inclusion: c.ctc_inclusion,
    is_taxable: c.is_taxable,
    display_order: c.display_order,
    monthly: Math.round((c._monthly || 0) * 100) / 100,
    annual: Math.round((c._annual || 0) * 100) / 100,
  });

  return {
    includedComponents: calculatedIncluded.map(formatComp),
    addedOnTopComponents: calculatedAddedOnTop.map(formatComp),
    monthlyCTC: Math.round(monthlyTotalCTC * 100) / 100,
    annualCTC: Math.round(annualTotalCTC * 100) / 100,
    monthlyTotalCostToCompany: Math.round(monthlyTotalCostToCompany * 100) / 100,
    annualTotalCostToCompany: Math.round(annualTotalCostToCompany * 100) / 100,
  };
}

// ─── STATUTORY DEDUCTIONS ────────────────────────────────────────────────────

/**
 * Calculate statutory employee deductions for a payslip.
 * @param {number} monthlyBasic
 * @param {number} monthlyGross
 * @param {boolean} pfOnActual - true = PF on actual basic, false = capped at ₹15,000
 * @param {boolean} esiApplicable - whether ESI should be checked
 */
function calculateStatutoryDeductions(monthlyBasic, monthlyGross, pfOnActual, esiApplicable) {
  // Employee PF: 12% of Basic (capped at ₹1,800/month if not on actual)
  const pfBasis = pfOnActual ? monthlyBasic : Math.min(monthlyBasic, 15000);
  const employeePF = Math.round(pfBasis * 0.12);

  // ESI: 0.75% of Gross, only if gross ≤ ₹21,000
  let employeeESI = 0;
  if (esiApplicable && monthlyGross <= 21000) {
    employeeESI = Math.round(monthlyGross * 0.0075);
  }

  return { employeePF, employeeESI };
}

module.exports = {
  resolveStructureForDate,
  resolveEmployeeCTC,
  calculateSalaryComponents,
  calculateStatutoryDeductions,
};
