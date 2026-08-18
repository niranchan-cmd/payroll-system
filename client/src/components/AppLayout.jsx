import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClient } from '../context/ClientContext';
import {
  LayoutDashboard, Building2, Users, LogOut, ChevronRight,
  X, Settings, Play, FileUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/clients', icon: Building2, label: 'Clients' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { selectedClient, clearClient } = useClient();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    await logout();
    toast.success('Logged out.');
    navigate('/login');
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">P</div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">PayrollOS</span>
            <span className="sidebar-logo-sub">Management Suite</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Navigation</span>

          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" size={18} />
              {label}
            </NavLink>
          ))}

          {selectedClient && (
            <>
              <span className="nav-section-label" style={{ marginTop: 8 }}>
                Active Client
              </span>
              <NavLink
                to={`/clients/${selectedClient.id}`}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Settings className="nav-icon" size={18} />
                Setup
              </NavLink>
              <NavLink
                to={`/clients/${selectedClient.id}/structure`}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <ChevronRight className="nav-icon" size={18} />
                CTC Structure
              </NavLink>
              <NavLink
                to={`/clients/${selectedClient.id}/employees`}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Users className="nav-icon" size={18} />
                Employees
              </NavLink>
              <NavLink
                to={`/clients/${selectedClient.id}/payroll`}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Play className="nav-icon" size={18} />
                Payroll Runs
              </NavLink>
              <NavLink
                to={`/clients/${selectedClient.id}/employees/import`}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <FileUp className="nav-icon" size={18} />
                Bulk Import
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--accent-dim)',
                color: 'var(--accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', truncate: true }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user?.role?.replace('_', ' ')}
              </div>
            </div>
            <button
              className="btn btn-icon btn-ghost btn-icon-sm"
              onClick={handleLogout}
              data-tooltip="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            {selectedClient && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>Client:</span>
                <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>
                  {selectedClient.name}
                </span>
              </>
            )}
          </div>

          {selectedClient && (
            <div className="client-banner" style={{ marginLeft: 'auto' }}>
              <div className="client-banner-dot" />
              <span>{selectedClient.name}</span>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={clearClient}
                data-tooltip="Switch client"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
