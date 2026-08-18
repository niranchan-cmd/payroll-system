import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import api from '../services/api';
import {
  Play, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Info, Lock
} from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

function fmt(n) { return Number(n).toLocaleString('en-IN'); }

function EmployeeRow({ entry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        style={{ cursor: 'pointer', transition: 'background 150ms' }}
        onClick={() => setExpanded((p) => !p)}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = expanded ? 'var(--accent-dim)' : ''}
      >
        <td style={{ padding: '14px 16px' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{entry.roll_no} · {entry.designation}</div>
        </td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>
          {entry.is_prorated
            ? <span style={{ color: 'var(--warning)' }}>{entry.days_worked}/{entry.total_days} days*</span>
            : <span>{entry.total_days}/{entry.total_days} days</span>}
        </td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>₹{fmt(entry.gross_salary)}</td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)' }}>₹{fmt(entry.employee_pf)}</td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)' }}>₹{fmt(entry.employee_esi)}</td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>₹{fmt(entry.net_pay)}</td>
        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'rgba(79, 110, 247, 0.05)' }}>
          <td colSpan={7} style={{ padding: '0 16px 16px 32px' }}>
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

  const handlePreview = async () => {
    setError(null);
    setPreview(null);
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

  const handleRun = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await api.post(`/clients/${clientId}/payroll/run`, { month, year, notes });
      const runId = res.data.data.run_id;
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
      {preview && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Employees', value: preview.totals.employee_count, mono: false },
              { label: 'Total Gross', value: `₹${(preview.totals.total_gross).toLocaleString('en-IN')}`, mono: true },
              { label: 'Total Deductions', value: `₹${(preview.totals.total_pf + preview.totals.total_esi).toLocaleString('en-IN')}`, mono: true },
              { label: 'Total Net Pay', value: `₹${(preview.totals.total_net_pay).toLocaleString('en-IN')}`, mono: true },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: 20, fontFamily: s.mono ? 'var(--font-mono)' : undefined }}>{s.value}</div>
                {s.label === 'Employees' && preview.totals.prorated_count > 0 && (
                  <div className="stat-sub" style={{ color: 'var(--warning)' }}>
                    {preview.totals.prorated_count} prorated
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Employee table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="card-title">Employee Breakdown</span>
              {preview.already_draft && (
                <span className="badge badge-warning" style={{ marginLeft: 8 }}>
                  <Info size={11} /> Existing DRAFT will be replaced
                </span>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    {['Employee', 'Days', 'Gross', 'Emp PF', 'Emp ESI', 'Net Pay', ''].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: h === 'Employee' || h === '' ? 'left' : 'right', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((entry) => (
                    <EmployeeRow key={entry.employee_id} entry={entry} />
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--accent-dim)', borderTop: '2px solid var(--accent)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, color: 'var(--accent-light)' }} colSpan={2}>Totals</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-light)' }}>₹{fmt(preview.totals.total_gross)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>₹{fmt(preview.totals.total_pf)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>₹{fmt(preview.totals.total_esi)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>₹{fmt(preview.totals.total_net_pay)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Error rows */}
          {preview.errors?.length > 0 && (
            <div className="alert alert-warning" style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>⚠ {preview.errors.length} employee(s) skipped:</div>
              {preview.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 13 }}>{e.employee} ({e.roll_no}): {e.reason}</div>
              ))}
            </div>
          )}

          {/* Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setPreview(null)}>Reset</button>
            <button className="btn btn-primary btn-lg" onClick={handleRun} disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <CheckCircle size={17} />}
              Save as Draft
            </button>
          </div>
        </>
      )}
    </div>
  );
}
