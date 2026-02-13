import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const {
    user,
    wallets,
    loading,
    error: authError,
    initialCheckDone,
    loginWithGoogle,
    startCircleWalletCreation,
  } = useAuth();
  const [idToken, setIdToken] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const needsGoogle = initialCheckDone && !user;
  const needsWallet = user && !user.hasCircleUser;
  const needsWallets = user?.hasCircleUser && wallets.length === 0;

  const handleGoogleCredential = async (credential: string) => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credential);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            color: '#666',
            lineHeight: 1,
          }}
          aria-label="Close"
        >
          ×
        </button>

        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: 'var(--secondary)' }}>
          Sign in
        </h2>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: 'var(--secondary)', opacity: 0.8 }}>
          Sign in with Google to use the chat. Create a wallet if you don’t have one yet.
        </p>

        {authError && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              background: '#fee',
              color: '#c33',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
          >
            {authError}
          </div>
        )}

        {needsGoogle && (
          <>
            {GOOGLE_CLIENT_ID ? (
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={(res) => {
                    if (res.credential) handleGoogleCredential(res.credential);
                  }}
                  onError={() => setGoogleLoading(false)}
                  useOneTap={false}
                />
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: '#c33' }}>Set VITE_GOOGLE_CLIENT_ID for Google Sign-In.</p>
            )}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                  Or paste Google ID token (dev):
                </label>
                <input
                  type="text"
                  value={idToken}
                  onChange={(e) => setIdToken(e.target.value)}
                  placeholder="Paste id_token"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
                <button
                  type="button"
                  disabled={!idToken.trim() || googleLoading}
                  onClick={() => handleGoogleCredential(idToken)}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: idToken && !googleLoading ? 'pointer' : 'not-allowed',
                  }}
                >
                  {googleLoading ? 'Signing in...' : 'Sign in with token'}
                </button>
              </div>
            )}
          </>
        )}

        {(needsWallet || needsWallets) && user && (
          <>
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--secondary)' }}>
              {needsWallet
                ? 'Create your first wallet with Circle. You will be redirected to Google to authorize.'
                : 'Create a wallet to use with the app.'}
            </p>
            <button
              type="button"
              onClick={() => {
                startCircleWalletCreation();
                onClose();
              }}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem 1.25rem',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9375rem',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Starting...' : 'Continue with Google to create wallet'}
            </button>
          </>
        )}

        {user?.hasCircleUser && wallets.length > 0 && (
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--secondary)' }}>
            You’re signed in. You can close this and use the chat.
          </p>
        )}
      </div>
    </div>
  );
}
