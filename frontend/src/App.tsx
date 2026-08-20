import { useState, useEffect } from 'react';
import { api } from './api';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';

type Tab = 'dashboard' | 'settings';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    api.checkAuth()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false));
  }, []);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = async () => {
    await api.logout();
    setAuthenticated(false);
  };

  // Loading state
  if (authenticated === null) {
    return (
      <div className="login-container">
        <div style={{ color: 'var(--text-muted)' }}>Carregando...</div>
      </div>
    );
  }

  // Login screen
  if (!authenticated) {
    return <Login onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>⚡ LeadFlowz</h1>
        <div className="header-actions">
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 Dashboard
            </button>
            <button
              className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ Configurações
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      {activeTab === 'dashboard' && <Dashboard showToast={showToast} />}
      {activeTab === 'settings' && <Settings showToast={showToast} />}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
