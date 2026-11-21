import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext';
import { ClientContext } from '../context/ClientContext';

function renderSidebar({
  pathname = '/dashboard',
  user = { id: 'u1', name: 'Niranchan Admin', role: 'ADMIN' },
  selectedClient = null,
  isOpen = false,
  onClose = vi.fn(),
  onOpenChangePassword = vi.fn(),
  logout = vi.fn(),
} = {}) {
  const authVal = { user, logout, loading: false };
  const clientVal = { selectedClient, selectClient: vi.fn(), clearClient: vi.fn(), clients: [] };

  return render(
    <AuthContext.Provider value={authVal}>
      <ClientContext.Provider value={clientVal}>
        <MemoryRouter initialEntries={[pathname]}>
          <Sidebar
            isOpen={isOpen}
            onClose={onClose}
            onOpenChangePassword={onOpenChangePassword}
          />
        </MemoryRouter>
      </ClientContext.Provider>
    </AuthContext.Provider>
  );
}

describe('Dual-Mode Navigation Sidebar Component', () => {
  it('renders all standard global navigation items in global mode', () => {
    renderSidebar({ pathname: '/dashboard' });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('Payroll Hub')).toBeInTheDocument();
    expect(screen.getByText('Pay Register & Reports')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // In global mode without /clients/:id path, client workspace should NOT render
    expect(screen.queryByText('Client Workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('CTC Structure')).not.toBeInTheDocument();
  });

  it('conditionally renders Admin Panel link for ADMIN and SUPER_ADMIN users only', () => {
    // 1. Admin user
    const { unmount } = renderSidebar({
      pathname: '/dashboard',
      user: { id: 'u1', name: 'Super User', role: 'SUPER_ADMIN' },
    });
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    unmount();

    // 2. Regular viewer user
    renderSidebar({
      pathname: '/dashboard',
      user: { id: 'u2', name: 'Regular Viewer', role: 'VIEWER' },
    });
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('dynamically enters Client Workspace mode when URL matches /clients/:id/*', () => {
    const mockClient = {
      id: 'c101',
      name: 'Acme Technologies Pvt Ltd',
      state: 'Karnataka',
      pan: 'ABCDE1234F',
    };

    renderSidebar({
      pathname: '/clients/c101/payroll',
      selectedClient: mockClient,
    });

    // Client workspace header and context card
    expect(screen.getByText('Client Workspace')).toBeInTheDocument();
    expect(screen.getByText('Active Client')).toBeInTheDocument();
    expect(screen.getByText('Acme Technologies Pvt Ltd')).toBeInTheDocument();
    expect(screen.getByText('Karnataka')).toBeInTheDocument();
    expect(screen.getByText('PAN: ABCDE1234F')).toBeInTheDocument();
    expect(screen.getByText('All Clients')).toBeInTheDocument();

    // Client-scoped sub-routes
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('CTC Structure')).toBeInTheDocument();
    expect(screen.getAllByText('Employees').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Payroll Runs')).toBeInTheDocument();
    expect(screen.getByText('Bulk Import')).toBeInTheDocument();
  });

  it('applies exact active matching to avoid false positive active indicator', () => {
    renderSidebar({
      pathname: '/clients/c101/payroll',
      selectedClient: { id: 'c101', name: 'Acme Technologies' },
    });

    const payrollRunsLink = screen.getByText('Payroll Runs').closest('a');
    expect(payrollRunsLink).toHaveClass('active');

    // Global "Clients" link (/clients) has end={true}, so it should NOT be active on /clients/c101/payroll
    const globalClientsLink = screen.getByRole('link', { name: /^Clients$/i });
    expect(globalClientsLink).not.toHaveClass('active');

    // Client "Overview" link (/clients/c101) has end={true}, so it should NOT be active on /clients/c101/payroll
    const overviewLink = screen.getByText('Overview').closest('a');
    expect(overviewLink).not.toHaveClass('active');
  });

  it('manages mobile responsive drawer states and callbacks', () => {
    const handleClose = vi.fn();
    renderSidebar({
      pathname: '/dashboard',
      isOpen: true,
      onClose: handleClose,
    });

    // Sidebar should have .open class
    const sidebarEl = document.querySelector('.sidebar');
    expect(sidebarEl).toHaveClass('open');

    // Backdrop should exist
    const backdrop = document.querySelector('.sidebar-backdrop');
    expect(backdrop).toBeInTheDocument();

    // Clicking backdrop calls onClose
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Clicking close button calls onClose
    const closeBtn = screen.getByLabelText('Close menu');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
