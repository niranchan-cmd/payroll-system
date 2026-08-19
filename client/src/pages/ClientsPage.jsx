import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useClient } from '../context/ClientContext';
import { Plus, Search, Building2, ChevronRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DeleteClientModal from '../components/DeleteClientModal';

export default function ClientsPage() {
  const navigate = useNavigate();
  const { selectedClient, clearClient } = useClient();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  async function fetchClients() {
    setLoading(true);
    try {
      const r = await api.get('/clients');
      setClients(r.data.data || []);
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchClients(); }, []);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.state || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Manage your client organizations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Client
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div className="search-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Building2 size={28} /></div>
            <div className="empty-title">No clients found</div>
            <div className="empty-desc">
              {search ? 'Try a different search.' : 'Create your first client to get started.'}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>PAN</th>
                  <th>State</th>
                  <th>Employees</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/clients/${c.id}`)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, background: 'var(--accent-dim)',
                          borderRadius: 8, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: 'var(--accent-light)',
                          fontSize: 14, fontWeight: 700, flexShrink: 0
                        }}>
                          {c.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                          {c.registration_no && (
                            <div className="td-muted">{c.registration_no}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="td-muted">{c.pan || '—'}</td>
                    <td className="td-muted">{c.state || '—'}</td>
                    <td>
                      <span className="badge badge-accent">{c._count?.employees || 0}</span>
                    </td>
                    <td className="td-muted">
                      {new Date(c.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: 'var(--danger)', opacity: 0.7 }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                          onClick={() => setClientToDelete(c)}
                          title={`Delete ${c.name} (Requires Password)`}
                        >
                          <Trash2 size={15} />
                        </button>
                        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onCreated={(client) => {
            setClients((prev) => [client, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {clientToDelete && (
        <DeleteClientModal
          client={clientToDelete}
          isOpen={Boolean(clientToDelete)}
          onClose={() => setClientToDelete(null)}
          onSuccess={() => {
            if (selectedClient?.id === clientToDelete.id) {
              clearClient();
            }
            setClients((prev) => prev.filter((item) => item.id !== clientToDelete.id));
            setClientToDelete(null);
          }}
        />
      )}
    </div>
  );
}

function CreateClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', registration_no: '', pan: '', address: '', state: '',
  });
  const [loading, setLoading] = useState(false);

  const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Chandigarh', 'Puducherry',
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/clients', form);
      toast.success('Client created!');
      onCreated(r.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Create New Client</h3>
          <button className="btn btn-icon btn-ghost btn-icon-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Company Name <span className="required">*</span></label>
              <input
                className="form-input"
                placeholder="Acme Pvt. Ltd."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Registration No.</label>
                <input className="form-input" placeholder="CIN / LLPIN"
                  value={form.registration_no}
                  onChange={(e) => setForm({ ...form, registration_no: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">PAN</label>
                <input className="form-input" placeholder="AAAAA0000A"
                  value={form.pan}
                  onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <select className="form-select" value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-textarea" style={{ minHeight: 70 }} placeholder="Full address..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Creating...</> : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
