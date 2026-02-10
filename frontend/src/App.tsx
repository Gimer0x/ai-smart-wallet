import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { DashboardView } from './components/DashboardView';
import { Marketplace } from './components/Marketplace';

function App() {
  const [currentView, setCurrentView] = useState('chat');
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTransferComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
  };

  return (
    <div className="app">
      <Sidebar
        isOpen={true}
        onNavigate={handleNavigate}
        currentView={currentView}
        selectedWalletId={selectedWalletId}
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
        {/* Header */}
        <header
          className="app-header"
          style={{
            padding: '1rem 1.5rem',
            background: 'white',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            zIndex: 100,
          }}
        >
        </header>

        {/* Main Content */}
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
            <ChatInterface />
          ) : currentView === 'marketplace' ? (
            <Marketplace walletId={selectedWalletId || undefined} />
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