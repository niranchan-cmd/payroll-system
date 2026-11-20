import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useClient } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Users, Plus, ArrowRight, CheckCircle2, 
  AlertCircle, Search, FileSpreadsheet, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectClient } = useClient();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [readinessMap, setReadinessMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'ready' | 'pending'

  useEffect(() => {
    api.get('/clients')
      .then((r) => {
        const list = r.data.data || [];
        setClients(list);
        
        // Fetch readiness state for all clients in parallel
        list.forEach((c) => {
          api.get(`/clients/${c.id}/readiness`)
            .then((res) => {
              setReadinessMap((prev) => ({ ...prev, [c.id]: res.data.data }));
            })
            .catch(() => {});
        });
      })
      .catch(() => toast.error('Failed to load client organizations'))
      .finally(() => setLoading(false));
  }, []);

  function handleSelectClient(client) {
    selectClient(client);
    navigate(`/clients/${client.id}`);
  }

  const totalEmployees = clients.reduce((s, c) => s + (c._count?.employees || 0), 0);
  const readyCount = clients.filter((c) => readinessMap[c.id]?.is_ready).length;
  const pendingCount = clients.length - readyCount;

  // Filter clients based on search query and active tab
  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.state && c.state.toLowerCase().includes(q));

    const isReady = readinessMap[c.id]?.is_ready;
    if (!matchesSearch) return false;
    if (filterTab === 'ready') return isReady === true;
    if (filterTab === 'pending') return isReady === false;
    return true;
  });

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      
      {/* ── Top Header Toolbar ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '4px 10px',
                borderRadius: 9999,
                backgroundColor: '#E6F4EA',
                color: '#023326',
                border: '1px solid #BBF7D0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                }}
              />
              November 2026 Processing Window Active
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Next Statutory Filing: 07 Dec (TDS Challan 281)
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
            }}
          >
            Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
            Corporate Payroll Command Center · Manage client entities, compensation structures, and disbursals.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/reports')}
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <FileSpreadsheet size={15} />
            Pay Registers
          </button>
          <button
            onClick={() => navigate('/clients')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              border: '1px solid #023326',
              backgroundColor: '#023326',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(2, 51, 38, 0.2)',
            }}
          >
            <Plus size={16} />
            New Client Entity
          </button>
        </div>
      </div>

      {/* ── Metric Ribbon (Minimalist Monochrome) ────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Active Organizations
            </span>
            <Building2 size={16} color="var(--text-muted)" />
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            {clients.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {readyCount} of {clients.length} Ready
            </span>
            <span>Ready for computation</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Workforce Managed
            </span>
            <Users size={16} color="var(--text-muted)" />
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            {totalEmployees}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Active Roster
            </span>
            <span>Across all corporate entities</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Compliance Engine Health
            </span>
            <ShieldCheck size={16} color="var(--text-muted)" />
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            99.9%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              0 Penalties
            </span>
            <span>Statutory 2026-27 Active</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Operational Access Tier
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>🛡️</span>
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {user?.role?.replace('_', ' ') || 'USER'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
            NH Associates Master Partner Console
          </div>
        </div>
      </div>

      {/* ── High-Density Full-Width Enterprise Table Container ──────── */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {/* Table Header Bar with Real-Time Search & Status Filter Tabs */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14,
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
              Corporate Client Entities
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 4,
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {filteredClients.length} of {clients.length} Organizations
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end', maxWidth: 600 }}>
            {/* Real-time search box */}
            <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
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
              <input
                type="text"
                placeholder="Filter by entity, state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '7px 12px 7px 32px',
                  color: 'var(--text-primary)',
                  fontSize: 12.5,
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>

            {/* Status Filter Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 4,
                backgroundColor: 'var(--bg-surface)',
                padding: 3,
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                onClick={() => setFilterTab('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: filterTab === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: filterTab === 'all' ? 'var(--bg-hover)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                All ({clients.length})
              </button>
              <button
                onClick={() => setFilterTab('ready')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: filterTab === 'ready' ? '#22c55e' : 'var(--text-secondary)',
                  backgroundColor: filterTab === 'ready' ? 'var(--bg-hover)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Ready ({readyCount})
              </button>
              <button
                onClick={() => setFilterTab('pending')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: filterTab === 'pending' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: filterTab === 'pending' ? 'var(--bg-hover)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Pending ({pendingCount})
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : filteredClients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Building2 size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {clients.length === 0 ? 'No clients created yet' : 'No clients match your filter'}
            </div>
            <p style={{ fontSize: 13, marginBottom: 16 }}>
              {clients.length === 0
                ? 'Create your first corporate client entity to begin managing automated payroll.'
                : 'Try adjusting your search query or switching filter tabs.'}
            </p>
            {clients.length === 0 && (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/clients')}
                style={{ padding: '8px 18px', fontSize: 13 }}
              >
                <Plus size={14} /> Create Client
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '11px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', width: '34%' }}>
                  Client Organization
                </th>
                <th style={{ padding: '11px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', width: '18%' }}>
                  Jurisdiction / State
                </th>
                <th style={{ padding: '11px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', width: '16%' }}>
                  Workforce Size
                </th>
                <th style={{ padding: '11px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', width: '18%' }}>
                  Payroll Readiness
                </th>
                <th style={{ padding: '11px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', width: '14%', textAlign: 'right' }}>
                  Workspace Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const readiness = readinessMap[client.id];
                const empCount = client._count?.employees || 0;
                const isReady = readiness?.is_ready;

                return (
                  <tr
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Organization Cell */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-heading)',
                            fontSize: 14,
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border-subtle)',
                            flexShrink: 0,
                          }}
                        >
                          {client.name ? client.name[0].toUpperCase() : 'C'}
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {client.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                            ID: {client.id.slice(0, 8)}... · Registered Entity
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* State Cell */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        📍 {client.state || 'India'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Regional Jurisdiction
                      </div>
                    </td>

                    {/* Workforce Size */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-primary)' }}>
                        <Users size={14} color="var(--text-muted)" />
                        <span>{empCount} Employee{empCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {empCount > 0 ? 'Roster active' : 'Awaiting onboarding'}
                      </div>
                    </td>

                    {/* Readiness Status */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                      {readiness === undefined ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Checking...</span>
                      ) : isReady ? (
                        <div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: '#22c55e',
                              backgroundColor: 'rgba(34, 197, 94, 0.12)',
                              padding: '3px 8px',
                              borderRadius: 5,
                              border: '1px solid rgba(34, 197, 94, 0.2)',
                            }}
                          >
                            <CheckCircle2 size={13} color="#22c55e" />
                            Ready to Disburse
                          </span>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            CTC & Bank Configured
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: 'var(--warning)',
                              backgroundColor: 'var(--warning-dim)',
                              padding: '3px 8px',
                              borderRadius: 5,
                              border: '1px solid rgba(245, 158, 11, 0.2)',
                            }}
                          >
                            <AlertCircle size={13} color="var(--warning)" />
                            Pending Setup
                          </span>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            Structure setup needed
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Action Button */}
                    <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectClient(client);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          backgroundColor: 'transparent',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.15s ease',
                          fontFamily: 'var(--font-heading)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--text-primary)';
                          e.currentTarget.style.color = 'var(--bg-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                      >
                        Open Client
                        <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Table Footer */}
        <div
          style={{
            padding: '13px 20px',
            backgroundColor: 'var(--bg-elevated)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <span>
            Showing {filteredClients.length} of {clients.length} registered corporate entities
          </span>
          <span style={{ fontWeight: 600 }}>PostgreSQL & Neon Sync Active</span>
        </div>
      </div>

    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
