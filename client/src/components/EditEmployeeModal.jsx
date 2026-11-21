import { useState } from 'react';
import api from '../services/api';
import { X, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditEmployeeModal({ employee, isOpen, onClose, onUpdated }) {
  const currentSalary = employee?.salary_histories?.[0];
  const initialCtc = currentSalary ? currentSalary.annual_ctc : '';
  const initialStartDate = employee?.start_date
    ? new Date(employee.start_date).toISOString().split('T')[0]
    : '';

  const [form, setForm] = useState({
    name: employee?.name || '',
    roll_no: employee?.roll_no || '',
    designation: employee?.designation || '',
    department: employee?.department || '',
    email: employee?.email || '',
    start_date: initialStartDate,
    annual_ctc: initialCtc,
    tax_regime: employee?.tax_regime || 'NEW',
    status: employee?.status || 'ACTIVE',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !employee) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Employee name is required.');
      return;
    }
    if (!form.roll_no.trim()) {
      setError('Roll No is required.');
      return;
    }
    if (!form.designation.trim()) {
      setError('Designation is required.');
      return;
    }
    if (!form.start_date) {
      setError('Start date is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.patch(`/employees/${employee.id}`, {
        name: form.name.trim(),
        roll_no: form.roll_no.trim(),
        designation: form.designation.trim(),
        department: form.department.trim() || null,
        email: form.email.trim() || null,
        start_date: form.start_date,
        tax_regime: form.tax_regime,
        status: form.status,
        annual_ctc: form.annual_ctc ? Number(form.annual_ctc) : undefined,
      });

      toast.success(`Employee "${form.name}" updated successfully!`);
      if (onUpdated) onUpdated(res.data.data);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update employee details.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ fontSize: 18 }}>Edit Employee Details</h2>
            <p className="modal-subtitle">
              Modify personal details, roll no, department, or tax regime for <strong>{employee.name}</strong>
            </p>
          </div>
          <button
            type="button"
            className="btn btn-icon btn-ghost btn-sm"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div className="alert alert-danger" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Roll No / Employee ID <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={form.roll_no}
                  onChange={(e) => setForm({ ...form, roll_no: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Designation <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Joining <span className="required">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Annual CTC (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.annual_ctc}
                  min={1}
                  onChange={(e) => setForm({ ...form, annual_ctc: e.target.value })}
                  placeholder="e.g. 600000"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive / Resigned</option>
                </select>
              </div>
            </div>

            {/* Tax Regime */}
            <div className="form-group" style={{ marginTop: 4 }}>
              <label className="form-label">Tax Regime <span className="required">*</span></label>
              <div className="radio-group" style={{ display: 'flex', gap: 16 }}>
                {[
                  { value: 'NEW', label: 'New Tax Regime (Default)' },
                  { value: 'OLD', label: 'Old Tax Regime (Exemptions)' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`radio-option ${form.tax_regime === opt.value ? 'selected' : ''}`}
                    style={{ flex: 1, padding: '10px 14px' }}
                  >
                    <input
                      type="radio"
                      name="tax_regime_edit"
                      value={opt.value}
                      checked={form.tax_regime === opt.value}
                      onChange={() => setForm({ ...form, tax_regime: opt.value })}
                    />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving...</>
              ) : (
                <><Save size={15} /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
