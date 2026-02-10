import { useState } from 'react';
import { walletApi } from '../services/api';

interface TransferFormProps {
  walletId: string;
  onTransferComplete?: () => void;
}

export function TransferForm({ walletId, onTransferComplete }: TransferFormProps) {
  const [tokenId, setTokenId] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [feeLevel, setFeeLevel] = useState('MEDIUM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenId || !destinationAddress || !amount) {
      setError('All fields are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await walletApi.transferTokens(
        walletId,
        tokenId,
        destinationAddress,
        amount,
        feeLevel
      );

      setSuccess(`Transfer initiated! Transaction ID: ${result.id}`);
      setTokenId('');
      setDestinationAddress('');
      setAmount('');
      
      if (onTransferComplete) {
        setTimeout(() => {
          onTransferComplete();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3>Transfer Tokens</h3>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Token ID
          </label>
          <input
            type="text"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="e.g., 7adb2b7d-c9cd-5164-b2d4-b73b088274dc"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '1rem',
            }}
            required
          />
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
            Get token ID from wallet balance
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Destination Address
          </label>
          <input
            type="text"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder="0x..."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '1rem',
            }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Amount
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.1"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '1rem',
            }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Fee Level
          </label>
          <select
            value={feeLevel}
            onChange={(e) => setFeeLevel(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '1rem',
            }}
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fee', color: '#c33', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '0.75rem', backgroundColor: '#efe', color: '#3c3', borderRadius: '6px' }}>
            {success}
          </div>
        )}

        <button type="submit" disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Transferring...' : 'Transfer Tokens'}
        </button>
      </form>
    </div>
  );
}