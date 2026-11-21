import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClient } from '../context/ClientContext';
import {
  LayoutDashboard, Building2, Users, FileSpreadsheet, Settings,
  Shield, Play, Layers, FileUp, ArrowLeft, X, LogOut, Lock
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose, onOpenChangePassword }) {
  const { user, logout } = useAuth();
  const { selectedClient } = useClient();
  const location = useLocation();

  // Detect whether currently inside a client workspace
  const clientMatch = location.pathname.match(/^\/clients\/([^/]+)/);
  const activeClientId = clientMatch?.[1];
  const isClientScope = Boolean(activeClientId && activeClientId !== 'new');

  // Check admin authorization
  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

  // Global Navigation Links
  const globalNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/clients', icon: Building2, label: 'Clients', exact: true },
    { to: '/employees', icon: Users, label: 'Employees', exact: true },
    { to: '/payroll', icon: Play, label: 'Payroll Hub', exact: true },
    { to: '/reports', icon: FileSpreadsheet, label: 'Pay Register & Reports', exact: true },
    { to: '/settings', icon: Settings, label: 'Settings', exact: true },
  ];

  if (isAdmin) {
    globalNavItems.push({
      to: '/admin',
      icon: Shield,
      label: 'Admin Panel',
      exact: false,
    });
  }

  // Client-Scoped Navigation Links
  const clientNavItems = isClientScope ? [
    { to: `/clients/${activeClientId}`, icon: Building2, label: 'Overview', exact: true },
    { to: `/clients/${activeClientId}/structure`, icon: Layers, label: 'CTC Structure', exact: false },
    { to: `/clients/${activeClientId}/employees`, icon: Users, label: 'Employees', exact: true },
    { to: `/clients/${activeClientId}/payroll`, icon: Play, label: 'Payroll Runs', exact: false },
    { to: `/clients/${activeClientId}/employees/import`, icon: FileUp, label: 'Bulk Import', exact: true },
  ] : [];

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">NH</div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">Ploye.pe</span>
            <span className="sidebar-logo-sub">by NH Associates</span>
          </div>
          {isOpen && (
            <button className="mobile-close-btn" onClick={onClose} aria-label="Close menu">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Body */}
        <nav className="sidebar-nav">
          <span className="nav-section-label">Main Menu</span>
          {globalNavItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={onClose}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" size={18} />
              {label}
            </NavLink>
          ))}

          {/* Client-Scoped Mode */}
          {isClientScope && (
            <div className="sidebar-client-section">
              <span className="nav-section-label" style={{ marginTop: 12 }}>
                Client Workspace
              </span>

              {/* Client Context Card */}
              <div className="client-context-card">
                <div className="client-context-header">
                  <span className="client-context-tag">Active Client</span>
                  {selectedClient?.state && (
                    <span className="badge badge-sm badge-accent">{selectedClient.state}</span>
                  )}
                </div>
                <div className="client-context-name" title={selectedClient?.name}>
                  {selectedClient?.name || 'Loading client...'}
                </div>
                {selectedClient?.pan && (
                  <div className="client-context-meta">
                    PAN: {selectedClient.pan}
                  </div>
                )}
                <div className="client-context-actions">
                  <NavLink to="/clients" onClick={onClose} className="client-context-switch">
                    <ArrowLeft size={12} />
                    <span>All Clients</span>
                  </NavLink>
                </div>
              </div>

              {/* Client Sub-Links */}
              {clientNavItems.map(({ to, icon: Icon, label, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  onClick={onClose}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon className="nav-icon" size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* User Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role?.replace('_', ' ')}</div>
            </div>
            <button
              className="btn btn-icon btn-ghost btn-icon-sm"
              onClick={onOpenChangePassword}
              data-tooltip="Change Password"
            >
              <Lock size={14} />
            </button>
            <button
              className="btn btn-icon btn-ghost btn-icon-sm"
              onClick={logout}
              data-tooltip="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop Overlay */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
    </>
  );
}
