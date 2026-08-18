import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useClient } from '../context/ClientContext';
import {
  CheckCircle, XCircle, ChevronRight, Settings, Save, Users, GitBranch
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRORATION_OPTIONS = [
  { value: 'CALENDAR', label: 'Calendar Days', desc: 'Salary ÷ total days in month' },
  { value: 'FIXED_26', label: 'Fixed 26 Days', desc: 'Salary ÷ 26 working days' },
  { value: 'FIXED_30', label: 'Fixed 30 Days', desc: 'Salary ÷ 30 days' },
];

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectClient, selectedClient } = useClient();
  const [client, setClient] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    try {
      const [cR, rR] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get(`/clients/${id}/readiness`),
      ]);
      const c = cR.data.data;
      setClient(c);
      setReadiness(rR.data.data);
      setForm({
        name: c.name || '',
        registration_no: c.registration_no || '',
        pan: c.pan || '',
        address: c.address || '',
        state: c.state || '',
        proration_rule: c.proration_rule || '',
        pf_on_actual: c.pf_on_actual ?? null,
        esi_auto_apply: c.esi_auto_apply ?? null,
        payroll_cycle: c.payroll_cycle || 'MONTHLY',
        payroll_cutoff: c.payroll_cutoff ?? '',
      });
      if (!selectedClient || selectedClient.id !== id) {
        selectClient(c);
      }
    } catch {
      toast.error('Failed to load client');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        pf_on_actual: form.pf_on_actual !== null && form.pf_on_actual !== '' ? Boolean(form.pf_on_actual === 'true' || form.pf_on_actual === true) : null,
        esi_auto_apply: form.esi_auto_apply !== null && form.esi_auto_apply !== '' ? Boolean(form.esi_auto_apply === 'true' || form.esi_auto_apply === true) : null,
        payroll_cutoff: form.payroll_cutoff ? parseInt(form.payroll_cutoff) : null,
      };
      const r = await api.patch(`/clients/${id}`, payload);
      setClient(r.data.data);
      selectClient(r.data.data);
      // Refresh readiness
      const rR = await api.get(`/clients/${id}/readiness`);
      setReadiness(rR.data.data);
      toast.success('Client settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>;
  if (!client) return <div className="empty-state"><div className="empty-title">Client not found</div></div>;

  const allReady = readiness?.is_ready;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{client.name}</h1>
          <p className="page-subtitle">Client Setup & Configuration</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/clients/${id}/structure`)}>
            <GitBranch size={15} /> CTC Structure
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/clients/${id}/employees`)}
            disabled={!allReady}
            data-tooltip={!allReady ? 'Complete setup first' : undefined}
          >
            <Users size={15} /> Employees
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Settings Form */}
        <form onSubmit={handleSave}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Basic Information</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Company Name <span className="required">*</span></label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Registration No.</label>
                  <input className="form-input" value={form.registration_no} onChange={(e) => setForm({ ...form, registration_no: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">PAN</label>
                  <input className="form-input" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="e.g. Maharashtra" />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">Payroll Configuration</div>
              <span className="badge badge-warning">Required for employees</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Proration Rule */}
              <div className="form-group">
                <label className="form-label">Proration Rule <span className="required">*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {PRORATION_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`radio-option ${form.proration_rule === opt.value ? 'selected' : ''}`}
                      style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="radio"
                          name="proration_rule"
                          value={opt.value}
                          checked={form.proration_rule === opt.value}
                          onChange={() => setForm({ ...form, proration_rule: opt.value })}
                        />
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>{opt.label}</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 24 }}>{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* PF Settings */}
              <div className="form-group">
                <label className="form-label">PF Calculation Basis <span className="required">*</span></label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { value: 'false', label: 'Capped at ₹15,000', desc: 'Max PF basis ₹15,000/mo' },
                    { value: 'true', label: 'Actual Basic', desc: 'PF on full basic salary' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`radio-option ${String(form.pf_on_actual) === opt.value ? 'selected' : ''}`}
                      style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="radio"
                          name="pf_on_actual"
                          value={opt.value}
                          checked={String(form.pf_on_actual) === opt.value}
                          onChange={() => setForm({ ...form, pf_on_actual: opt.value === 'true' })}
                        />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</span>
                      </div>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 22 }}>{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ESI Settings */}
              <div className="form-group">
                <label className="form-label">ESI Auto-Apply <span className="required">*</span></label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { value: 'true', label: 'Yes — Auto Apply', desc: 'Apply ESI if gross ≤ ₹21,000' },
                    { value: 'false', label: 'No — Disable ESI', desc: 'Skip ESI for all employees' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`radio-option ${String(form.esi_auto_apply) === opt.value ? 'selected' : ''}`}
                      style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="radio" name="esi_auto_apply" value={opt.value}
                          checked={String(form.esi_auto_apply) === opt.value}
                          onChange={() => setForm({ ...form, esi_auto_apply: opt.value === 'true' })} />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</span>
                      </div>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginLeft: 22 }}>{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payroll Cycle & Cutoff */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Payroll Cycle <span className="required">*</span></label>
                  <select className="form-select" value={form.payroll_cycle}
                    onChange={(e) => setForm({ ...form, payroll_cycle: e.target.value })}>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payroll Cutoff Date <span className="required">*</span></label>
                  <input type="number" className="form-input" min={1} max={31}
                    placeholder="e.g. 25"
                    value={form.payroll_cutoff}
                    onChange={(e) => setForm({ ...form, payroll_cutoff: e.target.value })} />
                  <span className="form-hint">Day of month when payroll closes</span>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</> : <><Save size={15} /> Save Settings</>}
          </button>
        </form>

        {/* Readiness Checklist */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 84 }}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div className="card-title">Setup Checklist</div>
              {allReady
                ? <span className="badge badge-success">Ready ✓</span>
                : <span className="badge badge-danger">Incomplete</span>
              }
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(readiness?.items || []).map((item) => (
                <div key={item.key} className="checklist-item">
                  <div className={`checklist-icon ${item.passed ? 'pass' : 'fail'}`}>
                    {item.passed ? '✓' : '✕'}
                  </div>
                  <span style={{ fontSize: 12.5 }}>{item.label}</span>
                </div>
              ))}
            </div>
            {!allReady && (
              <div className="alert alert-warning" style={{ marginTop: 16, fontSize: 12 }}>
                <span>⚠</span>
                <span>Complete all items to enable employee management.</span>
              </div>
            )}
            {allReady && (
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 16 }}
                onClick={() => navigate(`/clients/${id}/employees`)}
              >
                <Users size={15} /> Manage Employees
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
