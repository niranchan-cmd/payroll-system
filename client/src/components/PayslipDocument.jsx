import { numberToIndianWords } from '../utils/numberToWords';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

export default function PayslipDocument({ entry, client, run }) {
  if (!entry) return null;

  const comps = entry.components?.included || [];
  const monthName = MONTH_NAMES[(run?.month || 1) - 1];
  const year = run?.year || new Date().getFullYear();

  const employee = entry.employee || {};
  const clientName = client?.name || 'Company Name';
  const clientReg = [
    client?.registration_no ? `CIN/Reg: ${client.registration_no}` : null,
    client?.pan ? `PAN: ${client.pan}` : null,
  ].filter(Boolean).join(' | ');
  const clientAddr = [client?.address, client?.state].filter(Boolean).join(', ');

  const basic = Number(entry.basic_salary || 0);
  const gross = Number(entry.gross_salary || 0);
  const employeePf = Number(entry.employee_pf || 0);
  const employeeEsi = Number(entry.employee_esi || 0);
  const totalDeductions = Number(entry.total_deductions || 0);
  const netPay = Number(entry.net_pay || 0);
  const employerPf = Number(entry.employer_pf || 0);
  const employerEsi = Number(entry.employer_esi || 0);

  // Group earnings vs deductions vs employer cost
  const earningsList = [];
  const deductionsList = [];
  const employerCostList = [];

  // Always list Basic
  earningsList.push({ name: 'Basic Salary', amount: basic });

  // HRA
  const hraComp = comps.find((c) => c.name.toLowerCase().includes('hra'));
  if (hraComp) {
    earningsList.push({ name: 'House Rent Allowance (HRA)', amount: hraComp.prorated ?? hraComp.monthly });
  }

  // Other dynamic earnings
  comps.forEach((c) => {
    const lname = c.name.toLowerCase();
    if (lname.includes('basic') || lname.includes('hra')) return;

    if (lname.includes('employer') || lname.includes('lwf employer')) {
      employerCostList.push({ name: c.name, amount: c.prorated ?? c.monthly });
    } else if (lname.includes('pt') || lname.includes('professional tax') || lname.includes('lwf employee') || lname.includes('employee pf') || lname.includes('esi') || lname.includes('tds')) {
      // It's a deduction component
      if (!lname.includes('employee pf') && !lname.includes('esi')) {
        deductionsList.push({ name: c.name, amount: c.prorated ?? c.monthly });
      }
    } else {
      earningsList.push({ name: c.name, amount: c.prorated ?? c.monthly });
    }
  });

  // Standard deductions
  if (employeePf > 0) {
    deductionsList.unshift({ name: 'Provident Fund (PF)', amount: employeePf });
  }
  if (employeeEsi > 0) {
    deductionsList.push({ name: 'Employee State Insurance (ESI)', amount: employeeEsi });
  }

  // Employer standard items
  if (employerPf > 0 && !employerCostList.some(c => c.name.toLowerCase().includes('pf'))) {
    employerCostList.push({ name: 'Employer PF', amount: employerPf });
  }
  if (employerEsi > 0 && !employerCostList.some(c => c.name.toLowerCase().includes('esi'))) {
    employerCostList.push({ name: 'Employer ESI', amount: employerEsi });
  }

  // Balance out rows for side-by-side alignment
  const maxRows = Math.max(earningsList.length, deductionsList.length, 1);
  const rows = [];
  for (let i = 0; i < maxRows; i++) {
    rows.push({
      earning: earningsList[i] || null,
      deduction: deductionsList[i] || null,
    });
  }

  const netPayInWords = numberToIndianWords(netPay);

  return (
    <div className="payslip-page-wrapper">
      <div className="payslip-box">
        {/* ── Company Header ──────────────────────────────── */}
        <div className="payslip-header">
          <div className="payslip-client-title">{clientName}</div>
          {clientAddr && <div className="payslip-client-sub">{clientAddr}</div>}
          {clientReg && <div className="payslip-client-sub">{clientReg}</div>}

          <div className="payslip-doc-badge">
            PAYSLIP FOR {monthName.toUpperCase()} {year}
          </div>
        </div>

        {/* ── Employee Metadata Grid ──────────────────────── */}
        <div className="payslip-info-grid">
          <div className="payslip-info-row">
            <span className="payslip-info-label">Employee Name:</span>
            <span className="payslip-info-val"><strong>{employee.name || '—'}</strong></span>
          </div>
          <div className="payslip-info-row">
            <span className="payslip-info-label">Employee ID / Roll No:</span>
            <span className="payslip-info-val"><strong>{employee.roll_no || '—'}</strong></span>
          </div>
          <div className="payslip-info-row">
            <span className="payslip-info-label">Designation:</span>
            <span className="payslip-info-val">{employee.designation || '—'}</span>
          </div>
          <div className="payslip-info-row">
            <span className="payslip-info-label">Department:</span>
            <span className="payslip-info-val">{employee.department || 'General'}</span>
          </div>
          <div className="payslip-info-row">
            <span className="payslip-info-label">Tax Regime:</span>
            <span className="payslip-info-val">{employee.tax_regime || 'NEW'} Regime</span>
          </div>
          <div className="payslip-info-row">
            <span className="payslip-info-label">Date of Joining:</span>
            <span className="payslip-info-val">{employee.start_date ? new Date(employee.start_date).toLocaleDateString('en-IN') : '—'}</span>
          </div>
          <div className="payslip-info-row">
            <span className="payslip-info-label">Total Days in Month:</span>
            <span className="payslip-info-val">{entry.total_days_in_month || entry.total_days || 31} Days</span>
          </div>
          <div className="payslip-info-row">
            <span className="payslip-info-label">Paid / Worked Days:</span>
            <span className="payslip-info-val">
              <strong>{entry.days_worked} Days</strong>
              {entry.is_prorated && <span style={{ color: '#b45309', fontWeight: 600, marginLeft: 6 }}>(Prorated)</span>}
            </span>
          </div>
        </div>

        {/* ── Clean Modern Side-by-Side Breakdown (NO Heavy Box Grid) ────── */}
        <div className="payslip-clean-section">
          <div className="payslip-clean-grid">
            {/* Earnings Column */}
            <div className="payslip-clean-col">
              <div className="payslip-col-header">
                <span>EARNINGS</span>
                <span>AMOUNT (₹)</span>
              </div>
              <div className="payslip-col-body">
                {earningsList.map((e, idx) => (
                  <div key={idx} className="payslip-item-row">
                    <span className="payslip-item-name">{e.name}</span>
                    <span className="payslip-item-amount">₹{fmt(e.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="payslip-col-total">
                <span>Total Gross Earnings</span>
                <span className="payslip-total-amount">₹{fmt(gross)}</span>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="payslip-clean-col">
              <div className="payslip-col-header">
                <span>DEDUCTIONS</span>
                <span>AMOUNT (₹)</span>
              </div>
              <div className="payslip-col-body">
                {deductionsList.length > 0 ? (
                  deductionsList.map((d, idx) => (
                    <div key={idx} className="payslip-item-row">
                      <span className="payslip-item-name">{d.name}</span>
                      <span className="payslip-item-amount">₹{fmt(d.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="payslip-item-row">
                    <span className="payslip-item-name" style={{ color: '#64748b' }}>Nil</span>
                    <span className="payslip-item-amount">₹0</span>
                  </div>
                )}
              </div>
              <div className="payslip-col-total">
                <span>Total Deductions</span>
                <span className="payslip-total-amount">₹{fmt(totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Net Take-Home Salary Highlight ──────────────── */}
        <div className="payslip-net-box">
          <div className="payslip-net-left">
            <div className="payslip-net-label">NET TAKE-HOME SALARY</div>
            <div className="payslip-net-words">{netPayInWords}</div>
          </div>
          <div className="payslip-net-amount">
            ₹{fmt(netPay)}
          </div>
        </div>

        {/* ── Employer Contributions Summary ──────────────── */}
        {employerCostList.length > 0 && (
          <div className="payslip-employer-box">
            <span style={{ fontWeight: 700, color: '#0f172a' }}>Employer Contributions (CTC):</span>
            {employerCostList.map((c, i) => (
              <span key={i} style={{ marginLeft: 14, color: '#334155' }}>
                {c.name}: <strong>₹{fmt(c.amount)}</strong>
              </span>
            ))}
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="payslip-footer">
          <div className="payslip-footer-note">
            * This is a computer-generated document and does not require a physical signature.
          </div>
          <div className="payslip-branding">
            Generated via <strong>Ploye.pe</strong> by NH Associates
          </div>
        </div>
      </div>
    </div>
  );
}
