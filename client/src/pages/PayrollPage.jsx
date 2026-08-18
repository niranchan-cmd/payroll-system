import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import api from '../services/api';
import {
  Play, CheckCircle, Clock, Download, ChevronRight, Plus, Calendar, Users, DollarSign
} from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

export default function PayrollPage() {
  const navigate = useNavigate();
  const { selectedClient } = useClient();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRuns = useCallback(async () => {
    if (!selectedClient) return;
    try {
      setLoading(true);
      const res = await api.get(`/clients/${selectedClient.id}/payroll`);
      setRuns(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payroll runs');
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  if (!selectedClient) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Calendar size={28} /></div>
        <div className="empty-title">No Client Selected</div>
        <p className="empty-desc">Select a client from the dashboard to manage payroll.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Payroll Runs</h1>
          <p className="page-subtitle">{selectedClient.name} — Monthly payroll history</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(`/clients/${selectedClient.id}/payroll/run`)}>
          <Plus size={16} /> Run Payroll
        </button>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 24 }}>{error}</div>}

      {loading ? (
        <div className="loading-page" style={{ minHeight: 300 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : runs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Play size={28} /></div>
          <div className="empty-title">No payroll runs yet</div>
          <p className="empty-desc">Run your first payroll to compute net pay, PF, and ESI for all active employees.</p>
          <button className="btn btn-primary" onClick={() => navigate(`/clients/${selectedClient.id}/payroll/run`)}>
            <Plus size={16} /> Run First Payroll
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Period</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Status</th>
                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Employees</th>
                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Run By</th>
                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  style={{ cursor: 'pointer', transition: 'background 150ms' }}
                  onClick={() => navigate(`/clients/${selectedClient.id}/payroll/${run.id}`)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '16px 20px', fontWeight: 700, fontFamily: 'var(--font-heading)', fontSize: 14 }}>
                    {MONTHS[run.month - 1]} {run.year}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span className={`badge ${run.status === 'FINALIZED' ? 'badge-success' : 'badge-warning'}`}>
                      {run.status === 'FINALIZED' ? <CheckCircle size={11} /> : <Clock size={11} />}
                      {run.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    {run._count?.entries ?? '—'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: 13 }}>
                    {run.run_by_user?.name || '—'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <a
                        href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/v1/clients/${selectedClient.id}/payroll/${run.id}/export`}
                        className="btn btn-secondary btn-sm"
                        download
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download size={13} /> CSV
                      </a>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/clients/${selectedClient.id}/payroll/${run.id}`); }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
