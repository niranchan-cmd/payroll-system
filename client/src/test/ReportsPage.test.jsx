import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportsPage from '../pages/ReportsPage';
import { ClientContext } from '../context/ClientContext';
import api from '../services/api';

vi.mock('../services/api');

describe('Feature 19: ReportsPage Context & Client Filter Dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all client options in the filter dropdown from client list', async () => {
    const mockClients = [
      { id: 'client-1', name: 'Alpha Solutions Ltd' },
      { id: 'client-2', name: 'Beta Innovations Inc' },
      { id: 'client-3', name: 'Gamma Enterprises' },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/clients') {
        return Promise.resolve({ data: { data: mockClients } });
      }
      if (url === '/reports/pay-register') {
        return Promise.resolve({
          data: {
            data: {
              runs: [],
              grand_totals: {
                total_gross: 0,
                total_pf: 0,
                total_esi: 0,
                total_net: 0,
              },
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    const clientVal = {
      clients: mockClients,
      selectedClient: null,
      fetchClients: vi.fn().mockResolvedValue(mockClients),
      selectClient: vi.fn(),
      clearClient: vi.fn(),
    };

    render(
      <ClientContext.Provider value={clientVal}>
        <MemoryRouter initialEntries={['/reports']}>
          <ReportsPage />
        </MemoryRouter>
      </ClientContext.Provider>
    );

    // Wait for the report page to render
    await waitFor(() => {
      expect(screen.getByText('🏢 All Clients')).toBeInTheDocument();
      expect(screen.getByText('Alpha Solutions Ltd')).toBeInTheDocument();
      expect(screen.getByText('Beta Innovations Inc')).toBeInTheDocument();
      expect(screen.getByText('Gamma Enterprises')).toBeInTheDocument();
    });

    // Verify select element has 4 options (All + 3 clients)
    const select = screen.getByDisplayValue('🏢 All Clients');
    expect(select.children.length).toBe(4);
  });

  it('pre-selects active client in dropdown filter when selectedClient exists in context', async () => {
    const mockClients = [
      { id: 'client-1', name: 'Alpha Solutions Ltd' },
      { id: 'client-2', name: 'Beta Innovations Inc' },
    ];

    api.get.mockImplementation((url) => {
      if (url === '/reports/pay-register') {
        return Promise.resolve({
          data: {
            data: {
              runs: [],
              grand_totals: {},
            },
          },
        });
      }
      return Promise.resolve({ data: { data: mockClients } });
    });

    const clientVal = {
      clients: mockClients,
      selectedClient: mockClients[1], // Beta Innovations Inc
      fetchClients: vi.fn().mockResolvedValue(mockClients),
      selectClient: vi.fn(),
      clearClient: vi.fn(),
    };

    render(
      <ClientContext.Provider value={clientVal}>
        <MemoryRouter initialEntries={['/reports']}>
          <ReportsPage />
        </MemoryRouter>
      </ClientContext.Provider>
    );

    await waitFor(() => {
      // The select value should match Beta Innovations Inc (client-2)
      const select = screen.getByDisplayValue('Beta Innovations Inc');
      expect(select.value).toBe('client-2');
    });
  });

  it('prevents race conditions when switching client filters rapidly (out-of-order responses)', async () => {
    const mockClients = [
      { id: 'client-1', name: 'Alpha Solutions Ltd' },
      { id: 'client-2', name: 'Beta Innovations Inc' },
    ];

    let resolveClient1;
    let resolveClient2;

    const promiseClient1 = new Promise((resolve) => {
      resolveClient1 = resolve;
    });
    const promiseClient2 = new Promise((resolve) => {
      resolveClient2 = resolve;
    });

    api.get.mockImplementation((url, config) => {
      if (url === '/clients') {
        return Promise.resolve({ data: { data: mockClients } });
      }
      if (url === '/reports/pay-register') {
        const clientId = config?.params?.clientId;
        if (clientId === 'client-1') {
          return promiseClient1;
        }
        if (clientId === 'client-2') {
          return promiseClient2;
        }
        return Promise.resolve({
          data: {
            data: {
              runs: [],
              grand_totals: { total_net: 0 },
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    const clientVal = {
      clients: mockClients,
      selectedClient: null,
      fetchClients: vi.fn().mockResolvedValue(mockClients),
      selectClient: vi.fn(),
      clearClient: vi.fn(),
    };

    render(
      <ClientContext.Provider value={clientVal}>
        <MemoryRouter initialEntries={['/reports']}>
          <ReportsPage />
        </MemoryRouter>
      </ClientContext.Provider>
    );

    // Initial render complete
    await waitFor(() => {
      expect(screen.getByDisplayValue('🏢 All Clients')).toBeInTheDocument();
    });

    const select = screen.getByDisplayValue('🏢 All Clients');

    // 1. User switches dropdown to client-1 (slow response in flight)
    fireEvent.change(select, { target: { value: 'client-1' } });

    // 2. User rapidly changes dropdown to client-2 before client-1 responds
    fireEvent.change(select, { target: { value: 'client-2' } });

    // 3. Resolve client-2 first (faster response)
    resolveClient2({
      data: {
        data: {
          runs: [
            {
              id: 'run-client-2',
              period_label: 'Feb 2026',
              status: 'FINALIZED',
              client: { name: 'Beta Innovations Inc' },
              totals: {
                count: 10,
                gross: 300000,
                basic: 150000,
                employee_pf: 18000,
                employee_esi: 2250,
                total_deductions: 20250,
                net_pay: 222222,
              },
              entries: [],
            },
          ],
          grand_totals: {
            total_net_pay: 222222,
            total_gross: 300000,
            total_basic: 150000,
            total_deductions: 20250,
            total_employee_pf: 18000,
            total_employee_esi: 2250,
            total_employer_pf: 18000,
            total_employer_esi: 4875,
            total_ctc_cost: 322875,
            total_employees: 10,
            total_runs: 1,
          },
        },
      },
    });

    // Client-2 data appears in the view
    await waitFor(() => {
      expect(screen.getByText('Feb 2026')).toBeInTheDocument();
      expect(screen.getAllByText('₹2,22,222').length).toBeGreaterThanOrEqual(1);
    });

    // 4. Resolve client-1 second (out-of-order delayed response)
    resolveClient1({
      data: {
        data: {
          runs: [
            {
              id: 'run-client-1',
              period_label: 'Jan 2026',
              status: 'FINALIZED',
              client: { name: 'Alpha Solutions Ltd' },
              totals: {
                count: 5,
                gross: 150000,
                basic: 75000,
                employee_pf: 9000,
                employee_esi: 1125,
                total_deductions: 10125,
                net_pay: 111111,
              },
              entries: [],
            },
          ],
          grand_totals: {
            total_net_pay: 111111,
            total_gross: 150000,
            total_basic: 75000,
            total_deductions: 10125,
            total_employee_pf: 9000,
            total_employee_esi: 1125,
            total_employer_pf: 9000,
            total_employer_esi: 2437,
            total_ctc_cost: 161437,
            total_employees: 5,
            total_runs: 1,
          },
        },
      },
    });

    // Small delay to allow microtask queue to process any potential state updates
    await new Promise((r) => setTimeout(r, 50));

    // Stale client-1 data MUST NOT overwrite client-2 data
    expect(screen.getByText('Feb 2026')).toBeInTheDocument();
    expect(screen.getAllByText('₹2,22,222').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Jan 2026')).not.toBeInTheDocument();
    expect(screen.queryByText('₹1,11,111')).not.toBeInTheDocument();
    expect(select.value).toBe('client-2');
  });
});
