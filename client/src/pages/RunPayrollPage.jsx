import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import api from '../services/api';
import {
  Play, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Info, Lock,
  UserX, UserCheck, CheckSquare, Square
} from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

function fmt(n) { return Number(n || 0).toLocaleString('en-IN'); }

function EmployeeRow({ entry, isExcluded, onToggle }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        style={{
          cursor: 'pointer',
          transition: 'background 150ms',
          opacity: isExcluded ? 0.55 : 1,
          background: isExcluded ? 'rgba(0,0,0,0.03)' : expanded ? 'var(--accent-dim)' : '',
        }}
        onClick={() => setExpanded((p) => !p)}
        onMouseEnter={(e) => { if (!expanded && !isExcluded) e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { if (!expanded && !isExcluded) e.currentTarget.style.background = ''; }}
      >
        {/* Checkbox / Action */}
        <td style={{ padding: '14px 16px', width: 44 }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!isExcluded}
            onChange={() => onToggle(entry.employee_id)}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
            title={isExcluded ? 'Click to Include in this month payroll' : 'Click to Skip / Exclude from this month payroll'}
          />
        </td>

        <td style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14, textDecoration: isExcluded ? 'line-through' : 'none' }}>
              {entry.name}
            </span>
            {isExcluded && (
              <span className="badge badge-warning" style={{ fontSize: 10, padding: '1px 6px' }}>
                <UserX size={10} /> Skipped this month
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {entry.roll_no} · {entry.designation}
          </div>
        </td>

        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>
          {entry.is_prorated
            ? <span style={{ color: 'var(--warning)' }}>{entry.days_worked}/{entry.total_days} days*</span>
            : <span>{entry.total_days}/{entry.total_days} days</span>}
        </td>

        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, textDecoration: isExcluded ? 'line-through' : 'none' }}>
          ₹{fmt(entry.gross_salary)}
        </td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)', textDecoration: isExcluded ? 'line-through' : 'none' }}>
          ₹{fmt(entry.employee_pf)}
        </td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)', textDecoration: isExcluded ? 'line-through' : 'none' }}>
          ₹{fmt(entry.employee_esi)}
        </td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: isExcluded ? 'var(--text-muted)' : 'var(--success)', textDecoration: isExcluded ? 'line-through' : 'none' }}>
          ₹{fmt(entry.net_pay)}
        </td>

        {/* Quick Skip button */}
        <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`btn btn-sm ${isExcluded ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 11.5, padding: '3px 8px' }}
            onClick={() => onToggle(entry.employee_id)}
          >
            {isExcluded ? <><UserCheck size={12} /> Include</> : <><UserX size={12} /> Skip</>}
          </button>
        </td>

        <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>

      {expanded && (
        <tr style={{ background: 'rgba(79, 110, 247, 0.05)' }}>
          <td colSpan={9} style={{ padding: '0 16px 16px 48px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Earnings Breakdown</div>
                {entry.components.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>₹{fmt(c.prorated ?? c.monthly)}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Deductions</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Employee PF</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>- ₹{fmt(entry.employee_pf)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Employee ESI</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>- ₹{fmt(entry.employee_esi)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, fontWeight: 700 }}>
                  <span>Net Pay</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>₹{fmt(entry.net_pay)}</span>
                </div>
                {entry.employer_pf > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Employer PF: ₹{fmt(entry.employer_pf)} | Employer ESI: ₹{fmt(entry.employer_esi)}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function RunPayrollPage() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const { selectedClient } = useClient();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [notes, setNotes] = useState('');

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Set of excluded employee IDs
  const [excludedIds, setExcludedIds] = useState(new Set());

  const handlePreview = async () => {
    setError(null);
    setPreview(null);
    setExcludedIds(new Set());
    setLoadingPreview(true);
    try {
      const res = await api.post(`/clients/${clientId}/payroll/preview`, { month, year });
      setPreview(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Preview failed');
    } finally {
      setLoadingPreview(false);
    }
  };

  const toggleEmployee = (empId) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  const handleIncludeAll = () => {
    setExcludedIds(new Set());
  };

  const handleSkipAll = () => {
    if (!preview?.preview) return;
    const all = new Set(preview.preview.map((e) => e.employee_id));
    setExcludedIds(all);
  };

  // Recalculate totals dynamically based on included employees
  const activeTotals = useMemo(() => {
    if (!preview?.preview) return null;
    const included = preview.preview.filter((e) => !excludedIds.has(e.employee_id));
    return {
      included_count: included.length,
      skipped_count: excludedIds.size,
      total_count: preview.preview.length,
      total_gross: included.reduce((s, e) => s + Number(e.gross_salary || 0), 0),
      total_pf: included.reduce((s, e) => s + Number(e.employee_pf || 0), 0),
      total_esi: included.reduce((s, e) => s + Number(e.employee_esi || 0), 0),
      total_deductions: included.reduce((s, e) => s + Number(e.total_deductions || 0), 0),
      total_net_pay: included.reduce((s, e) => s + Number(e.net_pay || 0), 0),
      prorated_count: included.filter((e) => e.is_prorated).length,
    };
  }, [preview, excludedIds]);

  const handleRun = async () => {
    if (activeTotals && activeTotals.included_count === 0) {
      toast.error('Cannot save payroll with 0 employees included. Please include at least 1 employee.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const payload = {
        month,
        year,
        notes,
        excludedEmployeeIds: Array.from(excludedIds),
      };
      const res = await api.post(`/clients/${clientId}/payroll/run`, payload);
      const runId = res.data.data.run_id;
      toast.success(`Payroll saved as DRAFT (${activeTotals.included_count} processed, ${excludedIds.size} skipped)`);
      navigate(`/clients/${clientId}/payroll/${runId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save payroll run');
      setSaving(false);
    }
  };

  const years = [];
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) years.push(y);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Run Payroll</h1>
          <p className="page-subtitle">{selectedClient?.name || '—'}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(`/clients/${clientId}/payroll`)}>
          ← Back
        </button>
      </div>

      {/* Period selector */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">Select Payroll Period</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 16, alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="form-select" value={month} onChange={(e) => { setMonth(parseInt(e.target.value)); setPreview(null); }}>
              {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Year</label>
            <select className="form-select" value={year} onChange={(e) => { setYear(parseInt(e.target.value)); setPreview(null); }}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Regular August run"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <button
            className="btn btn-secondary"
            onClick={handlePreview}
            disabled={loadingPreview}
            style={{ height: 42 }}
          >
            {loadingPreview ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Play size={15} />}
            Preview
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 24 }}><AlertCircle size={16} /> {error}</div>}

      {/* Preview results */}
      {preview && activeTotals && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Employees to Process</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {activeTotals.included_count} / {activeTotals.total_count}
              </div>
              <div className="stat-sub" style={{ color: activeTotals.skipped_count > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                {activeTotals.skipped_count} skipped for this month
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Gross Salary</div>
              <div className="stat-value" style={{ fontSize: 20, fontFamily: 'var(--font-mono)' }}>
                ₹{fmt(activeTotals.total_gross)}
              </div>
              <div className="stat-sub">Before statutory deductions</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Deductions</div>
              <div className="stat-value" style={{ fontSize: 20, fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                ₹{fmt(activeTotals.total_deductions)}
              </div>
              <div className="stat-sub">PF: ₹{fmt(activeTotals.total_pf)} | ESI: ₹{fmt(activeTotals.total_esi)}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Net Take-Home Payout</div>
              <div className="stat-value" style={{ fontSize: 20, fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                ₹{fmt(activeTotals.total_net_pay)}
              </div>
              <div className="stat-sub">Total payable to {activeTotals.included_count} employees</div>
            </div>
          </div>

          {/* Employee table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="card-title">Employee Payroll Preview</span>
                {preview.already_draft && (
                  <span className="badge badge-warning">
                    <Info size={11} /> Existing DRAFT will be replaced
                  </span>
                )}
                {activeTotals.skipped_count > 0 && (
                  <span className="badge badge-warning">
                    {activeTotals.skipped_count} employee(s) skipped
                  </span>
                )}
              </div>

              {/* Selection controls */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleIncludeAll}
                  disabled={excludedIds.size === 0}
                >
                  <UserCheck size={13} /> Include All ({activeTotals.total_count})
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleSkipAll}
                  disabled={excludedIds.size === activeTotals.total_count}
                >
                  <UserX size={13} /> Skip All
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    <th style={{ padding: '10px 16px', width: 44 }}>
                      <input
                        type="checkbox"
                        checked={excludedIds.size === 0 && preview.preview.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) handleIncludeAll();
                          else handleSkipAll();
                        }}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                        title="Toggle all employees"
                      />
                    </th>
                    {['Employee', 'Days', 'Gross', 'Emp PF', 'Emp ESI', 'Net Pay', 'Action', ''].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: h === 'Employee' || h === '' ? 'left' : h === 'Action' ? 'center' : 'right', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((entry) => (
                    <EmployeeRow
                      key={entry.employee_id}
                      entry={entry}
                      isExcluded={excludedIds.has(entry.employee_id)}
                      onToggle={toggleEmployee}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--accent-dim)', borderTop: '2px solid var(--accent)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, color: 'var(--accent-light)' }} colSpan={3}>
                      Included Totals ({activeTotals.included_count} of {activeTotals.total_count} Employees)
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-light)' }}>₹{fmt(activeTotals.total_gross)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>₹{fmt(activeTotals.total_pf)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>₹{fmt(activeTotals.total_esi)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>₹{fmt(activeTotals.total_net_pay)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Error rows */}
          {preview.errors?.length > 0 && (
            <div className="alert alert-warning" style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>⚠ {preview.errors.length} employee(s) excluded due to missing setup:</div>
              {preview.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 13 }}>{e.employee} ({e.roll_no}): {e.reason}</div>
              ))}
            </div>
          )}

          {/* Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Ready to save: <strong>{activeTotals.included_count}</strong> employees
              {activeTotals.skipped_count > 0 && ` (${activeTotals.skipped_count} skipped)`}
            </span>
            <button className="btn btn-secondary" onClick={() => setPreview(null)}>Reset</button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleRun}
              disabled={saving || activeTotals.included_count === 0}
            >
              {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <CheckCircle size={17} />}
              Save as Draft ({activeTotals.included_count} Employees)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
