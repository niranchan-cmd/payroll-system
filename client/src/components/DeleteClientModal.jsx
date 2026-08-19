import { useState } from 'react';
import { Trash2, AlertTriangle, Lock, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function DeleteClientModal({ client, isOpen, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !client) return null;

  const isNameMatch = confirmName.trim().toLowerCase() === client.name.trim().toLowerCase();

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Account password is required for security verification.');
      return;
    }
    if (!isNameMatch) {
      setError(`Please type "${client.name}" exactly to confirm.`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.delete(`/clients/${client.id}`, {
        data: { password },
      });
      toast.success(`Client "${client.name}" deleted successfully.`);
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete client. Please check your password.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payslip-modal-backdrop" onClick={onClose} style={{ zIndex: 3000 }}>
      <div
        className="payslip-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, padding: 0 }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--danger)' }}>
            <Trash2 size={20} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Delete Client Company</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleDelete} style={{ padding: '22px' }}>
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              marginBottom: 20,
              display: 'flex',
              gap: 12,
            }}
          >
            <AlertTriangle size={22} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 2 }}>
                Permanent & Destructive Action
              </strong>
              Deleting <strong>{client.name}</strong> will permanently remove all associated employees, salary structures, payroll records, and generated payslips.
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16, fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Confirm Name */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontSize: 12.5 }}>
              Type the client name <strong>"{client.name}"</strong> to confirm:
            </label>
            <input
              type="text"
              className="form-input"
              placeholder={client.name}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              required
            />
          </div>

          {/* Password Authentication (Non-negotiable) */}
          <div className="form-group" style={{ marginBottom: 22 }}>
            <label className="form-label" style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={13} style={{ color: 'var(--warning)' }} />
              <strong>Account Password (Required for Authentication):</strong>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter your login password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Non-negotiable security verification required before deleting any client data.
            </span>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={loading || !password || !isNameMatch}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 15, height: 15 }} /> Verifying & Deleting...</>
              ) : (
                <><Trash2 size={15} /> Confirm Permanent Deletion</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
