import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, circleApi, walletApi, type MeData, type Wallet } from '../services/api';

type AuthState = {
  user: MeData | null;
  wallets: Wallet[];
  defaultWalletId: string | null;
  selectedWalletId: string | null;
  loading: boolean;
  error: string | null;
  initialCheckDone: boolean;
};

type AuthContextValue = AuthState & {
  setSelectedWalletId: (id: string | null) => void;
  loginWithGoogle: (idToken: string) => Promise<void>;
  startCircleWalletCreation: (options?: { forceRedirect?: boolean }) => Promise<void>;
  onCircleLoginComplete: (userToken: string, encryptionKey: string) => Promise<string | undefined>;
  executeChallengeAndFinish: (challengeId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshWallets: () => Promise<void>;
  refreshUser: () => Promise<MeData | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    wallets: [],
    defaultWalletId: null,
    selectedWalletId: null,
    loading: true,
    error: null,
    initialCheckDone: false,
  });

  const refreshUser = useCallback(async () => {
    try {
      const data = await authApi.me();
      setState((s) => ({ ...s, user: data, error: null }));
      return data;
    } catch {
      setState((s) => ({ ...s, user: null }));
      return null;
    }
  }, []);

  const refreshWallets = useCallback(async () => {
    try {
      const list = await walletApi.listWallets();
      const wallets = list || [];
      setState((s) => {
        const defaultId = wallets[0]?.id ?? null;
        const selected =
          s.selectedWalletId && wallets.some((w) => w.id === s.selectedWalletId)
            ? s.selectedWalletId
            : defaultId;
        return {
          ...s,
          wallets,
          defaultWalletId: defaultId,
          selectedWalletId: selected,
          error: null,
        };
      });
    } catch {
      setState((s) => ({ ...s, wallets: [], defaultWalletId: null }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let me = await refreshUser();
        if (cancelled) return;
        if (!me && typeof window !== 'undefined' && window.sessionStorage) {
          const userToken = window.sessionStorage.getItem('circleUserToken');
          const encryptionKey = window.sessionStorage.getItem('circleEncryptionKey');
          if (userToken && encryptionKey) {
            try {
              await authApi.circleLogin(userToken);
              if (cancelled) return;
              me = await refreshUser();
            } catch {
              const { clearCircleStorage } = await import('../utils/circleSdk');
              clearCircleStorage();
            }
          }
        }
        if (cancelled) return;
        if (me?.hasCircleUser) {
          await refreshWallets();
        }
      } catch {
        if (!cancelled) setState((s) => ({ ...s, user: null }));
      } finally {
        if (!cancelled) setState((s) => ({ ...s, loading: false, initialCheckDone: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser, refreshWallets]);

  /** Ensure device token in cookies on load (so "Login with Google" works without extra step). Skip when URL has hash (returning from OAuth). */
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash) return;
    let cancelled = false;
    (async () => {
      try {
        const { getStoredCredentials, setDeviceCredentials, getDeviceId } = await import('../utils/circleSdk');
        const appId = import.meta.env.VITE_CIRCLE_APP_ID;
        const creds = getStoredCredentials();
        if (creds?.deviceToken && creds?.deviceEncryptionKey) return;
        if (!appId) return;
        const deviceId = await getDeviceId(appId);
        const data = await circleApi.createDeviceToken(deviceId);
        if (cancelled) return;
        setDeviceCredentials(data.deviceToken, data.deviceEncryptionKey);
      } catch {
        // Silent; user can still try Login with Google (startCircleWalletCreation creates token then)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Restore device credentials when missing (logged-in user, no hash). */
  useEffect(() => {
    if (!state.user?.hasCircleUser || state.wallets.length === 0) return;
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash) return;
    let cancelled = false;
    (async () => {
      try {
        const { getStoredCredentials, setDeviceCredentials, getDeviceId } = await import('../utils/circleSdk');
        const appId = import.meta.env.VITE_CIRCLE_APP_ID;
        const creds = getStoredCredentials();
        if (creds?.deviceToken && creds?.deviceEncryptionKey) return;
        if (!appId) return;
        const deviceId = await getDeviceId(appId);
        const data = await circleApi.createDeviceToken(deviceId);
        if (cancelled) return;
        setDeviceCredentials(data.deviceToken, data.deviceEncryptionKey);
      } catch {
        // Silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.user?.hasCircleUser, state.wallets.length]);

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        await authApi.postGoogle(idToken);
        const me = await refreshUser();
        if (me?.hasCircleUser) {
          await refreshWallets();
        }
      } catch (e: unknown) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : 'Google sign-in failed',
        }));
        throw e;
      }
      setState((s) => ({ ...s, loading: false }));
    },
    [refreshUser, refreshWallets]
  );

  const startCircleWalletCreation = useCallback(
    async (options?: { forceRedirect?: boolean }) => {
      console.log('[Login with Google] start', { options });
      setState((s) => ({ ...s, error: null }));
      const forceRedirect = options?.forceRedirect === true;
      try {
        if (!forceRedirect) {
          const me = await refreshUser();
          if (me?.hasCircleUser) {
            await refreshWallets();
            return;
          }
        }
      } catch {
        // Proceed to wallet creation flow
      }
      const appId = import.meta.env.VITE_CIRCLE_APP_ID;
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      console.log('[Login with Google] env check', { hasAppId: !!appId, hasGoogleClientId: !!googleClientId });
      if (!appId || !googleClientId) {
        console.warn('[Login with Google] missing env – aborting');
        setState((s) => ({
          ...s,
          error: 'Missing VITE_CIRCLE_APP_ID or VITE_GOOGLE_CLIENT_ID',
        }));
        return;
      }
      try {
        console.log('[Login with Google] loading circleSdk and W3SSdk...');
        const { getDeviceId, setDeviceCredentials } = await import('../utils/circleSdk');
        const { W3SSdk } = await import('@circle-fin/w3s-pw-web-sdk');
        console.log('[Login with Google] getting deviceId...');
        const deviceId = await getDeviceId(appId);
        console.log('[Login with Google] deviceId received, calling createDeviceToken...');
        const data = await circleApi.createDeviceToken(deviceId);
        console.log('[Login with Google] device token received, setting cookies...');
        setDeviceCredentials(data.deviceToken, data.deviceEncryptionKey);
        const redirectUri = typeof window !== 'undefined' ? (window.location.pathname === '/' ? window.location.origin : window.location.origin + window.location.pathname) : '';
        console.log('[Login with Google] creating SDK, redirectUri:', redirectUri);
        const sdk = new W3SSdk(
          {
            appSettings: { appId },
            loginConfigs: {
              deviceToken: data.deviceToken,
              deviceEncryptionKey: data.deviceEncryptionKey,
              google: { clientId: googleClientId, redirectUri },
            },
          },
          undefined
        );
        console.log('[Login with Google] calling performLogin("Google") – expect redirect...');
        (sdk as { performLogin: (provider: string) => Promise<void> }).performLogin('Google');
        await new Promise((r) => setTimeout(r, 100));
        if (typeof window !== 'undefined' && window.location.href.startsWith('http')) {
          const state = crypto.randomUUID();
          const nonce = crypto.randomUUID();
          const scope = encodeURIComponent(
            'openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'
          );
          const responseType = encodeURIComponent('id_token token');
          const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&response_type=${responseType}&nonce=${nonce}&prompt=select_account`;
          window.localStorage.setItem('socialLoginProvider', 'Google');
          window.localStorage.setItem('state', state);
          window.localStorage.setItem('nonce', nonce);
          console.log('[Login with Google] SDK did not redirect – doing manual redirect');
          window.location.href = url;
        }
        console.log('[Login with Google] performLogin returned (no redirect?)');
      } catch (e: unknown) {
        console.error('[Login with Google] error', e);
        setState((s) => ({
          ...s,
          error: e instanceof Error ? e.message : 'Failed to start wallet creation',
        }));
      }
    },
    [refreshUser, refreshWallets]
  );

  const onCircleLoginComplete = useCallback(
    async (userToken: string, encryptionKey: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const { setUserCredentials } = await import('../utils/circleSdk');
        setUserCredentials(userToken, encryptionKey);
        const result = await circleApi.initializeUser({
          userToken,
          blockchains: ['ARC-TESTNET'],
          accountType: 'SCA',
        });
        await refreshUser();
        if (result?.challengeId) {
          setState((s) => ({ ...s, loading: false }));
          return result.challengeId;
        }
        await refreshWallets();
      } catch (e: unknown) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : 'Failed to initialize user',
        }));
        throw e;
      }
      setState((s) => ({ ...s, loading: false }));
      return undefined;
    },
    [refreshUser, refreshWallets]
  );

  const executeChallengeAndFinish = useCallback(
    async (challengeId: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const { getCircleSdk, getStoredCredentials } = await import('../utils/circleSdk');
        const creds = getStoredCredentials();
        const appId = import.meta.env.VITE_CIRCLE_APP_ID;
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!creds?.deviceToken || !creds?.deviceEncryptionKey || !creds?.userToken || !creds?.encryptionKey || !appId || !googleClientId) {
          throw new Error('Missing Circle credentials or env');
        }
        const sdk = getCircleSdk(appId, googleClientId, creds.deviceToken, creds.deviceEncryptionKey);
        sdk.setAuthentication({ userToken: creds.userToken, encryptionKey: creds.encryptionKey });
        await new Promise<void>((resolve, reject) => {
          sdk.execute(challengeId, (err: unknown) => {
            if (err) reject(new Error((err as Error).message || 'Challenge failed'));
            else resolve();
          });
        });
        await refreshUser();
        await refreshWallets();
      } catch (e: unknown) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : 'Challenge failed',
        }));
        throw e;
      }
      setState((s) => ({ ...s, loading: false }));
    },
    [refreshUser, refreshWallets]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    setState({
      user: null,
      wallets: [],
      defaultWalletId: null,
      selectedWalletId: null,
      loading: false,
      error: null,
      initialCheckDone: true,
    });
    try {
      const { clearCircleStorage } = await import('../utils/circleSdk');
      clearCircleStorage();
    } catch {
      // ignore
    }
  }, []);

  const setSelectedWalletId = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedWalletId: id }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      setSelectedWalletId,
      loginWithGoogle,
      startCircleWalletCreation,
      onCircleLoginComplete,
      executeChallengeAndFinish,
      logout,
      refreshWallets,
      refreshUser,
    }),
    [
      state,
      setSelectedWalletId,
      loginWithGoogle,
      startCircleWalletCreation,
      onCircleLoginComplete,
      executeChallengeAndFinish,
      logout,
      refreshWallets,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}