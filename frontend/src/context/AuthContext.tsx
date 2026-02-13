import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
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
  startCircleWalletCreation: () => Promise<void>;
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
        const selected = s.selectedWalletId && wallets.some((w) => w.id === s.selectedWalletId)
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
    } catch (e) {
      setState((s) => ({ ...s, wallets: [], defaultWalletId: null }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await refreshUser();
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
    return () => { cancelled = true; };
  }, [refreshUser, refreshWallets]);

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        await authApi.postGoogle(idToken);
        await refreshUser();
      } catch (e: unknown) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : 'Google sign-in failed',
        }));
        throw e;
      } finally {
        setState((s) => ({ ...s, loading: false }));
      }
    },
    [refreshUser]
  );

  /**
   * Login with Google (Circle flow): first check if this user already has a wallet; if not, create device token then redirect to Google.
   * On return: useHandleCircleReturn → onCircleLoginComplete (initialize user) → executeChallengeAndFinish (create wallet when necessary).
   * Flow: 0) Check if wallet already exists for this user, 1) Create device token, 2) Login with Google (redirect), 3) Initialize user, 4) Create wallet (if challenge returned).
   */
  const startCircleWalletCreation = useCallback(async () => {
    setState((s) => ({ ...s, error: null }));
    try {
      // 0) Check if this user/email already has a wallet (session may have been updated)
      const me = await refreshUser();
      if (me?.hasCircleUser) {
        await refreshWallets();
        return; // Already have wallet(s); no redirect needed
      }
    } catch {
      // Not logged in or other error; proceed to wallet creation flow
    }
    const appId = import.meta.env.VITE_CIRCLE_APP_ID;
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    // Log env vars used for wallet creation (for validation; remove in production if desired)
    console.log('[Wallet creation] .env values:', {
      VITE_CIRCLE_APP_ID: appId ?? '(missing)',
      VITE_GOOGLE_CLIENT_ID: googleClientId ?? '(missing)',
      VITE_API_BASE_URL: apiBaseUrl ?? '(default /api)',
      redirectOrigin: typeof window !== 'undefined' ? window.location.origin : '(ssr)',
    });
    if (!appId || !googleClientId) {
      setState((s) => ({
        ...s,
        error: 'Missing VITE_CIRCLE_APP_ID or VITE_GOOGLE_CLIENT_ID',
      }));
      return;
    }
    try {
      const { getCircleSdk, getDeviceId, setDeviceCredentials } = await import('../utils/circleSdk');
      // 1) Create device token (part of "Login with Google" — required before Circle redirect)
      const deviceId = await getDeviceId(appId);
      const data = await circleApi.createDeviceToken(deviceId);
      setDeviceCredentials(data.deviceToken, data.deviceEncryptionKey);
      // 2) Login with Google (redirect; on return we initialize user and create wallet)
      const sdk = getCircleSdk(appId, googleClientId, data.deviceToken, data.deviceEncryptionKey);
      (sdk as { performLogin: (p: string) => void }).performLogin('Google');
    } catch (e: unknown) {
      setState((s) => ({
        ...s,
        error: e instanceof Error ? e.message : 'Failed to start wallet creation',
      }));
    }
  }, [refreshUser, refreshWallets]);

  /**
   * After return from Google: 3) Initialize user (creates wallet challenge when necessary), 4) Create wallet by executing challenge.
   */
  const onCircleLoginComplete = useCallback(
    async (userToken: string, encryptionKey: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const { setUserCredentials } = await import('../utils/circleSdk');
        setUserCredentials(userToken, encryptionKey);
        // 3) Initialize user (backend returns challengeId when wallet must be created)
        const result = await circleApi.initializeUser({
          userToken,
          encryptionKey,
          blockchains: ['ARC-TESTNET'],
          accountType: 'SCA',
        });
        await refreshUser();
        if (result?.challengeId) {
          setState((s) => ({ ...s, loading: false }));
          return result.challengeId; // 4) Caller executes challenge to create wallet
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
