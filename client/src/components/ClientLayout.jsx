import { useState, useEffect } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import api from '../services/api';
import { AlertCircle, Building2 } from 'lucide-react';

export default function ClientLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedClient, selectClient } = useClient();

  const [loading, setLoading] = useState(
    !selectedClient || selectedClient.id !== id
  );
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function syncClient() {
      // If client is already in sync, skip fetch
      if (selectedClient && selectedClient.id === id) {
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await api.get(`/clients/${id}`);
        const clientData = res.data?.data;
        if (isMounted) {
          if (clientData) {
            selectClient(clientData);
          } else {
            setError({ status: 404, message: 'Client record not found' });
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          const status = err.response?.status || 500;
          const message =
            err.response?.data?.message ||
            (status === 404
              ? 'Client not found or has been removed.'
              : 'Failed to synchronize client context.');
          setError({ status, message });
          setLoading(false);
        }
      }
    }

    if (id) {
      syncClient();
    }

    return () => {
      isMounted = false;
    };
  }, [id, selectedClient?.id, selectClient]);

  // Loading state while synchronizing from API
  if (loading) {
    return (
      <div className="loading-page" style={{ minHeight: 350 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>
          Loading client context...
        </p>
      </div>
    );
  }

  // Error / 404 state
  if (error) {
    return (
      <div className="empty-state" style={{ padding: '60px 20px' }}>
        <div className="empty-icon" style={{ color: 'var(--danger)' }}>
          <AlertCircle size={32} />
        </div>
        <div className="empty-title">Client Not Found</div>
        <p className="empty-desc">
          {error.status === 404
            ? 'The client you are looking for does not exist or has been removed.'
            : error.message}
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/clients')}
          style={{ marginTop: 16 }}
        >
          <Building2 size={15} style={{ marginRight: 6 }} /> Back to Clients
        </button>
      </div>
    );
  }

  // Render nested child route, providing client context via outlet context
  return <Outlet context={{ client: selectedClient }} />;
}
