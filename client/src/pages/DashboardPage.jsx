import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useClient } from '../context/ClientContext';
import { useAuth } from '../context/AuthContext';
import { Building2, Users, Plus, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectClient } = useClient();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/clients')
      .then((r) => setClients(r.data.data || []))
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false));
  }, []);

  function handleSelectClient(client) {
    selectClient(client);
    navigate(`/clients/${client.id}`);
  }

  const totalEmployees = clients.reduce((s, c) => s + (c._count?.employees || 0), 0);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">
            Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">Select a client below to start managing payroll</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/clients')}
        >
          <Plus size={16} />
          New Client
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-label">Total Clients</div>
          <div className="stat-value">{clients.length}</div>
          <div className="stat-sub">Active organizations</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Employees</div>
          <div className="stat-value">{totalEmployees}</div>
          <div className="stat-sub">Across all clients</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Your Role</div>
          <div className="stat-value" style={{ fontSize: 18, letterSpacing: 0 }}>
            {user?.role?.replace('_', ' ')}
          </div>
          <div className="stat-sub">Access level</div>
        </div>
      </div>

      {/* Client List */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Clients</div>
            <div className="card-subtitle">Click a client to work in its context</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/clients')}>
            Manage all
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : clients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Building2 size={28} /></div>
            <div className="empty-title">No clients yet</div>
            <div className="empty-desc">Create your first client to get started with payroll management.</div>
            <button className="btn btn-primary" onClick={() => navigate('/clients')}>
              <Plus size={16} /> Create Client
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} onSelect={handleSelectClient} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientCard({ client, onSelect }) {
  const [readiness, setReadiness] = useState(null);

  useEffect(() => {
    api.get(`/clients/${client.id}/readiness`)
      .then((r) => setReadiness(r.data.data))
      .catch(() => {});
  }, [client.id]);

  const empCount = client._count?.employees || 0;
  const isReady = readiness?.is_ready;

  return (
    <div
      className="version-card"
      onClick={() => onSelect(client)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            background: 'var(--accent-dim)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-light)',
            fontSize: 18,
            fontWeight: 800,
            fontFamily: 'var(--font-heading)',
          }}
        >
          {client.name[0].toUpperCase()}
        </div>
        {readiness !== null && (
          isReady
            ? <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
            : <XCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
        )}
      </div>

      <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-heading)', marginBottom: 4 }}>
        {client.name}
      </div>
      {client.state && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{client.state}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <Users size={13} />
          <span>{empCount} employee{empCount !== 1 ? 's' : ''}</span>
        </div>
        <ArrowRight size={15} style={{ color: 'var(--accent)', opacity: 0.6 }} />
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
