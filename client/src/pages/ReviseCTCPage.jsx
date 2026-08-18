import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Eye, CheckCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

function fmtINR(n) {
  if (n === null || n === undefined) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function ReviseCTCPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [currentHistory, setCurrentHistory] = useState(null);
  const [form, setForm] = useState({ new_annual_ctc: '', effective_from: '', notes: '' });
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    api.get(`/employees/${id}`)
      .then((r) => {
        const { employee: emp, salaryBreakdown } = r.data.data;
        setEmployee(emp);
        const hist = emp.salary_histories?.find((h) => !h.effective_to);
        setCurrentHistory(hist);
      })
      .catch(() => toast.error('Failed to load employee'));
  }, [id]);

  async function handlePreview(e) {
    e.preventDefault();
    if (!form.new_annual_ctc || !form.effective_from) {
      toast.error('Please enter new CTC and effective date');
      return;
    }
    setPreviewLoading(true);
    setPreview(null);
    setConfirmed(false);
    try {
      const r = await api.post(`/employees/${id}/preview-revision`, {
        new_annual_ctc: Number(form.new_annual_ctc),
        effective_from: form.effective_from,
      });
      setPreview(r.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSave() {
    if (!confirmed) { toast.error('Please confirm the salary preview'); return; }
    setSaving(true);
    try {
      await api.post(`/employees/${id}/revise-ctc`, {
        new_annual_ctc: Number(form.new_annual_ctc),
        effective_from: form.effective_from,
        notes: form.notes,
        confirmed: true,
      });
      toast.success('CTC revised successfully!');
      navigate(`/employees/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Revision failed');
    } finally {
      setSaving(false);
    }
  }

  if (!employee) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>;

  const currentCTC = currentHistory ? Number(currentHistory.annual_ctc) : null;
  const newCTC = form.new_annual_ctc ? Number(form.new_annual_ctc) : null;
  const delta = currentCTC && newCTC ? newCTC - currentCTC : null;
  const deltaPercent = currentCTC && delta ? ((delta / currentCTC) * 100).toFixed(1) : null;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title">Revise CTC</h1>
          <p className="page-subtitle">{employee.name} ({employee.roll_no})</p>
        </div>
      </div>

      {/* Current CTC Banner */}
      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        <TrendingUp size={16} />
        <div>
          <strong>Current Annual CTC:</strong> {fmtINR(currentCTC)} &nbsp;
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            (Structure: {currentHistory?.structure_version?.version_name})
          </span>
        </div>
      </div>

      <form onSubmit={handlePreview}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><div className="card-title">New CTC Details</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">New Annual CTC (₹) <span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'var(--font-mono)'
                  }}>₹</span>
                  <input
                    type="number" className="form-input" placeholder="700000"
                    min={1} step={1}
                    value={form.new_annual_ctc}
                    onChange={(e) => { setForm({ ...form, new_annual_ctc: e.target.value }); setPreview(null); }}
                    style={{ paddingLeft: 30 }} required
                  />
                </div>
                {delta !== null && (
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>
                    Change: {' '}
                    <span style={{ color: delta >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                      {delta >= 0 ? '+' : ''}{fmtINR(delta)} ({deltaPercent}%)
                    </span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Effective From <span className="required">*</span></label>
                <input type="date" className="form-input"
                  value={form.effective_from}
                  onChange={(e) => { setForm({ ...form, effective_from: e.target.value }); setPreview(null); }} required />
                <span className="form-hint">Previous salary record closes the day before this date</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason / Notes</label>
              <textarea className="form-textarea" style={{ minHeight: 70 }}
                placeholder="Annual increment, promotion, correction..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-secondary" disabled={previewLoading} style={{ marginBottom: 24 }}>
          {previewLoading
            ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Calculating...</>
            : <><Eye size={15} /> Preview New Salary</>
          }
        </button>
      </form>

      {preview && (
        <div className="preview-card" style={{ marginBottom: 24 }}>
          <div className="preview-header">
            <CheckCircle size={18} style={{ color: 'var(--accent)' }} />
            <div className="preview-header-title">New Salary Preview — {preview.structure?.version_name}</div>
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

            <div style={{
              marginTop: 20, padding: 16,
              background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
              border: `1px solid ${confirmed ? 'var(--success)' : 'var(--border-subtle)'}`,
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--success)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>
                    New Annual CTC: {fmtINR(preview.new_annual_ctc)} — Monthly: {fmtINR(preview.monthlyCTC)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    I confirm this revision is correct. The previous salary record will be closed.
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
          <button type="button" className="btn btn-success" onClick={handleSave} disabled={!confirmed || saving}>
            {saving
              ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</>
              : <><CheckCircle size={15} /> Confirm & Save Revision</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
