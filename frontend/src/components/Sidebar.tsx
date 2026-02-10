interface SidebarProps {
  isOpen: boolean;
  onNavigate: (view: string) => void;
  currentView: string;
  selectedWalletId: string | null;
}

export function Sidebar({ isOpen, onNavigate, currentView, selectedWalletId }: SidebarProps) {
  return (
    <>
      {/* Sidebar */}
      <div
        className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          width: '260px',
          backgroundColor: '#1e293b',
          color: 'white',
          overflowY: 'auto',
          zIndex: 1000,
          borderRight: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'white', fontWeight: 500, lineHeight: 1.4 }}>
                Wallet
              </div>
              <div style={{ fontSize: '0.875rem', color: 'white', fontWeight: 500, lineHeight: 1.4 }}>
                Integrated
              </div>
              <div style={{ fontSize: '0.875rem', color: 'white', fontWeight: 500, lineHeight: 1.4 }}>
                AI
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 0 0', fontWeight: 400 }}>
              {currentView === 'chat' ? 'Chat with your smart wallet' : currentView === 'marketplace' ? 'Browse e-books' : 'Dashboard'}
            </p>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => onNavigate('chat')}
              className={`nav-button ${currentView === 'chat' ? 'nav-active' : ''}`}
              style={{
                padding: '0.75rem 1rem',
                background: currentView === 'chat' ? 'var(--primary)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: currentView === 'chat' ? 'white' : 'rgba(255,255,255,0.8)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '0.875rem',
                fontWeight: currentView === 'chat' ? 500 : 400,
                width: '100%',
              }}
            >
              Chat
            </button>

            <button
              onClick={() => onNavigate('marketplace')}
              className={`nav-button ${currentView === 'marketplace' ? 'nav-active' : ''}`}
              style={{
                padding: '0.75rem 1rem',
                background: currentView === 'marketplace' ? 'var(--primary)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: currentView === 'marketplace' ? 'white' : 'rgba(255,255,255,0.8)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '0.875rem',
                fontWeight: currentView === 'marketplace' ? 500 : 400,
                width: '100%',
              }}
            >
              Marketplace
            </button>

            <button
              onClick={() => onNavigate('wallets')}
              className={`nav-button ${currentView === 'wallets' ? 'nav-active' : ''}`}
              style={{
                padding: '0.75rem 1rem',
                background: currentView === 'wallets' ? 'var(--primary)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: currentView === 'wallets' ? 'white' : 'rgba(255,255,255,0.8)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '0.875rem',
                fontWeight: currentView === 'wallets' ? 500 : 400,
                width: '100%',
              }}
            >
              Wallets
            </button>

            {selectedWalletId && (
              <>
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', paddingLeft: '1rem' }}>
                    Wallet Details
                  </div>
                  
                  <button
                    onClick={() => onNavigate('balance')}
                    className={`nav-button ${currentView === 'balance' ? 'nav-active' : ''}`}
                    style={{
                      padding: '0.75rem 1rem',
                      background: currentView === 'balance' ? 'var(--primary)' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: currentView === 'balance' ? 'white' : 'rgba(255,255,255,0.8)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.875rem',
                      fontWeight: currentView === 'balance' ? 500 : 400,
                      width: '100%',
                    }}
                  >
                    Balance
                  </button>

                  <button
                    onClick={() => onNavigate('transactions')}
                    className={`nav-button ${currentView === 'transactions' ? 'nav-active' : ''}`}
                    style={{
                      padding: '0.75rem 1rem',
                      background: currentView === 'transactions' ? 'var(--primary)' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: currentView === 'transactions' ? 'white' : 'rgba(255,255,255,0.8)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.875rem',
                      fontWeight: currentView === 'transactions' ? 500 : 400,
                      width: '100%',
                    }}
                  >
                    Transactions
                  </button>

                  <button
                    onClick={() => onNavigate('transfer')}
                    className={`nav-button ${currentView === 'transfer' ? 'nav-active' : ''}`}
                    style={{
                      padding: '0.75rem 1rem',
                      background: currentView === 'transfer' ? 'var(--primary)' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: currentView === 'transfer' ? 'white' : 'rgba(255,255,255,0.8)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.875rem',
                      fontWeight: currentView === 'transfer' ? 500 : 400,
                      width: '100%',
                    }}
                  >
                    Transfer
                  </button>
                </div>
              </>
            )}
          </nav>

          {selectedWalletId && (
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '6px', fontSize: '0.75rem' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontWeight: 500 }}>Selected Wallet</div>
              <div style={{ wordBreak: 'break-all', fontSize: '0.7rem', color: 'rgba(255,255,255,0.9)' }}>{selectedWalletId.substring(0, 24)}...</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}