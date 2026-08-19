import { useState } from 'react';
import { KeyRound, Eye, EyeOff, X, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPasswordModal({ isOpen, onClose, initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        newPassword,
        confirmPassword,
      });
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password. Please check the email.';
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
              <KeyRound size={17} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Reset Password</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Ploye.pe by NH Associates</div>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle size={30} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Password Reset Complete</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Your password for <strong>{email}</strong> has been updated. You can now sign in with your new password.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={onClose}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '22px' }}>
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 18, fontSize: 12.5, display: 'flex', gap: 8 }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Registered Email Address <span className="required">*</span></label>
              <input
                type="email"
                className="form-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  'Reset Password'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
