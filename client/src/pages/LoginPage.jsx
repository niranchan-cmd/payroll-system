import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn, AlertTriangle, ShieldAlert } from 'lucide-react';
import ThemeSelector from '../components/ThemeSelector';
import ResetPasswordModal from '../components/ResetPasswordModal';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Lockout & Inactivity state
  const [lockoutInfo, setLockoutInfo] = useState(null); // { remainingMinutes }
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [countdown, setCountdown] = useState(null); // seconds

  const searchParams = new URLSearchParams(window.location.search);
  const inactivityLogout = searchParams.get('reason') === 'inactivity';

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutInfo) return;
    let seconds = (lockoutInfo.remainingMinutes || 10) * 60;
    setCountdown(seconds);
    const interval = setInterval(() => {
      seconds -= 1;
      setCountdown(seconds);
      if (seconds <= 0) {
        clearInterval(interval);
        setLockoutInfo(null);
        setCountdown(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutInfo]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      if (err.response?.status === 429) {
        const remainingMinutes = err.response.data?.remainingMinutes || 10;
        setLockoutInfo({ remainingMinutes });
        setAttemptsLeft(null);
        setError(`Account locked. Try again in ${remainingMinutes} minutes.`);
      } else if (err.response?.status === 401 && err.response.data?.attemptsRemaining !== undefined) {
        setAttemptsLeft(err.response.data.attemptsRemaining);
        setLockoutInfo(null);
        setError(`Invalid credentials. ${err.response.data.attemptsRemaining} attempt(s) remaining before account lockout.`);
      } else {
        const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: 24,
        position: 'relative',
      }}
    >
      {/* Top right theme switcher */}
      <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 10 }}>
        <ThemeSelector />
      </div>
      {/* Background texture */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'radial-gradient(ellipse at 20% 50%, rgba(79,110,247,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(79,110,247,0.04) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 40,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              background: 'var(--accent)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 900,
              color: '#fff',
              fontFamily: 'var(--font-heading)',
              boxShadow: '0 4px 20px rgba(79,110,247,0.4)',
              letterSpacing: '-0.02em',
            }}
          >
            NH
          </div>
          <div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                fontFamily: 'var(--font-heading)',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Ploye.pe
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              by NH Associates
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: 36,
          }}
        >
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, marginBottom: 6 }}>Sign in</h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
              Enter your credentials to access the dashboard
            </p>
          </div>

          {/* Inactivity Logout Notice */}
          {inactivityLogout && (
            <div
              style={{
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: 20,
                color: '#eab308',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>You were automatically signed out due to 30 minutes of inactivity for security.</span>
            </div>
          )}

          {/* Lockout Active Banner */}
          {lockoutInfo && countdown !== null && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: 20,
                color: '#ef4444',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <ShieldAlert size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', marginBottom: 2 }}>Account Locked</strong>
                Too many failed attempts. Try again in{' '}
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </span>
              </div>
            </div>
          )}

          {/* Attempts remaining warning */}
          {attemptsLeft !== null && !lockoutInfo && (
            <div
              style={{
                background: 'rgba(249, 115, 22, 0.12)',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                marginBottom: 20,
                color: '#f97316',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>
                Incorrect password. <strong>{attemptsLeft}</strong> attempt{attemptsLeft !== 1 ? 's' : ''} remaining before temporary lockout.
              </span>
            </div>
          )}

          {error && !lockoutInfo && attemptsLeft === null && (
            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email address <span className="required">*</span>
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
                autoComplete="email"
                disabled={loading || !!lockoutInfo}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>
                  Password <span className="required">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  disabled={loading || !!lockoutInfo}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-light)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  disabled={loading || !!lockoutInfo}
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    padding: 4,
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !!lockoutInfo}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Signing in...
                </>
              ) : lockoutInfo ? (
                <>
                  <ShieldAlert size={16} />
                  Locked Out
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          Ploye.pe v1.0 — by NH Associates
        </p>
      </div>

      {/* Self-service Password Reset Modal */}
      {showResetModal && (
        <ResetPasswordModal
          isOpen={showResetModal}
          initialEmail={form.email}
          onClose={() => setShowResetModal(false)}
        />
      )}
    </div>
  );
}
