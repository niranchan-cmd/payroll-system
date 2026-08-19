import { useState } from 'react';
import { Lock, Eye, EyeOff, X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully!');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password. Please check your current password.';
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
        style={{ maxWidth: 460, padding: 0 }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--accent-dim)',
                color: 'var(--accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={17} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Change Password</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Update your account security</div>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '22px' }}>
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 18, fontSize: 12.5, display: 'flex', gap: 8 }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Current Password <span className="required">*</span></label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">New Password <span className="required">*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Confirm New Password <span className="required">*</span></label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }} disabled={loading}>
              {loading ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Updating...</>
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
