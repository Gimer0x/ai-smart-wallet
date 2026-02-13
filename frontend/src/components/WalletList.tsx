import { useState, useEffect } from 'react';
import { walletApi, type Wallet } from '../services/api';

// Wallet name mapping by address
const WALLET_NAMES: Record<string, string> = {
  '0x75f100ee75a0e529aacced263de7a8f0e9f9c2a2': 'Marketplace wallet',
  '0x7d9fd7c1c4cf4f8ef737bfd22f84890706675af0': 'Personal wallet',
};

// Helper function to get wallet name
const getWalletName = (address: string): string => {
  return WALLET_NAMES[address.toLowerCase()] || 'Wallet';
};

interface WalletListProps {
  onSelectWallet?: (walletId: string) => void;
  selectedWalletId?: string | null;
}

export function WalletList({ onSelectWallet, selectedWalletId }: WalletListProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await walletApi.listWallets();
      setWallets(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="card">Loading wallets...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <p style={{ color: '#e74c3c' }}>Error: {error}</p>
        <button onClick={loadWallets}>Retry</button>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="card">
        <h2>Wallets</h2>
        <p>No wallets found. Create wallets using the CLI scripts.</p>
        <button onClick={loadWallets}>Refresh</button>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Wallets ({wallets.length})</h2>
        <button onClick={loadWallets} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
          Refresh
        </button>
      </div>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            onClick={() => onSelectWallet?.(wallet.id)}
            style={{
              border: selectedWalletId === wallet.id ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.1)',
              borderRadius: '6px',
              padding: '1rem',
              backgroundColor: selectedWalletId === wallet.id ? 'rgba(99, 102, 241, 0.05)' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (selectedWalletId !== wallet.id) {
                e.currentTarget.style.backgroundColor = 'var(--accent)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedWalletId !== wallet.id) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
              }
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: '0.25rem' }}>
                  {getWalletName(wallet.address)}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--secondary)', opacity: 0.7 }}>
                  {wallet.blockchain}
                </div>
              </div>
              <span
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: wallet.state === 'LIVE' ? 'var(--primary)' : 'var(--secondary)',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {wallet.state}
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '0.5rem', opacity: 0.8 }}>
              <div>Type: {wallet.accountType}</div>
              <div style={{ wordBreak: 'break-all', marginTop: '0.25rem' }}>
                Address: {wallet.address}
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', opacity: 0.6 }}>
              ID: {wallet.id}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}