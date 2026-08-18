import { createContext, useContext, useState, useCallback } from 'react';

const ClientContext = createContext(null);

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

  return (
    <ClientContext.Provider value={{ selectedClient, selectClient, clearClient }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within ClientProvider');
  return ctx;
}
