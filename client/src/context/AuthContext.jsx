import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('payroll_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Restore or verify session
  useEffect(() => {
    async function restoreSession() {
      const cachedToken = localStorage.getItem('payroll_access_token');
      if (cachedToken) {
        window.__payroll_access_token__ = cachedToken;
      }

      try {
        // Attempt to fetch profile with existing token
        const meRes = await api.get('/auth/me');
        const userData = meRes.data.data;
        setUser(userData);
        localStorage.setItem('payroll_user', JSON.stringify(userData));
      } catch (meErr) {
        // Token might be expired, try refresh
        try {
          const res = await api.post('/auth/refresh');
          const { accessToken, user: me } = res.data.data;
          window.__payroll_access_token__ = accessToken;
          localStorage.setItem('payroll_access_token', accessToken);
          setUser(me);
          localStorage.setItem('payroll_user', JSON.stringify(me));
        } catch {
          // Both failed, clear session
          window.__payroll_access_token__ = null;
          localStorage.removeItem('payroll_access_token');
          localStorage.removeItem('payroll_user');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // Listen for forced logout events
  useEffect(() => {
    const handler = () => {
      setUser(null);
      window.__payroll_access_token__ = null;
      localStorage.removeItem('payroll_access_token');
      localStorage.removeItem('payroll_user');
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user: loggedIn } = res.data.data;
    window.__payroll_access_token__ = accessToken;
    localStorage.setItem('payroll_access_token', accessToken);
    localStorage.setItem('payroll_user', JSON.stringify(loggedIn));
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    window.__payroll_access_token__ = null;
    localStorage.removeItem('payroll_access_token');
    localStorage.removeItem('payroll_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
