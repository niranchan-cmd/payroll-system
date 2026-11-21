import { useInactivityLogout } from '../hooks/useInactivityLogout';
import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClient } from '../context/ClientContext';
import {
  LayoutDashboard, Building2, Users, LogOut, ChevronRight, Shield,
  X, Settings, Play, FileUp, FileSpreadsheet, Lock, Menu, Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeSelector from './ThemeSelector';
import ChangePasswordModal from './ChangePasswordModal';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/clients', icon: Building2, label: 'Clients' },
  { to: '/reports', icon: FileSpreadsheet, label: 'Pay Register & Reports' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { selectedClient, clearClient } = useClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Auto-logout after 30 minutes of inactivity
  useInactivityLogout(logout, navigate);

  async function handleLogout() {
    await logout();
    toast.success('Logged out.');
    navigate('/login');
  }

  function handleNavClick() {
    setMobileSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      {/* ── Mobile Backdrop Overlay ────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="sidebar-logo-icon" style={{ backgroundColor: "#023326", color: "#10B981", fontWeight: 900 }}>P</div>
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-title">Ploy.pe</span>
              <span className="sidebar-logo-sub">by NH Associates</span>
            </div>
          </div>
          <button
            className="mobile-close-sidebar-btn"
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Navigation</span>

          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
            <NavLink
              to="/admin"
              onClick={handleNavClick}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Shield className="nav-icon" size={18} />
              Admin Panel
            </NavLink>
          )}

          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={handleNavClick}
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
                onClick={handleNavClick}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Settings className="nav-icon" size={18} />
                Setup
              </NavLink>
              <NavLink
                to={`/clients/${selectedClient.id}/structure`}
                onClick={handleNavClick}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <ChevronRight className="nav-icon" size={18} />
                CTC Structure
              </NavLink>
              <NavLink
                to={`/clients/${selectedClient.id}/employees`}
                onClick={handleNavClick}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Users className="nav-icon" size={18} />
                Employees
              </NavLink>
              <NavLink
                to={`/clients/${selectedClient.id}/hr`}
                onClick={handleNavClick}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Briefcase className="nav-icon" size={18} />
                HR Operations
              </NavLink>
              <NavLink
                to={`/clients/${selectedClient.id}/payroll`}
                onClick={handleNavClick}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Play className="nav-icon" size={18} />
                Payroll Runs
              </NavLink>
              <NavLink
                to={`/clients/${selectedClient.id}/employees/import`}
                onClick={handleNavClick}
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
              onClick={() => setShowChangePassModal(true)}
              data-tooltip="Change Password"
            >
              <Lock size={14} />
            </button>
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
          <button
            className="topbar-mobile-toggle"
            onClick={() => setMobileSidebarOpen((prev) => !prev)}
            aria-label="Toggle navigation drawer"
          >
            <Menu size={20} />
          </button>

          <div className="topbar-breadcrumb">
            {selectedClient ? (
              <>
                <span style={{ color: 'var(--text-muted)' }}>Client:</span>
                <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>
                  {selectedClient.name}
                </span>
              </>
            ) : (
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                Command Center
              </span>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeSelector />
            {selectedClient && (
              <div className="client-banner">
                <div className="client-banner-dot" />
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedClient.name}
                </span>
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
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {/* Change Password Modal */}
      {showChangePassModal && (
        <ChangePasswordModal
          isOpen={showChangePassModal}
          onClose={() => setShowChangePassModal(false)}
        />
      )}
    </div>
  );
}
