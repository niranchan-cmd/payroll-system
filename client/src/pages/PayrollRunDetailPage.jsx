import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import api from '../services/api';
import { Download, Lock, ChevronDown, ChevronUp, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmt(n) { return Number(n).toLocaleString('en-IN'); }

function EntryRow({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const comps = entry.components?.included || [];

  return (
    <>
      <tr
        onClick={() => setExpanded((p) => !p)}
        style={{ cursor: 'pointer', background: expanded ? 'var(--accent-dim)' : '', transition: 'background 150ms' }}
        onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.background = ''; }}
      >
        <td style={{ padding: '14px 16px' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.employee?.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {entry.employee?.roll_no} · {entry.employee?.designation}
          </div>
        </td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13 }}>
          {entry.is_prorated
            ? <span style={{ color: 'var(--warning)' }}>{entry.days_worked}/{entry.total_days_in_month}d*</span>
            : <span style={{ color: 'var(--text-secondary)' }}>{entry.total_days_in_month}d</span>}
        </td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>₹{fmt(entry.gross_salary)}</td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)' }}>₹{fmt(entry.employee_pf)}</td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--danger)' }}>₹{fmt(entry.employee_esi)}</td>
        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>₹{fmt(entry.net_pay)}</td>
        <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'rgba(79,110,247,0.05)' }}>
          <td colSpan={7} style={{ padding: '0 16px 20px 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingTop: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Earnings</div>
                {comps.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {c.name}
                      {entry.is_prorated && <span style={{ fontSize: 10, color: 'var(--warning)', marginLeft: 4 }}>(prorated)</span>}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>₹{fmt(c.prorated ?? c.monthly)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  <span>Gross Salary</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>₹{fmt(entry.gross_salary)}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Deductions</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Employee PF (12% of Basic)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>− ₹{fmt(entry.employee_pf)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Employee ESI (0.75% of Gross)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>− ₹{fmt(entry.employee_esi)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 14, fontWeight: 700 }}>
                  <span>Net Pay</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>₹{fmt(entry.net_pay)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
                  Employer PF: ₹{fmt(entry.employer_pf)} | Employer ESI: ₹{fmt(entry.employer_esi)}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function PayrollRunDetailPage() {
  const { id: clientId, runId } = useParams();
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState(null);

  const fetchRun = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/clients/${clientId}/payroll/${runId}`);
      setRun(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payroll run');
    } finally {
      setLoading(false);
    }
  }, [clientId, runId]);

  useEffect(() => { fetchRun(); }, [fetchRun]);

  const handleFinalize = async () => {
    if (!window.confirm('Finalize this payroll run? This cannot be undone.')) return;
    setFinalizing(true);
    try {
      await api.post(`/clients/${clientId}/payroll/${runId}/finalize`);
      toast.success('Payroll finalized successfully!');
      fetchRun();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Finalization failed');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) return <div className="loading-page" style={{ minHeight: 400 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;
  if (error) return <div className="alert alert-danger" style={{ margin: 32 }}>{error}</div>;
  if (!run) return null;

  const t = run.totals;
  const periodLabel = `${MONTHS[run.month - 1]} ${run.year}`;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/clients/${clientId}/payroll`)}>
              <ArrowLeft size={14} /> Back
            </button>
            <span className={`badge ${run.status === 'FINALIZED' ? 'badge-success' : 'badge-warning'}`}>
              {run.status === 'FINALIZED' ? <CheckCircle size={11} /> : <Clock size={11} />}
              {run.status}
            </span>
          </div>
          <h1 className="page-title">Payroll — {periodLabel}</h1>
          <p className="page-subtitle">{selectedClient?.name} · Run by {run.run_by_user?.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/v1/clients/${clientId}/payroll/${runId}/export`}
            className="btn btn-secondary"
            download
          >
            <Download size={15} /> Export CSV
          </a>
          {run.status === 'DRAFT' && (
            <button className="btn btn-primary" onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? <span className="spinner" style={{ width: 15, height: 15 }} /> : <Lock size={15} />}
              Finalize
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Employees', value: t.employee_count },
          { label: 'Total Gross', value: `₹${fmt(t.total_gross)}`, color: 'var(--text-primary)' },
          { label: 'Emp PF', value: `₹${fmt(t.total_pf)}`, color: 'var(--danger)' },
          { label: 'Emp ESI', value: `₹${fmt(t.total_esi)}`, color: 'var(--danger)' },
          { label: 'Net Pay', value: `₹${fmt(t.total_net_pay)}`, color: 'var(--success)' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: 18, color: s.color, fontFamily: typeof s.value === 'string' ? 'var(--font-mono)' : undefined }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Employer contributions note */}
      <div className="alert alert-info" style={{ marginBottom: 20, fontSize: 13 }}>
        Employer PF: ₹{fmt(t.total_employer_pf)} | Employer ESI: ₹{fmt(t.total_employer_esi)}
        &nbsp;— These are the employer's cost additions on top of net pay.
      </div>

      {/* Employee table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="card-title">Employee-wise Breakdown</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>Click any row to expand</span>
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
              {run.entries.map((e) => <EntryRow key={e.id} entry={e} />)}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--accent-dim)', borderTop: '2px solid var(--accent)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-light)' }} colSpan={2}>Totals</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-light)' }}>₹{fmt(t.total_gross)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>₹{fmt(t.total_pf)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--danger)' }}>₹{fmt(t.total_esi)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>₹{fmt(t.total_net_pay)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
