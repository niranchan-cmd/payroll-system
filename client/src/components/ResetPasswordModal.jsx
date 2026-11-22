import { ShieldAlert, X } from 'lucide-react';

export default function ResetPasswordModal({ isOpen, onClose, initialEmail = '' }) {
  if (!isOpen) return null;

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
                background: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--danger, #ef4444)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={17} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Password Reset</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Ploy.pe Security Notice</div>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Informative Guidance */}
        <div style={{ padding: '24px' }}>
          <div
            className="alert"
            style={{
              marginBottom: 18,
              fontSize: 13,
              lineHeight: 1.5,
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 8,
              padding: '12px 14px',
              color: 'var(--accent-light, #60a5fa)',
            }}
          >
            Self-service password resets are disabled to safeguard client and payroll records.
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
            To reset your credentials, please contact your designated system administrator or IT helpdesk:
          </p>

          <div
            style={{
              padding: '12px 16px',
              background: 'var(--bg-input, #1e293b)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              fontFamily: 'monospace',
              fontSize: 13.5,
              color: 'var(--accent-light, #93c5fd)',
              marginBottom: 16,
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            admin@payroll.com
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 22 }}>
            If you are currently signed in, you can update your password at any time via Settings → Change Password.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={onClose}
          >
            Understood — Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
