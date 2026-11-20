import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import CTCStructurePage from './pages/CTCStructurePage';
import CTCStructureFormPage from './pages/CTCStructureFormPage';
import EmployeesPage from './pages/EmployeesPage';
import AddEmployeePage from './pages/AddEmployeePage';
import EmployeeProfilePage from './pages/EmployeeProfilePage';
import ReviseCTCPage from './pages/ReviseCTCPage';
import PayrollPage from './pages/PayrollPage';
import RunPayrollPage from './pages/RunPayrollPage';
import PayrollRunDetailPage from './pages/PayrollRunDetailPage';
import BulkImportPage from './pages/BulkImportPage';
import ReportsPage from './pages/ReportsPage';
import AdminPage from './pages/AdminPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-page">
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</p>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="clients/:id/structure" element={<CTCStructurePage />} />
        <Route path="clients/:id/structure/new" element={<CTCStructureFormPage />} />
        <Route path="clients/:id/employees" element={<EmployeesPage />} />
        <Route path="clients/:id/employees/new" element={<AddEmployeePage />} />
        <Route path="clients/:id/employees/import" element={<BulkImportPage />} />
        <Route path="clients/:id/payroll" element={<PayrollPage />} />
        <Route path="clients/:id/payroll/run" element={<RunPayrollPage />} />
        <Route path="clients/:id/payroll/:runId" element={<PayrollRunDetailPage />} />
        <Route path="employees/:id" element={<EmployeeProfilePage />} />
        <Route path="employees/:id/revise" element={<ReviseCTCPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
