import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { DashboardView } from './components/DashboardView';
import { Marketplace } from './components/Marketplace';

function App() {
  const { user, wallets, selectedWalletId, setSelectedWalletId, initialCheckDone, logout, refreshWallets } = useAuth();
  const [currentView, setCurrentView] = useState('chat');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTransferComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
  };

  const showMainApp = initialCheckDone && user?.hasCircleUser && wallets.length > 0;
  if (!showMainApp) {
    return <LoginView />;
  }

  return (
    <div className="app">
      <Sidebar
        isOpen={true}
        onNavigate={handleNavigate}
        currentView={currentView}
        selectedWalletId={selectedWalletId}
        wallets={wallets}
        onSelectWallet={setSelectedWalletId}
        onLogout={logout}
      />

      <main
        className="app-main"
        style={{
          marginLeft: '260px',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          className="app-header"
          style={{
            padding: '1rem 1.5rem',
            background: 'white',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            zIndex: 100,
          }}
        />

        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            background: currentView === 'chat' ? '#ffffff' : 'var(--accent)',
            padding: currentView === 'chat' ? '0' : '2rem',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {currentView === 'chat' ? (
            <ChatInterface walletId={selectedWalletId ?? undefined} onPendingComplete={refreshWallets} />
          ) : currentView === 'marketplace' ? (
            <Marketplace walletId={selectedWalletId ?? undefined} />
          ) : (
            <div
              style={{
                maxWidth: '1200px',
                margin: '0 auto',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
              }}
            >
              <DashboardView
                view={currentView}
                selectedWalletId={selectedWalletId}
                onSelectWallet={setSelectedWalletId}
                refreshKey={refreshKey}
                onTransferComplete={handleTransferComplete}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
