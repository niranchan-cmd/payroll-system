import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useClient } from '../context/ClientContext';
import {
  Play, CheckCircle2, Clock, Calendar, AlertCircle,
  Building2, ChevronRight, DollarSign, Layers, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';

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

export default function PayrollHubPage() {
  const navigate = useNavigate();
  const { clients: ctxClients, fetchClients } = useClient();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [clients, setClients] = useState([]);
  const [clientStatuses, setClientStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load clients list
  useEffect(() => {
    async function initClients() {
      if (ctxClients && ctxClients.length > 0) {
        setClients(ctxClients);
      } else if (fetchClients) {
        const list = await fetchClients();
        setClients(list || []);
      } else {
        try {
          const res = await api.get('/clients');
          setClients(res.data?.data || []);
        } catch {
          // ignore
        }
      }
    }
    initClients();
  }, [ctxClients, fetchClients]);

  // Load payroll statuses for selected month/year
  const fetchMonthStatuses = useCallback(async () => {
    if (clients.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        clients.map(async (client) => {
          try {
            const res = await api.get(`/clients/${client.id}/payroll`);
            const runs = res.data?.data || [];
            const match = runs.find(
              (r) => Number(r.month) === Number(selectedMonth) && Number(r.year) === Number(selectedYear)
            );

            return {
              client,
              run: match || null,
              status: match ? match.status : 'NOT_STARTED',
              entryCount: match?._count?.entries ?? match?.entries?.length ?? 0,
              netPay: match?.total_net_pay ?? match?.net_pay ?? null,
            };
          } catch {
            return {
              client,
              run: null,
              status: 'NOT_STARTED',
              entryCount: 0,
              netPay: null,
            };
          }
        })
      );
      setClientStatuses(results);
    } catch {
      toast.error('Failed to load payroll overview');
    } finally {
      setLoading(false);
    }
  }, [clients, selectedMonth, selectedYear]);

  useEffect(() => {
    if (clients.length > 0) {
      fetchMonthStatuses();
    }
  }, [clients, fetchMonthStatuses]);

  // Aggregate stats
  const stats = useMemo(() => {
    let finalized = 0;
    let draft = 0;
    let notStarted = 0;
    let totalDisbursed = 0;

    clientStatuses.forEach((cs) => {
      if (cs.status === 'FINALIZED') {
        finalized++;
        if (cs.netPay) totalDisbursed += Number(cs.netPay);
      } else if (cs.status === 'DRAFT') {
        draft++;
        if (cs.netPay) totalDisbursed += Number(cs.netPay);
      } else {
        notStarted++;
      }
    });

    return {
      totalClients: clientStatuses.length,
      finalized,
      draft,
      notStarted,
      totalDisbursed,
    };
  }, [clientStatuses]);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Payroll Hub</h1>
          <p className="page-subtitle">
            Cross-client payroll processing center and monthly cycle governance
          </p>
        </div>

        {/* Period Selector */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            className="form-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{ width: 'auto', fontWeight: 600 }}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ width: 'auto', fontWeight: 600 }}
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Active Clients</span>
            <div className="stat-card-icon"><Building2 size={18} /></div>
          </div>
          <div className="stat-card-value">{stats.totalClients}</div>
          <span className="stat-card-subtitle">Covered in cycle</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Finalized Runs</span>
            <div className="stat-card-icon"><CheckCircle2 size={18} /></div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--success)' }}>
            {stats.finalized}
          </div>
          <span className="stat-card-subtitle">
            {stats.totalClients > 0 ? `${Math.round((stats.finalized / stats.totalClients) * 100)}% complete` : '—'}
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">In-Progress Drafts</span>
            <div className="stat-card-icon"><Clock size={18} /></div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--warning)' }}>
            {stats.draft}
          </div>
          <span className="stat-card-subtitle">Pending approval / review</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Pending / Not Started</span>
            <div className="stat-card-icon"><AlertCircle size={18} /></div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--danger)' }}>
            {stats.notStarted}
          </div>
          <span className="stat-card-subtitle">Requires execution</span>
        </div>
      </div>

      {/* Cross-Client Status Table */}
      {loading ? (
        <div className="loading-page" style={{ minHeight: 300 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 10 }}>Loading cycle status...</p>
        </div>
      ) : clientStatuses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Building2 size={28} /></div>
          <div className="empty-title">No client organizations found</div>
          <p className="empty-desc">Create your first client to start processing payroll runs.</p>
          <button className="btn btn-primary" onClick={() => navigate('/clients')}>
            Go to Clients
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '14px 20px',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>
              Status for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {clientStatuses.length} organizations
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Client Organization</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>State & PAN</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Payroll Cycle</th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Status</th>
                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Processed</th>
                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {clientStatuses.map(({ client, run, status, entryCount }) => (
                <tr
                  key={client.id}
                  style={{ transition: 'background 150ms' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>
                      {client.name}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: 11.5,
                          color: 'var(--accent-light)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2
                        }}
                        onClick={() => navigate(`/clients/${client.id}/payroll`)}
                      >
                        All Runs <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{client.state || '—'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {client.pan ? `PAN: ${client.pan}` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    {client.payroll_cutoff ? `Cutoff: ${client.payroll_cutoff}th` : 'Monthly'}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    {status === 'FINALIZED' && (
                      <span className="badge badge-success">
                        <CheckCircle2 size={11} /> FINALIZED
                      </span>
                    )}
                    {status === 'DRAFT' && (
                      <span className="badge badge-warning">
                        <Clock size={11} /> DRAFT
                      </span>
                    )}
                    {status === 'NOT_STARTED' && (
                      <span className="badge badge-secondary" style={{ opacity: 0.8 }}>
                        NOT STARTED
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    {entryCount > 0 ? `${entryCount} emps` : '—'}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {status === 'NOT_STARTED' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/clients/${client.id}/payroll/run?month=${selectedMonth}&year=${selectedYear}`)}
                        >
                          <Play size={13} /> Run Payroll
                        </button>
                      )}
                      {status === 'DRAFT' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/clients/${client.id}/payroll/run?month=${selectedMonth}&year=${selectedYear}`)}
                        >
                          <Clock size={13} /> Continue Draft
                        </button>
                      )}
                      {status === 'FINALIZED' && run && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/clients/${client.id}/payroll/${run.id}`)}
                        >
                          View Summary
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`/clients/${client.id}/payroll`)}
                        title="View client payroll history"
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
