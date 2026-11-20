import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Shield, Users, Building2, Activity, UserPlus, CheckCircle2,
  XCircle, Clock, DollarSign, FileSpreadsheet, Lock, RefreshCw, X
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'clients' | 'audit'

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Create User Modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN',
  });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [statsRes, usersRes, clientsRes, auditRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/clients-summary'),
        api.get('/admin/audit-logs'),
      ]);
      setStats(statsRes.data.data);
      setUsersList(usersRes.data.data);
      setClientsList(clientsRes.data.data);
      setAuditLogs(auditRes.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleUserStatus(targetUser) {
    const newStatus = !targetUser.is_active;
    const confirmMsg = newStatus
      ? `Re-activate ${targetUser.name}?`
      : `Suspend ${targetUser.name}? They will not be able to log in.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/admin/users/${targetUser.id}`, { is_active: newStatus });
      toast.success(`User ${newStatus ? 'activated' : 'suspended'}.`);
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: newStatus } : u))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user.');
    }
  }

  async function handleChangeRole(targetUser, newRole) {
    try {
      await api.patch(`/admin/users/${targetUser.id}`, { role: newRole });
      toast.success(`Role updated to ${newRole.replace('_', ' ')}.`);
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change role.');
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const res = await api.post('/admin/users', createUserForm);
      toast.success('User account created!');
      setShowAddUserModal(false);
      setCreateUserForm({ name: '', email: '', password: '', role: 'ADMIN' });
      setUsersList((prev) => [res.data.data, ...prev]);
      if (stats) setStats({ ...stats, totalUsers: stats.totalUsers + 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setCreatingUser(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Loading Admin Center...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* ── Page Header ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 24, margin: 0 }}>Admin Panel</h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(79, 110, 247, 0.15)',
                color: 'var(--accent-light)',
                letterSpacing: '0.04em',
              }}
            >
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
            System-wide oversight, user access controls, client distribution, and audit activity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadAllData}
            title="Refresh statistics"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddUserModal(true)}
          >
            <UserPlus size={15} /> Add User
          </button>
        </div>
      </div>

      {/* ── KPI Stats Cards ───────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Total Users</span>
            <Users size={18} color="var(--accent-light)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {stats?.totalUsers || 0}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
            Super Admins, Admins & Viewers
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Active Clients</span>
            <Building2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {stats?.totalClients || 0}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
            Configured client organizations
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Active Employees</span>
            <Users size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {stats?.totalEmployees || 0}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
            Across all onboarded clients
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Payroll Runs</span>
            <FileSpreadsheet size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {stats?.totalPayrollRuns || 0}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
            {stats?.finalizedRuns || 0} finalized · {stats?.draftRuns || 0} in draft
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Total Net Disbursed</span>
            <DollarSign size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            ₹{Number(stats?.totalNetDisbursed || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
            Finalized payrolls to date
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ───────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 20,
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'overview' ? 600 : 500,
            fontSize: 14,
            padding: '10px 16px',
            cursor: 'pointer',
          }}
        >
          Clients Summary ({clientsList.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'users' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'users' ? 600 : 500,
            fontSize: 14,
            padding: '10px 16px',
            cursor: 'pointer',
          }}
        >
          User Management ({usersList.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'audit' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'audit' ? 600 : 500,
            fontSize: 14,
            padding: '10px 16px',
            cursor: 'pointer',
          }}
        >
          System Audit Feed ({auditLogs.length})
        </button>
      </div>

      {/* ── TAB 1: Clients Overview ───────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Client Organizations Overview</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', textAlign: 'left', fontSize: 12 }}>
                  <th style={{ padding: '12px 16px' }}>Client Name</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Employees</th>
                  <th style={{ padding: '12px 16px' }}>CTC Version</th>
                  <th style={{ padding: '12px 16px' }}>Latest Payroll</th>
                  <th style={{ padding: '12px 16px' }}>Total Runs</th>
                </tr>
              </thead>
              <tbody>
                {clientsList.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <a href={`/clients/${c.id}`} style={{ color: 'var(--accent-light)', textDecoration: 'none' }}>
                        {c.name}
                      </a>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: c.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: c.is_active ? '#10b981' : '#ef4444',
                        }}
                      >
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{c.employee_count}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge">{c.active_structure}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {c.latest_run ? (
                        <span style={{ fontSize: 12 }}>
                          {c.latest_run.month}/{c.latest_run.year}{' '}
                          <span
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: c.latest_run.status === 'FINALIZED' ? '#10b98122' : '#f59e0b22',
                              color: c.latest_run.status === 'FINALIZED' ? '#10b981' : '#f59e0b',
                              fontWeight: 600,
                            }}
                          >
                            {c.latest_run.status}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No runs yet</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{c.payroll_runs_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: User Management ─────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ fontSize: 16, margin: 0 }}>System Users & Role Access</h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddUserModal(true)}
            >
              <UserPlus size={14} /> Add User
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', textAlign: 'left', fontSize: 12 }}>
                  <th style={{ padding: '12px 16px' }}>Name & Email</th>
                  <th style={{ padding: '12px 16px' }}>Role</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Activity (Runs/Revisions)</th>
                  <th style={{ padding: '12px 16px' }}>Created</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u, e.target.value)}
                        disabled={u.id === user.id}
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                      >
                        <option value="SUPER_ADMIN">SUPER ADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: u.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: u.is_active ? '#10b981' : '#ef4444',
                        }}
                      >
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                      {u._count?.payroll_runs || 0} runs · {u._count?.salary_changes || 0} revisions
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {u.id !== user.id && (
                        <button
                          className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={() => handleToggleUserStatus(u)}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: System Audit Feed ──────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>Audit Trail & Security Activity</h2>
          {auditLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No audit records found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: log.type === 'PAYROLL_RUN' ? 'rgba(79, 110, 247, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: log.type === 'PAYROLL_RUN' ? 'var(--accent-light)' : '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {log.type === 'PAYROLL_RUN' ? <FileSpreadsheet size={16} /> : <DollarSign size={16} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {log.title}
                      </span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      {log.description}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--accent-light)', marginTop: 4 }}>
                      By: <strong>{log.user}</strong> {log.userEmail && `(${log.userEmail})`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create User Modal ─────────────────────────────────────── */}
      {showAddUserModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 440, padding: 24, position: 'relative' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Add New User Account</h2>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => setShowAddUserModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sarah Jenkins"
                  value={createUserForm.name}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address <span className="required">*</span></label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@company.com"
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Password <span className="required">*</span></label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role Assignment <span className="required">*</span></label>
                <select
                  className="form-input"
                  value={createUserForm.role}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                >
                  <option value="ADMIN">ADMIN (Manage payroll & clients)</option>
                  <option value="VIEWER">VIEWER (Read-only access)</option>
                  {user?.role === 'SUPER_ADMIN' && (
                    <option value="SUPER_ADMIN">SUPER ADMIN (Full system access)</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddUserModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={creatingUser}
                >
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
