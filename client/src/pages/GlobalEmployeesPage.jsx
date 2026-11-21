import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useClient } from '../context/ClientContext';
import {
  Users, Search, Building2, ChevronRight, Plus,
  FileSpreadsheet, Filter, CheckCircle2, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

export default function GlobalEmployeesPage() {
  const navigate = useNavigate();
  const { clients: ctxClients, fetchClients } = useClient();
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [search, setSearch] = useState('');
  const [regimeFilter, setRegimeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  // Load clients
  useEffect(() => {
    async function loadClientList() {
      if (ctxClients && ctxClients.length > 0) {
        setClients(ctxClients);
      } else if (fetchClients) {
        const list = await fetchClients();
        setClients(list || []);
      } else {
        try {
          const res = await api.get('/clients');
          setClients(res.data?.data || []);
        } catch {
          // ignore
        }
      }
    }
    loadClientList();
  }, [ctxClients, fetchClients]);

  // Load employees
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedClientId === 'all') {
        // Fetch from all known clients
        const clientList = clients.length > 0 ? clients : (await api.get('/clients')).data?.data || [];
        if (clientList.length === 0) {
          setEmployees([]);
          setLoading(false);
          return;
        }

        const results = await Promise.all(
          clientList.map(async (c) => {
            try {
              const res = await api.get(`/clients/${c.id}/employees`);
              const empList = res.data?.data || [];
              return empList.map((emp) => ({
                ...emp,
                client_id: c.id,
                client_name: c.name,
              }));
            } catch {
              return [];
            }
          })
        );
        setEmployees(results.flat());
      } else {
        const res = await api.get(`/clients/${selectedClientId}/employees`);
        const clientObj = clients.find((c) => c.id === selectedClientId);
        const empList = (res.data?.data || []).map((emp) => ({
          ...emp,
          client_id: selectedClientId,
          client_name: clientObj?.name || 'Client',
        }));
        setEmployees(empList);
      }
    } catch {
      toast.error('Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId, clients]);

  useEffect(() => {
    if (clients.length > 0 || selectedClientId !== 'all') {
      loadEmployees();
    }
  }, [selectedClientId, clients.length, loadEmployees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Regime filter
      if (regimeFilter !== 'ALL' && emp.tax_regime !== regimeFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && emp.status !== statusFilter) {
        return false;
      }
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = (emp.name || '').toLowerCase().includes(q);
        const matchesRoll = (emp.roll_no || '').toLowerCase().includes(q);
        const matchesDept = (emp.department || '').toLowerCase().includes(q);
        const matchesDesig = (emp.designation || '').toLowerCase().includes(q);
        const matchesClient = (emp.client_name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesDept && !matchesDesig && !matchesClient) {
          return false;
        }
      }
      return true;
    });
  }, [employees, regimeFilter, statusFilter, search]);

  const handleAddEmployee = () => {
    if (selectedClientId !== 'all') {
      navigate(`/clients/${selectedClientId}/employees/new`);
    } else if (clients.length === 1) {
      navigate(`/clients/${clients[0].id}/employees/new`);
    } else {
      toast('Please select a specific client from the dropdown to add an employee.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Global Employees Directory</h1>
          <p className="page-subtitle">
            Search, filter, and manage employees across all client organizations
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {selectedClientId !== 'all' && (
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/clients/${selectedClientId}/employees/import`)}
            >
              <FileSpreadsheet size={15} /> Bulk Import
            </button>
          )}
          <button className="btn btn-primary" onClick={handleAddEmployee}>
            <Plus size={16} /> Add Employee
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          alignItems: 'end',
        }}>
          {/* Client Selector */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11.5 }}>
              <Building2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Client Organization
            </label>
            <select
              className="form-select"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="all">🏢 All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11.5 }}>
              <Search size={12} style={{ display: 'inline', marginRight: 4 }} /> Search
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, roll, dept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Tax Regime */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11.5 }}>
              <Filter size={12} style={{ display: 'inline', marginRight: 4 }} /> Tax Regime
            </label>
            <select
              className="form-select"
              value={regimeFilter}
              onChange={(e) => setRegimeFilter(e.target.value)}
            >
              <option value="ALL">All Regimes</option>
              <option value="NEW">New Tax Regime</option>
              <option value="OLD">Old Tax Regime</option>
            </select>
          </div>

          {/* Status */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11.5 }}>
              Status
            </label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="loading-page" style={{ minHeight: 300 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 10 }}>Loading employees...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Users size={28} /></div>
          <div className="empty-title">No employees found</div>
          <p className="empty-desc">
            {search || regimeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Try adjusting your search query or filters.'
              : 'Add your first employee to get started.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12.5,
            color: 'var(--text-muted)'
          }}>
            <span>Showing <strong>{filteredEmployees.length}</strong> employee records</span>
            {selectedClientId !== 'all' && (
              <span className="badge badge-sm badge-accent">Filtered by Client</span>
            )}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Employee</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Organization</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Roll No</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Role & Dept</th>
                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Annual CTC</th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Regime</th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Status</th>
                <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const latestCtc = emp.salary_histories?.[0]?.annual_ctc || emp.annual_ctc;
                return (
                  <tr
                    key={emp.id}
                    style={{ cursor: 'pointer', transition: 'background 150ms' }}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'var(--accent-dim)',
                          color: 'var(--accent-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {emp.name?.[0]?.toUpperCase() || 'E'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{emp.name}</div>
                          {emp.email && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{emp.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '3px 8px',
                          fontSize: 12,
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        onClick={() => navigate(`/clients/${emp.client_id}`)}
                      >
                        <Building2 size={12} style={{ color: 'var(--accent-light)' }} />
                        {emp.client_name}
                      </button>
                    </td>
                    <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      {emp.roll_no}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{emp.designation || '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{emp.department || '—'}</div>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                      {latestCtc ? `₹${fmt(latestCtc)}` : '—'}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <span className="badge badge-secondary" style={{ fontSize: 10.5 }}>
                        {emp.tax_regime || 'NEW'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <span className={`badge ${emp.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                        {emp.status === 'ACTIVE' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/employees/${emp.id}/revise`)}
                        >
                          Revise CTC
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/employees/${emp.id}`)}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
