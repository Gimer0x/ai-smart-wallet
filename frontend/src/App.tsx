import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useHandleCircleReturn } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { DashboardView } from './components/DashboardView';

function App() {
  const { user, wallets, selectedWalletId, setSelectedWalletId, initialCheckDone, loading, error: authError, logout, refreshWallets, startCircleWalletCreation } = useAuth();
  const [currentView, setCurrentView] = useState('chat');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loginRedirecting, setLoginRedirecting] = useState(false);

  const { status: circleReturnStatus, error: circleReturnError } = useHandleCircleReturn();

  const handleTransferComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentView('chat');
  };

  const hasWallet = user?.hasCircleUser && wallets.length > 0;
  const needsWallet = user && (!user.hasCircleUser || wallets.length === 0);

  if (!initialCheckDone || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent)' }}>
        <div style={{ textAlign: 'center', color: 'var(--secondary)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Overlay when returning from Circle/Google redirect */}
      {(circleReturnStatus === 'verifying' || circleReturnStatus === 'challenge') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            color: 'white',
            fontSize: '1.125rem',
          }}
        >
          {circleReturnStatus === 'verifying' ? 'Verifying login...' : 'Creating wallet...'}
        </div>
      )}

      {circleReturnStatus === 'error' && circleReturnError && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '2rem',
          }}
        >
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '400px', textAlign: 'center' }}>
            <p style={{ color: '#c33', marginBottom: '1rem' }}>{circleReturnError}</p>
            <a href="/" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Back to home</a>
          </div>
        </div>
      )}

      <Sidebar
        isOpen={true}
        onNavigate={handleNavigate}
        currentView={currentView}
        selectedWalletId={selectedWalletId}
        wallets={wallets}
        onSelectWallet={setSelectedWalletId}
        user={user}
        hasWallet={!!hasWallet}
        needsWallet={!!needsWallet}
        onLogout={handleLogout}
        onCreateWallet={startCircleWalletCreation}
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
            hasWallet ? (
              <ChatInterface
                walletId={selectedWalletId ?? undefined}
                onPendingComplete={refreshWallets}
                onRequestSignIn={() => startCircleWalletCreation({ forceRedirect: true })}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div style={{ textAlign: 'center', color: 'var(--secondary)' }}>
                  {user ? (
                    <>
                      <p style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>
                        Create a wallet to start chatting with your smart wallet.
                      </p>
                      <button
                        type="button"
                        onClick={() => startCircleWalletCreation()}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Create wallet
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>
                        Sign in with Google to create or access your wallet. Device token and wallet setup run automatically.
                      </p>
                      {authError && (
                        <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#c33' }}>{authError}</p>
                      )}
                      <button
                        type="button"
                        disabled={loginRedirecting}
                        onClick={async () => {
                          setLoginRedirecting(true);
                          await startCircleWalletCreation({ forceRedirect: true });
                          setLoginRedirecting(false);
                        }}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          fontWeight: 500,
                          cursor: loginRedirecting ? 'wait' : 'pointer',
                        }}
                      >
                        {loginRedirecting ? 'Redirecting…' : 'Login with Google'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          ) : (
            <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
