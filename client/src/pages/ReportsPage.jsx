import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useClient } from '../context/ClientContext';
import {
  FileText, Download, Filter, Search, Building2, Calendar,
  TrendingUp, Users, DollarSign, ShieldCheck, ChevronDown,
  ChevronRight, RefreshCw, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = [
  { value: 'all', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

export default function ReportsPage() {
  const { clients, selectedClient } = useClient();
  const [data, setData] = useState({ runs: [], grand_totals: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [clientFilter, setClientFilter] = useState(selectedClient?.id || 'all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedRuns, setCollapsedRuns] = useState({});

  // Sync if selected client context changes
  useEffect(() => {
    if (selectedClient?.id) {
      setClientFilter(selectedClient.id);
    }
  }, [selectedClient]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        clientId: clientFilter,
        month: monthFilter,
        year: yearFilter,
        status: statusFilter,
        search: searchQuery,
      };
      const res = await api.get('/reports/pay-register', { params });
      setData(res.data.data || { runs: [], grand_totals: {} });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pay register report.');
    } finally {
      setLoading(false);
    }
  }, [clientFilter, monthFilter, yearFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const toggleRun = (runId) => {
    setCollapsedRuns((prev) => ({ ...prev, [runId]: !prev[runId] }));
  };

  const handleExportCSV = () => {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
    const query = new URLSearchParams({
      clientId: clientFilter,
      month: monthFilter,
      year: yearFilter,
      status: statusFilter,
    }).toString();
    window.open(`${baseURL}/api/v1/reports/pay-register/export?${query}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return ['all', currentYear - 1, currentYear, currentYear + 1];
  }, []);

  const totals = data.grand_totals || {};

  return (
    <div className="reports-container">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Pay Register & Salary Reports</h1>
          <p className="page-subtitle">
            Comprehensive month-wise and client-wise payroll audit sheets, deductions, and statutory register
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrint}
            title="Print report"
          >
            <Printer size={15} /> Print
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportCSV}
            title="Download CSV report"
          >
            <Download size={15} /> Export Pay Register (CSV)
          </button>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            alignItems: 'end',
          }}
        >
          {/* Client Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11.5 }}>
              <Building2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Client
            </label>
            <select
              className="form-select"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option value="all">🏢 All Clients</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11.5 }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} /> Month
            </label>
            <select
              className="form-select"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11.5 }}>Year</label>
            <select
              className="form-select"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y === 'all' ? 'All Years' : y}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11.5 }}>Status</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="FINALIZED">Finalized Only</option>
              <option value="DRAFT">Drafts Only</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11.5 }}>Search Employee</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Name, Roll No, Dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 32 }}
              />
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* ── Executive Summary KPI Cards ─────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div className="stat-card">
          <div className="stat-label">Total Net Payout</div>
          <div
            className="stat-value"
            style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}
          >
            ₹{fmt(totals.total_net_pay)}
          </div>
          <div className="stat-sub">Take-home disbursed</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Gross Salary</div>
          <div
            className="stat-value"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
          >
            ₹{fmt(totals.total_gross)}
          </div>
          <div className="stat-sub">Basic: ₹{fmt(totals.total_basic)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Employee Deductions</div>
          <div
            className="stat-value"
            style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}
          >
            ₹{fmt(totals.total_deductions)}
          </div>
          <div className="stat-sub">
            PF: ₹{fmt(totals.total_employee_pf)} | ESI: ₹{fmt(totals.total_employee_esi)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Employer Contributions</div>
          <div
            className="stat-value"
            style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}
          >
            ₹{fmt(totals.total_employer_pf + totals.total_employer_esi)}
          </div>
          <div className="stat-sub">
            PF: ₹{fmt(totals.total_employer_pf)} | ESI: ₹{fmt(totals.total_employer_esi)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Company CTC Cost</div>
          <div
            className="stat-value"
            style={{ color: 'var(--accent-light)', fontFamily: 'var(--font-mono)' }}
          >
            ₹{fmt(totals.total_ctc_cost)}
          </div>
          <div className="stat-sub">
            {totals.total_employees || 0} employees across {totals.total_runs || 0} runs
          </div>
        </div>
      </div>

      {/* ── Main Reports Section ─────────────────────────────── */}
      {loading ? (
        <div className="loading-page" style={{ minHeight: 300 }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Generating pay register report...</p>
        </div>
      ) : data.runs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FileText size={32} /></div>
          <div className="empty-title">No Payroll Records Found</div>
          <p className="empty-desc">
            No payroll runs match the selected client, month, and year filters. Run payroll or adjust your filter selection.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {data.runs.map((run) => {
            const isCollapsed = collapsedRuns[run.id];
            const rTotals = run.totals;

            return (
              <div
                key={run.id}
                className="card"
                style={{ padding: 0, overflow: 'hidden' }}
              >
                {/* Run Section Header */}
                <div
                  onClick={() => toggleRun(run.id)}
                  style={{
                    padding: '16px 20px',
                    background: 'var(--bg-elevated)',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {run.client.name}
                        </span>
                        <span className="badge badge-muted" style={{ fontSize: 11 }}>
                          {run.period_label}
                        </span>
                        <span
                          className={`badge ${run.status === 'FINALIZED' ? 'badge-success' : 'badge-warning'}`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {rTotals.count} employees · Processed by {run.run_by || 'Admin'}
                      </div>
                    </div>
                  </div>

                  {/* Summary pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Gross
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        ₹{fmt(rTotals.gross)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Net Pay
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--success)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        ₹{fmt(rTotals.net_pay)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Breakdown */}
                {!isCollapsed && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-surface)' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Roll No</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Employee</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Dept</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Paid Days</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Basic</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>HRA</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Other Allw.</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Gross Salary</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Emp PF (12%)</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Emp ESI</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Total Ded.</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--success)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Net Pay</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Employer PF</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>Total CTC Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {run.entries.map((entry) => (
                          <tr
                            key={entry.id}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              transition: 'background 120ms',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                          >
                            <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                              {entry.roll_no}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {entry.name}
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                                {entry.designation} · <span className="badge badge-muted" style={{ padding: '1px 5px', fontSize: 10 }}>{entry.tax_regime}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                              {entry.department}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
                              {entry.is_prorated ? (
                                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                                  {entry.days_worked}/{entry.total_days}*
                                </span>
                              ) : (
                                <span>{entry.total_days}d</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                              ₹{fmt(entry.basic)}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                              ₹{fmt(entry.hra)}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                              ₹{fmt(entry.other_allowances)}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              ₹{fmt(entry.gross_salary)}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                              ₹{fmt(entry.employee_pf)}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                              ₹{fmt(entry.employee_esi)}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)', fontWeight: 600 }}>
                              ₹{fmt(entry.total_deductions)}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)', fontSize: 13.5 }}>
                              ₹{fmt(entry.net_pay)}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              ₹{fmt(entry.employer_pf)}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-light)' }}>
                              ₹{fmt(entry.total_ctc_cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr
                          style={{
                            background: 'var(--accent-dim)',
                            borderTop: '2px solid var(--border-active)',
                            fontWeight: 700,
                          }}
                        >
                          <td colSpan={4} style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>
                            Subtotal ({run.client.name} - {run.period_label})
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            ₹{fmt(rTotals.basic)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            —
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            —
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                            ₹{fmt(rTotals.gross)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                            ₹{fmt(rTotals.employee_pf)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                            ₹{fmt(rTotals.employee_esi)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                            ₹{fmt(rTotals.total_deductions)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                            ₹{fmt(rTotals.net_pay)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            ₹{fmt(rTotals.employer_pf)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-light)' }}>
                            ₹{fmt(rTotals.total_ctc_cost)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
