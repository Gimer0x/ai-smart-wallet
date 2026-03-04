import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { getCircleSdk, getStoredCredentials, setUserCredentials } from '../utils/circleSdk';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CIRCLE_APP_ID = import.meta.env.VITE_CIRCLE_APP_ID;

/**
 * Handles return from Circle/Google OAuth redirect (after step 2 "Login with Google").
 * Uses hash + stored device credentials; onLoginComplete runs step 3 (initialize user) and step 4 (create wallet when challengeId returned).
 * Export so App can use it when Chat is the main page.
 */
export function useHandleCircleReturn() {
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
        const { userToken, encryptionKey } = result;
        try {
          setUserCredentials(userToken, encryptionKey);
          await authApi.circleLogin(userToken);
          const challengeId = await onCircleLoginComplete(userToken, encryptionKey);
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
