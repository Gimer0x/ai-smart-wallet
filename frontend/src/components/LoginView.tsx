import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { getCircleSdk, getStoredCredentials } from '../utils/circleSdk';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CIRCLE_APP_ID = import.meta.env.VITE_CIRCLE_APP_ID;

/**
 * Handles return from Circle/Google OAuth redirect (after step 2 "Login with Google").
 * Uses hash + stored device credentials; onLoginComplete runs step 3 (initialize user) and step 4 (create wallet when challengeId returned).
 */
function useHandleCircleReturn() {
  const { onCircleLoginComplete, executeChallengeAndFinish } = useAuth();
  const [status, setStatus] = useState<'idle' | 'verifying' | 'challenge' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const creds = getStoredCredentials();
    if (!hash || !creds?.deviceToken || !creds?.deviceEncryptionKey || !CIRCLE_APP_ID || !GOOGLE_CLIENT_ID) {
      return;
    }
    handled.current = true;
    setStatus('verifying');

    getCircleSdk(
      CIRCLE_APP_ID,
      GOOGLE_CLIENT_ID,
      creds.deviceToken,
      creds.deviceEncryptionKey,
      async (err, result) => {
        if (err) {
          const msg = (err as Error).message || 'Login failed';
          const isTokenValidationError =
            /idToken|accessToken|validate.*token/i.test(msg);
          setError(
            isTokenValidationError
              ? 'Google sign-in was rejected by Circle. Check: (1) In Google Cloud Console, add this site’s URL to Authorized redirect URIs and Authorized JavaScript origins. (2) In Circle developer dashboard, ensure the same Google Client ID and redirect URI are set for this app.'
              : msg
          );
          setStatus('error');
          return;
        }
        if (!result?.userToken || !result?.encryptionKey) {
          setStatus('error');
          return;
        }
        try {
          const challengeId = await onCircleLoginComplete(result.userToken, result.encryptionKey);
          if (challengeId !== undefined && challengeId !== '') {
            setStatus('challenge');
            await executeChallengeAndFinish(challengeId);
          }
          setStatus('done');
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Setup failed');
          setStatus('error');
        }
      }
    );
    // SDK will detect hash and call onLoginComplete when iframe responds
  }, [onCircleLoginComplete, executeChallengeAndFinish]);

  return { status, error };
}

export function LoginView() {
  const {
    user,
    wallets,
    loading,
    error: authError,
    initialCheckDone,
    loginWithGoogle,
    startCircleWalletCreation,
    refreshUser,
    refreshWallets,
  } = useAuth();
  const [idToken, setIdToken] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const { status: returnStatus, error: returnError } = useHandleCircleReturn();

  const needsGoogle = initialCheckDone && !user;
  const needsWallet = user && !user.hasCircleUser;
  const needsWallets = user?.hasCircleUser && wallets.length === 0;
  const showMainApp = user?.hasCircleUser && wallets.length > 0;

  // When showing the "create wallet" section, re-check if this user already has a wallet (e.g. session restored)
  useEffect(() => {
    if (!needsWallet || !user?.googleSub) return;
    let cancelled = false;
    refreshUser().then(async (me) => {
      if (!cancelled && me?.hasCircleUser) {
        await refreshWallets();
      }
    });
    return () => { cancelled = true; };
  }, [needsWallet, user?.googleSub, refreshUser, refreshWallets]);

  const handleGoogleCredential = async (credential: string) => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credential);
    } finally {
      setGoogleLoading(false);
    }
  };

  if (!initialCheckDone || loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--accent)',
        }}
      >
        <div style={{ textAlign: 'center', color: 'var(--secondary)' }}>Loading...</div>
      </div>
    );
  }

  if (returnStatus === 'verifying' || returnStatus === 'challenge') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--accent)',
        }}
      >
        <div style={{ textAlign: 'center', color: 'var(--secondary)' }}>
          {returnStatus === 'verifying' ? 'Verifying login...' : 'Creating wallet...'}
        </div>
      </div>
    );
  }

  if (returnStatus === 'error' && returnError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--accent)',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', color: 'var(--secondary)', maxWidth: '400px' }}>
          <p style={{ color: '#c33', marginBottom: '1rem' }}>{returnError}</p>
          <a href="/" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
            Back to home
          </a>
        </div>
      </div>
    );
  }

  if (showMainApp) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--accent)',
        padding: '2rem',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2.5rem',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: 'var(--secondary)' }}>
          Wallet Integrated AI
        </h1>
        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: 'var(--secondary)', opacity: 0.8 }}>
          Sign in and create your wallet to get started.
        </p>

        {(authError || returnError) && (
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
            {authError || returnError}
          </div>
        )}

        {needsGoogle && (
          <>
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--secondary)' }}>
              Sign in with Google to continue. You will then create a wallet.
            </p>
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
              onClick={startCircleWalletCreation}
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
      </div>
    </div>
  );
}
