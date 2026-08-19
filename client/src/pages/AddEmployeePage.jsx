import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Eye, CheckCircle, AlertCircle, Save, Plus, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

function fmtINR(n) {
  if (n === null || n === undefined) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function AddEmployeePage() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    roll_no: '',
    designation: '',
    start_date: '',
    annual_ctc: '',
    email: '',
    department: '',
    tax_regime: 'NEW',
  });
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Preview calculation
  async function handlePreview(e) {
    if (e && e.preventDefault) e.preventDefault();

    const ctc = Number(form.annual_ctc);
    if (!form.annual_ctc || ctc <= 0) {
      toast.error('Please enter a valid Annual CTC first');
      return;
    }
    if (!form.start_date) {
      toast.error('Please select a start date first');
      return;
    }

    setPreviewLoading(true);
    setPreview(null);

    try {
      const r = await api.post(`/clients/${clientId}/employees/preview-salary`, {
        annual_ctc: ctc,
        start_date: form.start_date,
      });
      setPreview(r.data.data);
      toast.success('Salary breakdown calculated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate salary preview');
    } finally {
      setPreviewLoading(false);
    }
  }

  // Direct Save handler
  async function handleSave(e, addAnother = false) {
    if (e && e.preventDefault) e.preventDefault();

    // Client-side validations
    if (!form.name.trim()) {
      toast.error('Please enter employee full name');
      return;
    }
    if (!form.roll_no.trim()) {
      toast.error('Please enter roll no / employee ID');
      return;
    }
    if (!form.designation.trim()) {
      toast.error('Please enter designation');
      return;
    }
    if (!form.start_date) {
      toast.error('Please enter start date of joining');
      return;
    }
    const ctc = Number(form.annual_ctc);
    if (!form.annual_ctc || isNaN(ctc) || ctc <= 0) {
      toast.error('Please enter a valid annual CTC in Rupees');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/clients/${clientId}/employees`, {
        name: form.name.trim(),
        roll_no: form.roll_no.trim(),
        designation: form.designation.trim(),
        start_date: form.start_date,
        annual_ctc: ctc,
        email: form.email.trim() || undefined,
        department: form.department.trim() || undefined,
        tax_regime: form.tax_regime,
        confirmed: true,
      });

      toast.success(`Employee "${form.name}" added successfully!`);

      if (addAnother) {
        setForm({
          name: '',
          roll_no: '',
          designation: '',
          start_date: form.start_date, // keep same start date for convenience
          annual_ctc: '',
          email: '',
          department: form.department,
          tax_regime: 'NEW',
        });
        setPreview(null);
      } else {
        navigate(`/clients/${clientId}/employees`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save employee. Check details.');
    } finally {
      setSaving(false);
    }
  }

  const monthlyCtc = form.annual_ctc ? Math.round(Number(form.annual_ctc) / 12) : null;

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/clients/${clientId}/employees`)}
            style={{ marginBottom: 8 }}
          >
            <ArrowLeft size={15} /> Back to Employees
          </button>
          <h1 className="page-title">Add Employee</h1>
          <p className="page-subtitle">Salary components are automatically calculated from the active CTC structure</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={(e) => handleSave(e, false)}
            disabled={saving}
          >
            {saving ? (
              <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving...</>
            ) : (
              <><Save size={15} /> Save Employee</>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={(e) => handleSave(e, false)}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">Employee Information</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input
                  className="form-input"
                  placeholder="e.g. Rahul Kumar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Roll No / Employee ID <span className="required">*</span></label>
                <input
                  className="form-input"
                  placeholder="e.g. EMP001"
                  value={form.roll_no}
                  onChange={(e) => setForm({ ...form, roll_no: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Designation <span className="required">*</span></label>
                <input
                  className="form-input"
                  placeholder="e.g. Software Engineer"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  className="form-input"
                  placeholder="e.g. Engineering"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date / Date of Joining <span className="required">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={form.start_date}
                  onChange={(e) => { setForm({ ...form, start_date: e.target.value }); setPreview(null); }}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="rahul@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            {/* CTC Input */}
            <div className="form-group">
              <label className="form-label">Annual CTC (₹) <span className="required">*</span></label>
              <div style={{ position: 'relative', maxWidth: 320 }}>
                <span style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)'
                }}>₹</span>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 600000"
                  min={1}
                  step={1}
                  value={form.annual_ctc}
                  onChange={(e) => { setForm({ ...form, annual_ctc: e.target.value }); setPreview(null); }}
                  style={{ paddingLeft: 30 }}
                  required
                />
              </div>
              {form.annual_ctc && Number(form.annual_ctc) > 0 && (
                <div className="form-hint">
                  Monthly equivalent: <strong style={{ color: 'var(--text-primary)' }}>₹{monthlyCtc?.toLocaleString('en-IN')}</strong> / month
                </div>
              )}
            </div>

            {/* Tax Regime */}
            <div className="form-group">
              <label className="form-label">Tax Regime <span className="required">*</span></label>
              <div className="radio-group">
                {[
                  { value: 'NEW', label: 'New Tax Regime', desc: 'Default lower tax slab rates (Section 115BAC)' },
                  { value: 'OLD', label: 'Old Tax Regime', desc: 'Allows standard deductions, HRA, 80C exemptions' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`radio-option ${form.tax_regime === opt.value ? 'selected' : ''}`}
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        name="tax_regime"
                        value={opt.value}
                        checked={form.tax_regime === opt.value}
                        onChange={() => setForm({ ...form, tax_regime: opt.value })}
                      />
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{opt.label}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 22 }}>{opt.desc}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePreview}
            disabled={previewLoading || !form.annual_ctc || !form.start_date}
          >
            {previewLoading ? (
              <><span className="spinner" style={{ width: 14, height: 14 }} /> Calculating...</>
            ) : (
              <><Eye size={15} /> Preview Salary Breakdown</>
            )}
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate(`/clients/${clientId}/employees`)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={(e) => handleSave(e, true)}
              disabled={saving}
            >
              <Plus size={15} /> Save & Add Another
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={saving}
            >
              {saving ? (
                <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving Employee...</>
              ) : (
                <><Save size={16} /> Save Employee</>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Salary Preview Component Breakdown */}
      {preview && (
        <div className="preview-card" style={{ marginBottom: 28 }}>
          <div className="preview-header">
            <CheckCircle size={18} style={{ color: 'var(--accent)' }} />
            <div className="preview-header-title">
              Calculated Salary Breakdown — {preview.structure?.version_name}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--accent-light)' }}>
              Effective from {new Date(preview.structure?.effective_from).toLocaleDateString('en-IN')}
            </div>
          </div>

          <div style={{ padding: 24 }}>
            <table className="salary-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Component</th>
                  <th>Monthly</th>
                  <th>Annual</th>
                </tr>
              </thead>
              <tbody>
                {preview.includedComponents?.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td><span className="amount">{fmtINR(c.monthly)}</span></td>
                    <td><span className="amount">{fmtINR(c.annual)}</span></td>
                  </tr>
                ))}
                <tr className="subtotal">
                  <td>CTC Sub Total</td>
                  <td><span className="amount">{fmtINR(preview.monthlyCTC)}</span></td>
                  <td><span className="amount">{fmtINR(preview.annualCTC)}</span></td>
                </tr>
                {preview.addedOnTopComponents?.map((c) => (
                  <tr key={c.name} className="added-on-top">
                    <td>{c.name} <span style={{ fontSize: 10, color: 'var(--warning)', marginLeft: 6 }}>(+top)</span></td>
                    <td><span className="amount">{fmtINR(c.monthly)}</span></td>
                    <td><span className="amount">{fmtINR(c.annual)}</span></td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Total Cost to Company (CTC)</td>
                  <td><span className="amount">{fmtINR(preview.monthlyTotalCostToCompany)}</span></td>
                  <td><span className="amount">{fmtINR(preview.annualTotalCostToCompany)}</span></td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={(e) => handleSave(e, false)}
                disabled={saving}
              >
                <CheckCircle size={15} /> Save Employee with This Structure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
