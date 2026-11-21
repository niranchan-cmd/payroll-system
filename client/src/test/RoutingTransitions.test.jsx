import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AuthContext } from '../context/AuthContext';
import { ClientContext } from '../context/ClientContext';
import { ThemeContext } from '../context/ThemeContext';
import api from '../services/api';

vi.mock('../services/api');

function renderAppWithRoute(initialRoute = '/', role = 'ADMIN') {
  const user = { id: 'u1', name: 'Test User', email: 'test@ploye.pe', role };
  const authVal = { user, loading: false, logout: vi.fn() };
  const clientVal = {
    selectedClient: null,
    clients: [
      { id: 'c1', name: 'Client One', state: 'Delhi' },
      { id: 'c2', name: 'Client Two', state: 'Karnataka' },
    ],
    loadingClients: false,
    fetchClients: vi.fn().mockResolvedValue([]),
    selectClient: vi.fn(),
    clearClient: vi.fn(),
    syncClientFromId: vi.fn(),
  };
  const themeVal = {
    theme: 'midnight',
    setTheme: vi.fn(),
    themes: [
      { id: 'midnight', name: 'Midnight', primary: '#3b82f6', bg: '#0b0f19' },
      { id: 'light', name: 'Clean Light', primary: '#2563eb', bg: '#ffffff' },
    ],
  };

  return render(
    <AuthContext.Provider value={authVal}>
      <ClientContext.Provider value={clientVal}>
        <ThemeContext.Provider value={themeVal}>
          <MemoryRouter initialEntries={[initialRoute]}>
            <App />
          </MemoryRouter>
        </ThemeContext.Provider>
      </ClientContext.Provider>
    </AuthContext.Provider>
  );
}

describe('Feature 16: Multi-Page Routing Transitions & Dedicated Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/clients') {
        return Promise.resolve({ data: { data: [{ id: 'c1', name: 'Client One', state: 'Delhi' }] } });
      }
      if (url === '/dashboard/stats') {
        return Promise.resolve({ data: { data: { clients: 1, employees: 5, payrollRuns: 2 } } });
      }
      if (url === '/reports/pay-register') {
        return Promise.resolve({ data: { data: { runs: [], grand_totals: {} } } });
      }
      if (url === '/admin/clients-summary') {
        return Promise.resolve({ data: { data: [{ id: 'c1', name: 'Client One', is_active: true, employees_count: 5 }] } });
      }
      if (url === '/admin/users') {
        return Promise.resolve({ data: { data: [{ id: 'u1', name: 'Admin', email: 'admin@ploy.pe', role: 'ADMIN' }] } });
      }
      if (url === '/admin/audit-logs') {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === '/leads/admin') {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('/employees')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('/payroll')) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders landing page at root "/"', async () => {
    renderAppWithRoute('/');
    await waitFor(() => {
      expect(screen.getByText(/Request Callback/i)).toBeInTheDocument();
      expect(screen.getByText(/Our Models/i)).toBeInTheDocument();
    });
  });

  it('navigates directly to dedicated /dashboard', async () => {
    renderAppWithRoute('/dashboard');
    await waitFor(() => {
      expect(screen.getByText(/Corporate Payroll Command Center/i)).toBeInTheDocument();
    });
  });

  it('navigates directly to dedicated /reports page', async () => {
    renderAppWithRoute('/reports');
    await waitFor(() => {
      expect(screen.getByText('Pay Register & Salary Reports')).toBeInTheDocument();
    });
  });

  it('navigates directly to dedicated /clients directory', async () => {
    renderAppWithRoute('/clients');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Clients' })).toBeInTheDocument();
    });
  });

  it('navigates to /admin when user has ADMIN role', async () => {
    renderAppWithRoute('/admin', 'ADMIN');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Admin Panel' })).toBeInTheDocument();
      expect(screen.getByText('Client Organizations Overview')).toBeInTheDocument();
    });
  });

  it('blocks non-admin users from accessing /admin', async () => {
    renderAppWithRoute('/admin', 'VIEWER');
    await waitFor(() => {
      expect(screen.getByText(/Corporate Payroll Command Center/i)).toBeInTheDocument();
    });
  });

  it('redirects unknown route to root "/"', async () => {
    renderAppWithRoute('/unknown/random/path');
    await waitFor(() => {
      expect(screen.getByText(/Request Callback/i)).toBeInTheDocument();
    });
  });
});
