import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';

export const ClientContext = createContext(null);

const SESSION_KEY = 'payroll_selected_client';

function getStoredClient() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ClientProvider({ children }) {
  const [selectedClient, setSelectedClientState] = useState(getStoredClient);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      setLoadingClients(true);
      const res = await api.get('/clients');
      const list = res.data?.data || [];
      setClients(list);
      return list;
    } catch (err) {
      console.error('Failed to load clients list:', err);
      return [];
    } finally {
      setLoadingClients(false);
    }
  }, []);

  // Pre-load clients list once on mount
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const selectClient = useCallback((client) => {
    if (client) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(client));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
    setSelectedClientState(client);
  }, []);

  const clearClient = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setSelectedClientState(null);
  }, []);

  const syncClientFromId = useCallback(async (id) => {
    if (!id) return null;
    if (selectedClient && selectedClient.id === id) {
      return selectedClient;
    }
    try {
      const res = await api.get(`/clients/${id}`);
      const client = res.data?.data;
      if (client) {
        selectClient(client);
        return client;
      }
    } catch (err) {
      console.error('Failed to sync client from id:', err);
      throw err;
    }
    return null;
  }, [selectedClient, selectClient]);

  return (
    <ClientContext.Provider
      value={{
        clients,
        loadingClients,
        fetchClients,
        selectedClient,
        selectClient,
        clearClient,
        syncClientFromId,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within ClientProvider');
  return ctx;
}
