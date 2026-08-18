import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Try to restore session on mount via refresh token (stored as httpOnly cookie)
  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await api.post('/auth/refresh');
        const { accessToken, user: me } = res.data.data;
        window.__payroll_access_token__ = accessToken;

        // Fetch full user profile
        const meRes = await api.get('/auth/me');
        setUser(meRes.data.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // Listen for forced logout events from the API interceptor
  useEffect(() => {
    const handler = () => {
      setUser(null);
      window.__payroll_access_token__ = null;
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user: loggedIn } = res.data.data;
    window.__payroll_access_token__ = accessToken;
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    window.__payroll_access_token__ = null;
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
