const XLSX = require('xlsx');
const prisma = require('../utils/prisma');
const { successResponse, errorResponse } = require('../utils/response.utils');
const { resolveStructureForDate, calculateSalaryComponents } = require('../services/salary.service');

// ── TEMPLATE COLUMNS ───────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  'Roll No',
  'Name',
  'Designation',
  'Department',
  'Email',
  'Start Date (YYYY-MM-DD)',
  'Annual CTC',
  'Tax Regime (OLD/NEW)',
];

const SAMPLE_ROWS = [
  ['EMP001', 'Rahul Kumar', 'Sales Executive', 'Sales', 'rahul@example.com', '2026-01-01', 600000, 'NEW'],
  ['EMP002', 'Priya Sharma', 'HR Manager', 'HR', 'priya@example.com', '2026-03-15', 900000, 'OLD'],
];

// ── DOWNLOAD TEMPLATE ──────────────────────────────────────────────────────

async function downloadTemplate(req, res) {
  const wb = XLSX.utils.book_new();
  const wsData = [TEMPLATE_HEADERS, ...SAMPLE_ROWS];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 18) }));

  // Style header row (bold via comment-based approach since basic xlsx has no style API in free tier)
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');

  // Add instructions sheet
  const instr = XLSX.utils.aoa_to_sheet([
    ['PayEase — Bulk Employee Import Instructions'],
    [''],
    ['1. Fill data starting from Row 2 (do not delete Row 1 headers)'],
    ['2. Roll No must be unique per client'],
    ['3. Start Date format: YYYY-MM-DD (e.g. 2026-01-01)'],
    ['4. Annual CTC: numeric only, in Rupees (e.g. 600000 for ₹6 Lakh)'],
    ['5. Tax Regime: must be exactly OLD or NEW (uppercase)'],
    ['6. Email is optional but recommended'],
    ['7. Department is optional'],
    ['8. Do not change sheet name "Employees"'],
  ]);
  XLSX.utils.book_append_sheet(wb, instr, 'Instructions');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="payroll_import_template.xlsx"');
  return res.send(buf);
}

// ── VALIDATE UPLOAD ────────────────────────────────────────────────────────

async function validateImport(req, res) {
  const { clientId } = req.params;

  if (!req.file) return errorResponse(res, 'No file uploaded. Send as multipart form-data field "file".', 400);

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return errorResponse(res, 'Client not found.', 404);

  // Parse Excel
  let wb;
  try {
    wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
  } catch {
    return errorResponse(res, 'Invalid Excel file. Please use the provided template.', 400);
  }

  const ws = wb.Sheets['Employees'];
  if (!ws) return errorResponse(res, 'Sheet "Employees" not found. Please use the provided template.', 400);

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (rows.length < 2) return errorResponse(res, 'No data rows found (at least one employee row required).', 400);

  // Validate header
  const header = rows[0].map((h) => String(h).trim());
  const missingCols = TEMPLATE_HEADERS.filter((h) => !header.includes(h));
  if (missingCols.length > 0) {
    return errorResponse(res, `Missing required columns: ${missingCols.join(', ')}. Please use the provided template.`, 400);
  }

  // Build column index map
  const col = {};
  TEMPLATE_HEADERS.forEach((h) => { col[h] = header.indexOf(h); });

  // Fetch existing roll_nos for this client
  const existingEmployees = await prisma.employee.findMany({
    where: { client_id: clientId },
    select: { roll_no: true },
  });
  const existingRollNos = new Set(existingEmployees.map((e) => e.roll_no));

  const valid = [];
  const errors = [];
  const seenRollNos = new Set();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const rowErrors = [];

    // Extract values
    const rollNo = String(row[col['Roll No']] ?? '').trim();
    const name = String(row[col['Name']] ?? '').trim();
    const designation = String(row[col['Designation']] ?? '').trim();
    const department = String(row[col['Department']] ?? '').trim();
    const email = String(row[col['Email']] ?? '').trim();
    const startDateRaw = row[col['Start Date (YYYY-MM-DD)']];
    const annualCTCRaw = row[col['Annual CTC']];
    const taxRegime = String(row[col['Tax Regime (OLD/NEW)']] ?? '').trim().toUpperCase();

    // Skip completely empty rows
    if (!rollNo && !name && !designation) continue;

    // Validations
    if (!rollNo) rowErrors.push('Roll No is required');
    else if (existingRollNos.has(rollNo)) rowErrors.push(`Roll No "${rollNo}" already exists`);
    else if (seenRollNos.has(rollNo)) rowErrors.push(`Duplicate Roll No "${rollNo}" in this file`);

    if (!name) rowErrors.push('Name is required');
    if (!designation) rowErrors.push('Designation is required');

    // Start date
    let startDate = null;
    if (!startDateRaw) {
      rowErrors.push('Start Date is required');
    } else {
      // Handle both string and Date objects from xlsx
      if (startDateRaw instanceof Date) {
        startDate = startDateRaw.toISOString().split('T')[0];
      } else {
        startDate = String(startDateRaw).trim();
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        rowErrors.push(`Start Date "${startDate}" must be YYYY-MM-DD format`);
        startDate = null;
      } else if (isNaN(new Date(startDate).getTime())) {
        rowErrors.push(`Start Date "${startDate}" is not a valid date`);
        startDate = null;
      }
    }

    // Annual CTC
    let annualCTC = null;
    if (!annualCTCRaw && annualCTCRaw !== 0) {
      rowErrors.push('Annual CTC is required');
    } else {
      annualCTC = Number(annualCTCRaw);
      if (isNaN(annualCTC) || annualCTC <= 0) rowErrors.push('Annual CTC must be a positive number');
    }

    // Tax regime
    if (!['OLD', 'NEW'].includes(taxRegime)) {
      rowErrors.push(`Tax Regime must be "OLD" or "NEW" (got "${taxRegime}")`);
    }

    // Check CTC structure availability for start date (only if start date is valid)
    let structure = null;
    if (startDate && !rowErrors.some((e) => e.includes('Start Date'))) {
      structure = await resolveStructureForDate(clientId, startDate);
      if (!structure) {
        rowErrors.push(`No CTC Structure found for start date ${startDate}`);
      }
    }

    if (rollNo) seenRollNos.add(rollNo);

    const rowData = { rowNum, rollNo, name, designation, department, email, startDate, annualCTC, taxRegime };

    if (rowErrors.length > 0) {
      errors.push({ ...rowData, errors: rowErrors });
    } else {
      valid.push({ ...rowData, structure_id: structure?.id });
    }
  }

  return successResponse(res, {
    total: valid.length + errors.length,
    valid_count: valid.length,
    error_count: errors.length,
    valid,
    errors,
    can_import: errors.length === 0 && valid.length > 0,
  });
}

// ── CONFIRM IMPORT ────────────────────────────────────────────────────────

async function confirmImport(req, res) {
  const { clientId } = req.params;
  const { rows } = req.body; // Array of validated row objects from the validate step

  if (!Array.isArray(rows) || rows.length === 0) {
    return errorResponse(res, 'rows array is required.', 400);
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return errorResponse(res, 'Client not found.', 404);

  const created = [];
  const failed = [];

  // Process in a single transaction
  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      try {
        // Re-resolve structure (in case time has passed since validate)
        const structure = await resolveStructureForDate(clientId, row.startDate);
        if (!structure) throw new Error(`No CTC structure for ${row.startDate}`);

        const employee = await tx.employee.create({
          data: {
            client_id: clientId,
            name: row.name.trim(),
            roll_no: row.rollNo.trim(),
            designation: row.designation.trim(),
            department: row.department?.trim() || null,
            email: row.email?.trim() || null,
            start_date: new Date(row.startDate),
            tax_regime: row.taxRegime,
            status: 'ACTIVE',
          },
        });

        await tx.employeeSalaryHistory.create({
          data: {
            employee_id: employee.id,
            annual_ctc: row.annualCTC,
            structure_version_id: structure.id,
            effective_from: new Date(row.startDate),
            effective_to: null,
            change_reason: 'INITIAL_JOINING',
            notes: 'Imported via bulk upload',
            created_by: req.user.id,
          },
        });

        created.push({ roll_no: row.rollNo, name: row.name });
      } catch (err) {
        failed.push({ roll_no: row.rollNo, name: row.name, reason: err.message });
      }
    }
  });

  return successResponse(res, {
    imported: created.length,
    failed: failed.length,
    created,
    failed,
  }, `Successfully imported ${created.length} employee(s).`, 201);
}

module.exports = { downloadTemplate, validateImport, confirmImport };
