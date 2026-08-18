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
  const clientReg = client?.registration_no || client?.pan ? `CIN/Reg: ${client.registration_no || '—'} | PAN: ${client.pan || '—'}` : '';
  const clientAddr = [client?.address, client?.state].filter(Boolean).join(', ');

  const basic = Number(entry.basic_salary || 0);
  const gross = Number(entry.gross_salary || 0);
  const pf = Number(entry.employee_pf || 0);
  const esi = Number(entry.employee_esi || 0);
  const deductions = Number(entry.total_deductions || 0);
  const netPay = Number(entry.net_pay || 0);
  const employerPF = Number(entry.employer_pf || 0);
  const employerESI = Number(entry.employer_esi || 0);

  // Extract HRA and other allowance breakdown
  const hraComp = comps.find((c) => c.name.toLowerCase().includes('hra'));
  const hra = hraComp ? (hraComp.prorated ?? hraComp.monthly) : 0;
  const otherComps = comps.filter((c) => !c.name.toLowerCase().includes('basic') && !c.name.toLowerCase().includes('hra'));

  const netPayInWords = numberToIndianWords(netPay);

  return (
    <div className="payslip-page-wrapper">
      <div className="payslip-box">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="payslip-header">
          <div className="payslip-client-title">{clientName}</div>
          {clientAddr && <div className="payslip-client-sub">{clientAddr}</div>}
          {clientReg && <div className="payslip-client-sub">{clientReg}</div>}
          
          <div className="payslip-doc-badge">
            PAYSLIP FOR THE MONTH OF {monthName.toUpperCase()} {year}
          </div>
        </div>

        {/* ── Employee Information Grid ───────────────────── */}
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
            <span className="payslip-info-val">{entry.total_days_in_month || entry.total_days || 30} Days</span>
          </div>
          <div className="payslip-info-row">
            <span className="payslip-info-label">Paid / Worked Days:</span>
            <span className="payslip-info-val">
              <strong>{entry.days_worked} Days</strong>
              {entry.is_prorated && <span style={{ color: '#b45309', marginLeft: 6 }}>(Prorated)</span>}
            </span>
          </div>
        </div>

        {/* ── Salary Breakdown Table ───────────────────────── */}
        <div className="payslip-table-wrapper">
          <table className="payslip-table">
            <thead>
              <tr>
                <th colSpan={2} className="payslip-th payslip-th-left">EARNINGS</th>
                <th colSpan={2} className="payslip-th payslip-th-right">DEDUCTIONS</th>
              </tr>
              <tr className="payslip-subth">
                <th>Component</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                <th>Component</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Salary</td>
                <td style={{ textAlign: 'right' }}>₹{fmt(basic)}</td>
                <td>Employee PF (12%)</td>
                <td style={{ textAlign: 'right' }}>₹{fmt(pf)}</td>
              </tr>
              <tr>
                <td>House Rent Allowance (HRA)</td>
                <td style={{ textAlign: 'right' }}>₹{fmt(hra)}</td>
                <td>Employee ESI</td>
                <td style={{ textAlign: 'right' }}>₹{fmt(esi)}</td>
              </tr>
              {otherComps.map((c, i) => (
                <tr key={i}>
                  <td>{c.name}</td>
                  <td style={{ textAlign: 'right' }}>₹{fmt(c.prorated ?? c.monthly)}</td>
                  <td>—</td>
                  <td style={{ textAlign: 'right' }}>—</td>
                </tr>
              ))}
              {otherComps.length === 0 && (
                <tr>
                  <td>Special Allowance</td>
                  <td style={{ textAlign: 'right' }}>₹{fmt(Math.max(gross - basic - hra, 0))}</td>
                  <td>—</td>
                  <td style={{ textAlign: 'right' }}>—</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="payslip-tfoot-row">
                <td style={{ fontWeight: 'bold' }}>Total Gross Earnings</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{fmt(gross)}</td>
                <td style={{ fontWeight: 'bold' }}>Total Deductions</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{fmt(deductions)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Net Take Home Highlight Box ──────────────────── */}
        <div className="payslip-net-box">
          <div className="payslip-net-left">
            <div className="payslip-net-label">NET TAKE-HOME SALARY</div>
            <div className="payslip-net-words">{netPayInWords}</div>
          </div>
          <div className="payslip-net-amount">
            ₹{fmt(netPay)}
          </div>
        </div>

        {/* ── Employer Contributions ───────────────────────── */}
        {(employerPF > 0 || employerESI > 0) && (
          <div className="payslip-employer-box">
            <span style={{ fontWeight: 600, color: '#475569' }}>Employer Contributions (Cost to Company):</span>
            {employerPF > 0 && <span style={{ marginLeft: 12 }}>Employer PF: <strong>₹{fmt(employerPF)}</strong></span>}
            {employerESI > 0 && <span style={{ marginLeft: 12 }}>Employer ESI: <strong>₹{fmt(employerESI)}</strong></span>}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="payslip-footer">
          <div className="payslip-footer-note">
            * This is a computer-generated document and does not require a physical signature.
          </div>
          <div className="payslip-branding">
            Generated via <strong>PayEase</strong> by NH Associates
          </div>
        </div>
      </div>
    </div>
  );
}
