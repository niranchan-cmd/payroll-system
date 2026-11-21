import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const hasToasted = useRef(false);

  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

  useEffect(() => {
    if (!loading && !isAdmin && !hasToasted.current) {
      toast.error('Access denied: Administrator privileges required.');
      hasToasted.current = true;
    }
  }, [loading, isAdmin]);

  if (loading) {
    return (
      <div className="loading-page" style={{ minHeight: 300 }}>
        <div className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}
