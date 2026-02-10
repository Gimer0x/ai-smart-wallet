import { useState, useEffect } from 'react';
import { walletApi } from '../services/api';

interface Transaction {
  id: string;
  transactionType: string;
  state: string;
  blockchain: string;
  amounts: string[];
  txHash?: string;
  sourceAddress?: string;
  destinationAddress?: string;
  createDate: string;
  updateDate: string;
}

interface TransactionListProps {
  walletId: string;
  transactionType?: string;
}

export function TransactionList({ walletId, transactionType }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletId) {
      loadTransactions();
    }
  }, [walletId, transactionType]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await walletApi.listTransactions(walletId, transactionType);
      setTransactions(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getExplorerUrl = (blockchain: string, txHash: string) => {
    if (blockchain === 'ARC-TESTNET') {
      return `https://testnet.arcscan.app/tx/${txHash}`;
    } else if (blockchain.includes('MATIC')) {
      return `https://amoy.polygonscan.com/tx/${txHash}`;
    } else if (blockchain.includes('ETH')) {
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    }
    return null;
  };

  if (loading) {
    return <div className="card">Loading transactions...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <p style={{ color: '#e74c3c' }}>Error: {error}</p>
        <button onClick={loadTransactions}>Retry</button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="card">
        <h3>Transactions</h3>
        <p>No transactions found.</p>
        <button onClick={loadTransactions}>Refresh</button>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Transactions ({transactions.length})</h3>
        <button onClick={loadTransactions} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
          Refresh
        </button>
      </div>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {transactions.map((tx) => (
          <div
            key={tx.id}
            style={{
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '6px',
              padding: '1rem',
              backgroundColor: 'white',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor: tx.transactionType === 'INBOUND' ? 'var(--primary)' : 'var(--secondary)',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {tx.transactionType}
              </span>
              <span
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  backgroundColor:
                    tx.state === 'COMPLETE' ? 'var(--primary)' : tx.state === 'FAILED' ? 'var(--secondary)' : 'var(--secondary)',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  opacity: tx.state === 'COMPLETE' ? 1 : 0.7,
                }}
              >
                {tx.state}
              </span>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 'bold' }}>
                {tx.amounts.join(', ')} {tx.blockchain}
              </div>
              {tx.sourceAddress && (
                <div style={{ fontSize: '0.875rem', color: '#666', wordBreak: 'break-all' }}>
                  From: {tx.sourceAddress}
                </div>
              )}
              {tx.destinationAddress && (
                <div style={{ fontSize: '0.875rem', color: '#666', wordBreak: 'break-all' }}>
                  To: {tx.destinationAddress}
                </div>
              )}
            </div>
            {tx.txHash && (
              <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                <a
                  href={getExplorerUrl(tx.blockchain, tx.txHash) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#667eea', textDecoration: 'none' }}
                >
                  View on Explorer: {tx.txHash.substring(0, 16)}...
                </a>
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
              {new Date(tx.createDate).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}