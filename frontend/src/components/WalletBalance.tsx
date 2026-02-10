import { useState, useEffect } from 'react';
import { walletApi } from '../services/api';

interface TokenBalance {
  token: {
    id: string;
    symbol: string;
    name: string;
    blockchain: string;
    decimals: number;
  };
  amount: string;
}

interface WalletBalanceProps {
  walletId: string;
}

export function WalletBalance({ walletId }: WalletBalanceProps) {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletId) {
      loadBalance();
    }
  }, [walletId]);

  const loadBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await walletApi.getBalance(walletId);
      setBalances(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load balance');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="card">Loading balance...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <p style={{ color: 'var(--secondary)', opacity: 0.8 }}>Error: {error}</p>
        <button onClick={loadBalance}>Retry</button>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="card">
        <h3>Balance</h3>
        <p>No tokens found in this wallet.</p>
        <button onClick={loadBalance}>Refresh</button>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Balance</h3>
        <button onClick={loadBalance} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
          Refresh
        </button>
      </div>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {balances.map((balance, index) => (
          <div
            key={balance.token.id || index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              backgroundColor: 'var(--accent)',
              borderRadius: '6px',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>{balance.token.symbol || balance.token.name}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--secondary)', opacity: 0.7 }}>{balance.token.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--secondary)' }}>{balance.amount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', opacity: 0.6 }}>Token ID: {balance.token.id.substring(0, 8)}...</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}