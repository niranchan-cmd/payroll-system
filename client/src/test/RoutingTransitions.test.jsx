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
        return Promise.resolve({ data: { data: [{ id: 'c1', name: 'Client One' }] } });
      }
      if (url === '/dashboard/stats') {
        return Promise.resolve({ data: { data: { clients: 1, employees: 5, payrollRuns: 2 } } });
      }
      if (url === '/reports/pay-register') {
        return Promise.resolve({ data: { data: { runs: [], grand_totals: {} } } });
      }
      if (url.includes('/employees')) {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url.includes('/payroll')) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: {} } });
    });
  });

  it('redirects root "/" to canonical "/dashboard"', async () => {
    renderAppWithRoute('/');
    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    });
  });

  it('navigates directly to dedicated /employees directory', async () => {
    renderAppWithRoute('/employees');
    await waitFor(() => {
      expect(screen.getByText('Global Employees Directory')).toBeInTheDocument();
      expect(screen.getByText(/Search, filter, and manage employees across all client organizations/i)).toBeInTheDocument();
    });
  });

  it('navigates directly to dedicated /payroll hub', async () => {
    renderAppWithRoute('/payroll');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Payroll Hub' })).toBeInTheDocument();
      expect(screen.getByText(/Cross-client payroll processing center/i)).toBeInTheDocument();
    });
  });

  it('navigates directly to dedicated /settings page', async () => {
    renderAppWithRoute('/settings');
    await waitFor(() => {
      expect(screen.getByText('User Account Settings')).toBeInTheDocument();
      expect(screen.getByText('Security & Password')).toBeInTheDocument();
      expect(screen.getByText('Visual Appearance & Palette')).toBeInTheDocument();
    });
  });

  it('navigates to /admin placeholder when user has ADMIN role', async () => {
    renderAppWithRoute('/admin', 'ADMIN');
    await waitFor(() => {
      expect(screen.getByText('Administration Console')).toBeInTheDocument();
      expect(screen.getByText('Statutory Limits & Settings')).toBeInTheDocument();
    });
  });

  it('blocks non-admin users from /admin and bounces to /dashboard', async () => {
    renderAppWithRoute('/admin', 'VIEWER');
    await waitFor(() => {
      expect(screen.queryByText('Administration Console')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('redirects unknown route to /dashboard', async () => {
    renderAppWithRoute('/unknown/random/path');
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
