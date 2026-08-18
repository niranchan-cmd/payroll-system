import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ClientProvider } from './context/ClientContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ClientProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13.5px',
                boxShadow: 'var(--shadow-md)',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#0b0f1a' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#0b0f1a' } },
            }}
          />
        </ClientProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
