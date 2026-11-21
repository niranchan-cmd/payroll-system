import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ClientLayout from '../components/ClientLayout';
import PayrollPage from '../pages/PayrollPage';
import { ClientProvider, useClient } from '../context/ClientContext';
import api from '../services/api';

vi.mock('../services/api');

describe('Feature 17: URL Parameter Synchronization & Deep Linking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('synchronizes client context on direct navigation to /clients/:id/payroll without "No Client Selected"', async () => {
    const mockClient = {
      id: 'client-999',
      name: 'Starlight Interactive Ltd',
      state: 'Maharashtra',
      pan: 'STAR99999X',
    };

    const mockPayrollRuns = [
      {
        id: 'run-1',
        month: 11,
        year: 2026,
        status: 'FINALIZED',
        _count: { entries: 42 },
        run_by_user: { name: 'Payroll Admin' },
      },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/clients/client-999') {
        return Promise.resolve({ data: { data: mockClient } });
      }
      if (url === '/clients/client-999/payroll') {
        return Promise.resolve({ data: { data: mockPayrollRuns } });
      }
      if (url === '/clients') {
        return Promise.resolve({ data: { data: [mockClient] } });
      }
      return Promise.reject(new Error('Unknown url: ' + url));
    });

    render(
      <ClientProvider>
        <MemoryRouter initialEntries={['/clients/client-999/payroll']}>
          <Routes>
            <Route path="clients/:id" element={<ClientLayout />}>
              <Route path="payroll" element={<PayrollPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ClientProvider>
    );

    // Initial sync state
    expect(screen.getByText(/Loading client context/i)).toBeInTheDocument();

    // After API resolution, child page must render with client name and payroll runs
    await waitFor(() => {
      expect(screen.getByText('Payroll Runs')).toBeInTheDocument();
      expect(screen.getByText(/Starlight Interactive Ltd — Monthly payroll history/i)).toBeInTheDocument();
    });

    // Verify "No Client Selected" is NEVER rendered
    expect(screen.queryByText('No Client Selected')).not.toBeInTheDocument();

    // Verify API calls were properly dispatched
    expect(api.get).toHaveBeenCalledWith('/clients/client-999');
    expect(api.get).toHaveBeenCalledWith('/clients/client-999/payroll');
  });

  it('renders graceful "Client Not Found" error when client ID does not exist', async () => {
    api.get.mockImplementation((url) => {
      if (url.startsWith('/clients/non-existent-id')) {
        const error = new Error('Client not found');
        error.response = { status: 404, data: { message: 'Client not found or has been removed.' } };
        return Promise.reject(error);
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <ClientProvider>
        <MemoryRouter initialEntries={['/clients/non-existent-id/payroll']}>
          <Routes>
            <Route path="clients/:id" element={<ClientLayout />}>
              <Route path="payroll" element={<PayrollPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Client Not Found')).toBeInTheDocument();
      expect(screen.getByText('Back to Clients')).toBeInTheDocument();
    });

    // PayrollPage should NOT render on 404
    expect(screen.queryByText('Payroll Runs')).not.toBeInTheDocument();
  });
});
