import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Plus, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const CALC_TYPES = [
  { value: 'PERCENT_OF_CTC', label: '% of Annual CTC' },
  { value: 'PERCENT_OF_BASIC', label: '% of Monthly Basic' },
  { value: 'PERCENT_OF_GROSS', label: '% of Gross Salary' },
  { value: 'REMAINDER', label: 'Remainder (auto)' },
  { value: 'FIXED', label: 'Fixed Amount (₹/month)' },
];

const defaultComponents = [
  { name: 'Basic', calc_type: 'PERCENT_OF_CTC', value: '40', basis: 'ANNUAL_CTC', ctc_inclusion: 'INCLUDED', is_taxable: true },
  { name: 'HRA', calc_type: 'PERCENT_OF_CTC', value: '20', basis: 'ANNUAL_CTC', ctc_inclusion: 'INCLUDED', is_taxable: false },
  { name: 'Special Allowance', calc_type: 'REMAINDER', value: '', basis: 'N/A', ctc_inclusion: 'INCLUDED', is_taxable: true },
  { name: 'Employer PF', calc_type: 'PERCENT_OF_BASIC', value: '12', basis: 'MONTHLY_BASIC', ctc_inclusion: 'ADDED_ON_TOP', is_taxable: false },
];

export default function CTCStructureFormPage() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    version_name: '',
    effective_from: '',
    rounding_rule: 'NEAREST_RUPEE',
    remainder_comp: 'Special Allowance',
  });

  const [components, setComponents] = useState(defaultComponents.map((c, i) => ({ ...c, _id: i })));
  const [nextId, setNextId] = useState(defaultComponents.length);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(null);

  function addComponent() {
    setComponents((prev) => [
      ...prev,
      { _id: nextId, name: '', calc_type: 'PERCENT_OF_CTC', value: '', basis: 'ANNUAL_CTC', ctc_inclusion: 'INCLUDED', is_taxable: true },
    ]);
    setNextId((n) => n + 1);
  }

  function removeComponent(id) {
    setComponents((prev) => prev.filter((c) => c._id !== id));
  }

  function updateComponent(id, field, value) {
    setComponents((prev) =>
      prev.map((c) => {
        if (c._id !== id) return c;
        const updated = { ...c, [field]: value };
        // Auto-set basis when calc_type changes
        if (field === 'calc_type') {
          if (value === 'PERCENT_OF_CTC') updated.basis = 'ANNUAL_CTC';
          else if (value === 'PERCENT_OF_BASIC') updated.basis = 'MONTHLY_BASIC';
          else if (value === 'PERCENT_OF_GROSS') updated.basis = 'GROSS_SALARY';
          else if (value === 'REMAINDER') { updated.basis = 'N/A'; updated.value = ''; }
          else if (value === 'FIXED') updated.basis = 'N/A';
        }
        return updated;
      })
    );
  }

  async function handleSubmit(e, resolveConflict = null) {
    e.preventDefault?.();
    setSaving(true);
    setConflict(null);

    const payload = {
      ...form,
      components: components.map((c, idx) => ({
        name: c.name,
        calc_type: c.calc_type,
        value: c.value !== '' ? parseFloat(c.value) : undefined,
        basis: c.basis,
        ctc_inclusion: c.ctc_inclusion,
        is_taxable: Boolean(c.is_taxable),
        display_order: idx,
      })),
      ...(resolveConflict ? { resolve_conflict: resolveConflict } : {}),
    };

    try {
      await api.post(`/clients/${clientId}/structures`, payload);
      toast.success('CTC Structure created!');
      navigate(`/clients/${clientId}/structure`);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.conflict) {
        setConflict(err.response.data);
      } else {
        toast.error(err.response?.data?.message || 'Failed to create structure');
      }
    } finally {
      setSaving(false);
    }
  }

  const remainderOptions = components
    .filter((c) => c.ctc_inclusion === 'INCLUDED' && c.calc_type !== 'REMAINDER')
    .map((c) => c.name)
    .filter(Boolean);

  const includedCount = components.filter((c) => c.ctc_inclusion === 'INCLUDED' && c.calc_type !== 'REMAINDER').length;
  const hasRemainder = components.some((c) => c.calc_type === 'REMAINDER');

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title">New CTC Structure Version</h1>
          <p className="page-subtitle">Define salary component rules for this client</p>
        </div>
      </div>

      {/* Conflict Dialog */}
      {conflict && (
        <div className="alert alert-warning" style={{ marginBottom: 24, flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <AlertTriangle size={18} />
            Conflict Detected
          </div>
          <p style={{ color: 'var(--text-primary)', fontSize: 13.5 }}>
            {conflict.message}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-warning"
              style={{ background: 'var(--warning)', color: '#000' }}
              onClick={() => handleSubmit({ preventDefault: () => {} }, 'AUTO_END')}
              disabled={saving}
            >
              Auto-end previous version & continue
            </button>
            <button className="btn btn-secondary" onClick={() => setConflict(null)}>
              Change effective date
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Version Info */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">Version Details</div></div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Version Name <span className="required">*</span></label>
              <input className="form-input" placeholder="V1, V2, FY-2026..." value={form.version_name}
                onChange={(e) => setForm({ ...form, version_name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Effective From <span className="required">*</span></label>
              <input type="date" className="form-input" value={form.effective_from}
                onChange={(e) => setForm({ ...form, effective_from: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Rounding Rule <span className="required">*</span></label>
              <select className="form-select" value={form.rounding_rule}
                onChange={(e) => setForm({ ...form, rounding_rule: e.target.value })}>
                <option value="NEAREST_RUPEE">Nearest Rupee</option>
                <option value="NEAREST_10">Nearest ₹10</option>
                <option value="NONE">No Rounding</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Remainder Component <span className="required">*</span></label>
              <input className="form-input" placeholder="Special Allowance"
                value={form.remainder_comp}
                onChange={(e) => setForm({ ...form, remainder_comp: e.target.value })}
                list="remainder-options" required />
              <datalist id="remainder-options">
                {remainderOptions.map((n) => <option key={n} value={n} />)}
              </datalist>
              <span className="form-hint">Component that absorbs rounding remainder to keep CTC exact</span>
            </div>
          </div>
        </div>

        {/* Components */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Salary Components</div>
              <div className="card-subtitle">Define each component rule — all calculations are dynamic, no hardcoded values</div>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addComponent}>
              <Plus size={14} /> Add Component
            </button>
          </div>

          {/* Header Row */}
          <div className="component-row-header">
            <div className="comp-header-cell">Component Name</div>
            <div className="comp-header-cell">Calculation Type</div>
            <div className="comp-header-cell">Value (%/₹)</div>
            <div className="comp-header-cell">CTC Inclusion</div>
            <div className="comp-header-cell">Taxable</div>
            <div></div>
          </div>

          {components.map((comp) => (
            <div key={comp._id} className="component-row">
              <input
                className="form-input"
                style={{ height: 36, fontSize: 13 }}
                placeholder="Component name"
                value={comp.name}
                onChange={(e) => updateComponent(comp._id, 'name', e.target.value)}
                required
              />
              <select
                className="form-select"
                style={{ height: 36, fontSize: 12 }}
                value={comp.calc_type}
                onChange={(e) => updateComponent(comp._id, 'calc_type', e.target.value)}
              >
                {CALC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input
                className="form-input"
                style={{ height: 36, fontSize: 13 }}
                placeholder={comp.calc_type === 'REMAINDER' ? 'Auto' : comp.calc_type === 'FIXED' ? '₹' : '%'}
                type={comp.calc_type === 'REMAINDER' ? 'text' : 'number'}
                disabled={comp.calc_type === 'REMAINDER'}
                step="0.01"
                min="0"
                value={comp.value}
                onChange={(e) => updateComponent(comp._id, 'value', e.target.value)}
              />
              <select
                className="form-select"
                style={{ height: 36, fontSize: 12 }}
                value={comp.ctc_inclusion}
                onChange={(e) => updateComponent(comp._id, 'ctc_inclusion', e.target.value)}
              >
                <option value="INCLUDED">Included in CTC</option>
                <option value="ADDED_ON_TOP">Added on Top</option>
              </select>
              <select
                className="form-select"
                style={{ height: 36, fontSize: 12 }}
                value={comp.is_taxable ? 'true' : 'false'}
                onChange={(e) => updateComponent(comp._id, 'is_taxable', e.target.value === 'true')}
              >
                <option value="true">Taxable</option>
                <option value="false">Exempt</option>
              </select>
              <button
                type="button"
                className="btn btn-icon btn-danger btn-icon-sm"
                onClick={() => removeComponent(comp._id)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {!hasRemainder && (
            <div className="alert alert-warning" style={{ marginTop: 16, fontSize: 12.5 }}>
              <AlertTriangle size={15} />
              <span>No REMAINDER component found. Add one component with "Remainder (auto)" type to absorb rounding differences and keep CTC sum exact.</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Creating...</> : 'Create Structure Version'}
          </button>
        </div>
      </form>
    </div>
  );
}
