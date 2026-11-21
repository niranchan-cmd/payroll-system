import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useClient } from '../../context/ClientContext';
import {
  Shield, Users, Settings, FileText, CheckCircle2,
  AlertTriangle, Lock, Building2
} from 'lucide-react';

export default function AdminPlaceholderPage() {
  const { user } = useAuth();
  const { clients } = useClient();
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Statutory Limits & Settings', icon: Settings },
    { id: 'logs', label: 'Audit Logs', icon: FileText },
    { id: 'payroll', label: 'Payroll Governance', icon: Shield },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Admin Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">Administration Console</h1>
            <span className="badge badge-accent">
              <Shield size={12} style={{ marginRight: 4 }} />
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <p className="page-subtitle">
            System configuration, statutory settings, user permissions, and compliance audit trail.
          </p>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Authorized Admin</span>
            <div className="stat-card-icon"><Shield size={18} /></div>
          </div>
          <div className="stat-card-value" style={{ fontSize: 20 }}>{user?.name}</div>
          <span className="stat-card-subtitle">{user?.email}</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Managed Organizations</span>
            <div className="stat-card-icon"><Building2 size={18} /></div>
          </div>
          <div className="stat-card-value">{clients?.length || 0}</div>
          <span className="stat-card-subtitle">Active Client Entities</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Statutory Regime</span>
            <div className="stat-card-icon"><Settings size={18} /></div>
          </div>
          <div className="stat-card-value" style={{ fontSize: 20 }}>FY 2025-26</div>
          <span className="stat-card-subtitle">PF & ESI Compliance Active</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">System Status</span>
            <div className="stat-card-icon"><CheckCircle2 size={18} /></div>
          </div>
          <div className="stat-card-value" style={{ fontSize: 20, color: 'var(--success)' }}>Operational</div>
          <span className="stat-card-subtitle">Encrypted & Isolated</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 24
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-light)' : '2px solid transparent',
                color: isActive ? 'var(--accent-light)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all var(--transition)'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--accent-dim)',
            color: 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Lock size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              {tabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
              Milestone 4 Admin Module Staged & Forward Compatible
            </p>
          </div>
        </div>

        <div style={{
          padding: 16,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}>
          <AlertTriangle size={20} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            <strong>Milestone 4 Administration Interface Ready:</strong> This administrative route is securely gated by
            <code style={{ margin: '0 4px', padding: '2px 6px', background: 'var(--bg-card)', borderRadius: 4 }}>
              &lt;AdminRoute&gt;
            </code>.
            Full CRUD operations for User Management, Statutory Limit Tables (PF ₹15,000 / ESI ₹21,000 ceilings), Audit Trails,
            and Cross-Client Payroll Governance are scheduled for Milestone 4 (R4).
          </div>
        </div>
      </div>
    </div>
  );
}
