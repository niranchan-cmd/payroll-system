import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Edit, History, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

function fmtINR(n) {
  if (n === null || n === undefined) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(d) {
  if (!d) return 'Present';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/employees/${id}`)
      .then((r) => setData(r.data.data))
      .catch(() => toast.error('Failed to load employee'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>;
  if (!data) return <div className="empty-state"><div className="empty-title">Employee not found</div></div>;

  const { employee, salaryBreakdown } = data;
  const currentHistory = employee.salary_histories?.find((h) => !h.effective_to);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52,
              background: 'var(--accent-dim)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent-light)',
              fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-heading)',
            }}>
              {employee.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="page-title" style={{ fontSize: 20 }}>{employee.name}</h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                {employee.designation} {employee.department && `· ${employee.department}`}
              </p>
            </div>
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/employees/${id}/revise`)}
        >
          <TrendingUp size={15} /> Revise CTC
        </button>
      </div>

      <div className="profile-grid">
        <div>
          {/* Basic Info */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Employee Details</div>
              <span className="badge badge-success">Active</span>
            </div>
            <div>
              {[
                ['Employee Name', employee.name],
                ['Roll No', <code style={{ fontSize: 12.5, background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4 }}>{employee.roll_no}</code>],
                ['Designation', employee.designation],
                ['Department', employee.department || '—'],
                ['Email', employee.email || '—'],
                ['Start Date', fmtDate(employee.start_date)],
                ['Tax Regime', <span className={`tag ${employee.tax_regime === 'OLD' ? 'tag-old' : 'tag-new'}`}>{employee.tax_regime} Regime</span>],
                ['Client', employee.client?.name],
              ].map(([key, val]) => (
                <div key={key} className="info-row">
                  <span className="info-key">{key}</span>
                  <span className="info-val">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Salary Breakdown */}
          {salaryBreakdown && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Monthly Salary Breakdown</div>
                  {currentHistory && (
                    <div className="card-subtitle">
                      Structure: {currentHistory.structure_version?.version_name} · Effective {fmtDate(currentHistory.effective_from)}
                    </div>
                  )}
                </div>
              </div>
              <table className="salary-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Component</th>
                    <th>Monthly</th>
                    <th>Annual</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryBreakdown.includedComponents?.map((c) => (
                    <tr key={c.name}>
                      <td>{c.name}</td>
                      <td><span className="amount">{fmtINR(c.monthly)}</span></td>
                      <td><span className="amount">{fmtINR(c.annual)}</span></td>
                    </tr>
                  ))}
                  <tr className="subtotal">
                    <td>CTC Sub Total</td>
                    <td><span className="amount">{fmtINR(salaryBreakdown.monthlyCTC)}</span></td>
                    <td><span className="amount">{fmtINR(salaryBreakdown.annualCTC)}</span></td>
                  </tr>
                  {salaryBreakdown.addedOnTopComponents?.map((c) => (
                    <tr key={c.name} className="added-on-top">
                      <td>{c.name} <span style={{ fontSize: 10, color: 'var(--warning)', marginLeft: 6 }}>(+top)</span></td>
                      <td><span className="amount">{fmtINR(c.monthly)}</span></td>
                      <td><span className="amount">{fmtINR(c.annual)}</span></td>
                    </tr>
                  ))}
                  <tr className="total">
                    <td>Total Cost to Company</td>
                    <td><span className="amount">{fmtINR(salaryBreakdown.monthlyTotalCostToCompany)}</span></td>
                    <td><span className="amount">{fmtINR(salaryBreakdown.annualTotalCostToCompany)}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Salary History */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={16} style={{ color: 'var(--text-muted)' }} />
                <div className="card-title">Salary History</div>
              </div>
              <span className="badge badge-muted">{employee.salary_histories?.length || 0} records</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Effective Period</th>
                    <th>Annual CTC</th>
                    <th>Structure</th>
                    <th>Reason</th>
                    <th>Changed By</th>
                  </tr>
                </thead>
                <tbody>
                  {(employee.salary_histories || []).map((h) => (
                    <tr key={h.id}>
                      <td>
                        <span style={{ fontSize: 12.5 }}>
                          {fmtDate(h.effective_from)} → {h.effective_to ? fmtDate(h.effective_to) : <span className="badge badge-success" style={{ fontSize: 10, padding: '1px 6px' }}>Current</span>}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {fmtINR(h.annual_ctc)}
                      </td>
                      <td>
                        <span className="badge badge-accent">{h.structure_version?.version_name}</span>
                      </td>
                      <td>
                        <span className="badge badge-muted" style={{ fontSize: 10 }}>
                          {h.change_reason?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="td-muted">{h.created_by_user?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 84 }}>
            <div className="card-title" style={{ marginBottom: 16 }}>Current CTC</div>
            {currentHistory ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Annual CTC</div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                    {fmtINR(currentHistory.annual_ctc)}
                  </div>
                </div>
                {salaryBreakdown && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Cost to Company</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-light)' }}>
                      {fmtINR(salaryBreakdown.annualTotalCostToCompany)}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      incl. employer contributions
                    </div>
                  </div>
                )}
                <hr className="divider" />
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <div>Structure: <strong style={{ color: 'var(--text-secondary)' }}>{currentHistory.structure_version?.version_name}</strong></div>
                  <div style={{ marginTop: 4 }}>Effective: <strong style={{ color: 'var(--text-secondary)' }}>{fmtDate(currentHistory.effective_from)}</strong></div>
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No salary record found</p>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 20 }}
              onClick={() => navigate(`/employees/${id}/revise`)}
            >
              <TrendingUp size={15} /> Revise CTC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
