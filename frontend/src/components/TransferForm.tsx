import { useState } from 'react';
import { walletApi } from '../services/api';
import { getCircleSdk, getStoredCredentials } from '../utils/circleSdk';

const CIRCLE_APP_ID = import.meta.env.VITE_CIRCLE_APP_ID;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
  const [pendingChallenge, setPendingChallenge] = useState<{ challengeId: string; amount: string; destination: string } | null>(null);

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
      const result = await walletApi.prepareTransfer(walletId, {
        tokenId,
        destinationAddress,
        amount,
        feeLevel,
      });
      setPendingChallenge({
        challengeId: result.challengeId,
        amount,
        destination: destinationAddress,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Prepare transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSign = async () => {
    if (!pendingChallenge) return;
    const creds = getStoredCredentials();
    if (!creds?.deviceToken || !creds?.deviceEncryptionKey || !creds?.userToken || !creds?.encryptionKey || !CIRCLE_APP_ID || !GOOGLE_CLIENT_ID) {
      setError('Missing Circle credentials. Please sign in again.');
      setPendingChallenge(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sdk = getCircleSdk(CIRCLE_APP_ID, GOOGLE_CLIENT_ID, creds.deviceToken, creds.deviceEncryptionKey);
      sdk.setAuthentication({ userToken: creds.userToken, encryptionKey: creds.encryptionKey });
      await new Promise<void>((resolve, reject) => {
        sdk.execute(pendingChallenge.challengeId, (err: unknown) => {
          if (err) reject(new Error((err as Error).message || 'Signing failed'));
          else resolve();
        });
      });
      setSuccess('Transfer signed and submitted. It may take a moment to complete.');
      setPendingChallenge(null);
      setTokenId('');
      setDestinationAddress('');
      setAmount('');
      onTransferComplete?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = () => {
    setPendingChallenge(null);
  };

  return (
    <div className="card">
      <h3>Transfer Tokens</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', opacity: 0.8, marginBottom: '1rem' }}>
        Backend prepares the transfer; you sign in the app to execute.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Token ID</label>
          <input
            type="text"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="e.g., 7adb2b7d-c9cd-5164-b2d4-b73b088274dc"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
            required
          />
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>Get token ID from wallet balance</div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Destination Address</label>
          <input
            type="text"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder="0x..."
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Amount</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.1"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Fee Level</label>
          <select
            value={feeLevel}
            onChange={(e) => setFeeLevel(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem' }}
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>
        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fee', color: '#c33', borderRadius: '6px' }}>{error}</div>
        )}
        {success && (
          <div style={{ padding: '0.75rem', backgroundColor: '#efe', color: '#3c3', borderRadius: '6px' }}>{success}</div>
        )}
        {!pendingChallenge ? (
          <button type="submit" disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Preparing...' : 'Prepare transfer'}
          </button>
        ) : (
          <div style={{ padding: '1rem', border: '1px solid var(--primary)', borderRadius: '8px', background: 'var(--accent)' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Confirm transfer</p>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Send {pendingChallenge.amount} to {pendingChallenge.destination.slice(0, 10)}…
            </p>
            <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8rem', opacity: 0.8 }}>You will be asked to sign in the app.</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" onClick={handleConfirmSign} disabled={loading} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {loading ? 'Opening...' : 'Sign & send'}
              </button>
              <button type="button" onClick={handleCancelConfirm} disabled={loading} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #999', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
