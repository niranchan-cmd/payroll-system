import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Eye, CheckCircle, AlertCircle } from 'lucide-react';
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
  const [ctcConfirmed, setCtcConfirmed] = useState(false);

  async function handlePreview(e) {
    e.preventDefault();

    const ctc = Number(form.annual_ctc);
    if (!form.annual_ctc || ctc <= 0) {
      toast.error('Please enter a valid Annual CTC');
      return;
    }
    if (!form.start_date) {
      toast.error('Please enter a start date');
      return;
    }

    setPreviewLoading(true);
    setPreview(null);
    setCtcConfirmed(false);

    try {
      const r = await api.post(`/clients/${clientId}/employees/preview-salary`, {
        annual_ctc: ctc,
        start_date: form.start_date,
      });
      setPreview(r.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSave() {
    if (!preview || !ctcConfirmed) {
      toast.error('Please review and confirm the salary preview first');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/clients/${clientId}/employees`, {
        ...form,
        annual_ctc: Number(form.annual_ctc),
        confirmed: true,
      });
      toast.success('Employee added successfully!');
      navigate(`/clients/${clientId}/employees`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  }

  const monthlyCtc = form.annual_ctc ? Math.round(Number(form.annual_ctc) / 12) : null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title">Add Employee</h1>
          <p className="page-subtitle">Salary components are automatically calculated from the active CTC structure</p>
        </div>
      </div>

      <form onSubmit={handlePreview}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">Employee Information</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input className="form-input" placeholder="Rahul Kumar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Roll No / Employee ID <span className="required">*</span></label>
                <input className="form-input" placeholder="EMP001"
                  value={form.roll_no}
                  onChange={(e) => setForm({ ...form, roll_no: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Designation <span className="required">*</span></label>
                <input className="form-input" placeholder="Sales Executive"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input className="form-input" placeholder="Sales"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date <span className="required">*</span></label>
                <input type="date" className="form-input"
                  value={form.start_date}
                  onChange={(e) => { setForm({ ...form, start_date: e.target.value }); setPreview(null); }} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" placeholder="rahul@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            {/* CTC Input */}
            <div className="form-group">
              <label className="form-label">Annual CTC (₹) <span className="required">*</span></label>
              <div style={{ position: 'relative', maxWidth: 300 }}>
                <span style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)'
                }}>₹</span>
                <input
                  type="number"
                  className="form-input"
                  placeholder="600000"
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
                  Monthly equivalent: <strong style={{ color: 'var(--text-primary)' }}>₹{monthlyCtc?.toLocaleString('en-IN')}</strong>
                </div>
              )}
            </div>

            {/* Tax Regime */}
            <div className="form-group">
              <label className="form-label">Tax Regime <span className="required">*</span></label>
              <div className="radio-group">
                {[
                  { value: 'NEW', label: 'New Regime', desc: 'Lower rates, fewer exemptions' },
                  { value: 'OLD', label: 'Old Regime', desc: 'Higher rates, more exemptions' },
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

        <button
          type="submit"
          className="btn btn-secondary"
          disabled={previewLoading}
          style={{ marginBottom: 24 }}
        >
          {previewLoading ? (
            <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Calculating...</>
          ) : (
            <><Eye size={15} /> Preview Salary</>
          )}
        </button>
      </form>

      {/* Salary Preview */}
      {preview && (
        <div className="preview-card" style={{ marginBottom: 24 }}>
          <div className="preview-header">
            <CheckCircle size={18} style={{ color: 'var(--accent)' }} />
            <div className="preview-header-title">
              Salary Preview — {preview.structure?.version_name}
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
                  <td>Total Cost to Company</td>
                  <td><span className="amount">{fmtINR(preview.monthlyTotalCostToCompany)}</span></td>
                  <td><span className="amount">{fmtINR(preview.annualTotalCostToCompany)}</span></td>
                </tr>
              </tbody>
            </table>

            {/* Confirmation Checkbox */}
            <div style={{
              marginTop: 20,
              padding: 16,
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${ctcConfirmed ? 'var(--success)' : 'var(--border-subtle)'}`,
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={ctcConfirmed}
                  onChange={(e) => setCtcConfirmed(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--success)' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>
                    Annual CTC entered: {fmtINR(preview.annual_ctc)} — Monthly: {fmtINR(preview.monthlyCTC)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    I confirm this breakdown is correct and want to save this employee
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button
            type="button"
            className="btn btn-success"
            onClick={handleSave}
            disabled={!ctcConfirmed || saving}
          >
            {saving ? (
              <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</>
            ) : (
              <><CheckCircle size={15} /> Confirm & Save Employee</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
