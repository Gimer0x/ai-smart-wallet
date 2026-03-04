/**
 * Circle Programmable Wallets Web SDK helper.
 * Device creds in cookies (before redirect). User creds in sessionStorage only (one user per tab; cleared when tab closes).
 * encryptionKey is never sent to the backend; used only in the browser with the SDK for signing.
 */

import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

/** Callback when page returns from Google OAuth; result has userToken and encryptionKey. */
export type CircleLoginCompleteCallback = (error: { message: string } | undefined, result?: { userToken: string; encryptionKey: string }) => void;

const COOKIE_DEVICE_TOKEN = 'circle_device_token';
const COOKIE_DEVICE_KEY = 'circle_device_encryption_key';
const STORAGE_USER_TOKEN = 'circleUserToken';
const STORAGE_ENCRYPTION_KEY = 'circleEncryptionKey';
const COOKIE_MAX_AGE_DAYS = 1;

export interface StoredCredentials {
  deviceToken: string;
  deviceEncryptionKey: string;
  userToken?: string;
  encryptionKey?: string;
}

function setCookie(name: string, value: string, maxAgeDays: number): void {
  if (typeof document === 'undefined') return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^| )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

/** Set device credentials (call before redirect to Google). Stored in cookies so they're available when page loads after redirect. */
export function setDeviceCredentials(deviceToken: string, deviceEncryptionKey: string): void {
  setCookie(COOKIE_DEVICE_TOKEN, deviceToken, COOKIE_MAX_AGE_DAYS);
  setCookie(COOKIE_DEVICE_KEY, deviceEncryptionKey, COOKIE_MAX_AGE_DAYS);
}

/** Set user credentials (call once in onLoginComplete after successful Google login). sessionStorage only; cleared when tab closes. */
export function setUserCredentials(userToken: string, encryptionKey: string): void {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.setItem(STORAGE_USER_TOKEN, userToken);
    window.sessionStorage.setItem(STORAGE_ENCRYPTION_KEY, encryptionKey);
  }
}

/** Get credentials: device from cookies, user from sessionStorage. Cleared on logout. */
export function getStoredCredentials(): StoredCredentials | null {
  const deviceToken = getCookie(COOKIE_DEVICE_TOKEN);
  const deviceEncryptionKey = getCookie(COOKIE_DEVICE_KEY);
  const ss = typeof window !== 'undefined' ? window.sessionStorage : null;
  const userToken = ss?.getItem(STORAGE_USER_TOKEN) ?? undefined;
  const encryptionKey = ss?.getItem(STORAGE_ENCRYPTION_KEY) ?? undefined;
  if (!deviceToken && !deviceEncryptionKey && !userToken) return null;
  return {
    deviceToken,
    deviceEncryptionKey,
    userToken: userToken || undefined,
    encryptionKey: encryptionKey || undefined,
  };
}

/** Clear all Circle credentials (call on logout or when session is invalid). */
export function clearCircleStorage(): void {
  deleteCookie(COOKIE_DEVICE_TOKEN);
  deleteCookie(COOKIE_DEVICE_KEY);
  const ss = typeof window !== 'undefined' ? window.sessionStorage : null;
  if (ss) {
    ss.removeItem(STORAGE_USER_TOKEN);
    ss.removeItem(STORAGE_ENCRYPTION_KEY);
  }
}

function getRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  const { origin, pathname } = window.location;
  return pathname === '/' ? origin : origin + pathname;
}

/** Get or create device ID (persisted for same browser). */
export async function getDeviceId(appId: string): Promise<string> {
  const sdk = new W3SSdk(
    {
      appSettings: { appId },
      loginConfigs: {
        deviceToken: '',
        deviceEncryptionKey: '',
      },
    },
    undefined
  );
  return sdk.getDeviceId();
}

type CircleSdkInstance = {
  setAuthentication: (auth: { userToken: string; encryptionKey: string }) => void;
  execute: (challengeId: string, onCompleted?: (error: unknown, result?: unknown) => void) => void;
};

/**
 * Create Circle SDK instance for signing. When onLoginComplete is provided (return from Google redirect),
 * the SDK will invoke it when the hash is processed.
 */
export function getCircleSdk(
  appId: string,
  googleClientId: string,
  deviceToken: string,
  deviceEncryptionKey: string,
  onLoginComplete?: CircleLoginCompleteCallback
): CircleSdkInstance {
  const redirectUri = getRedirectUri();
  const configs = {
    appSettings: { appId },
    loginConfigs: {
      deviceToken,
      deviceEncryptionKey,
      google: {
        clientId: googleClientId,
        redirectUri,
      },
    },
  };
  const sdk = new W3SSdk(configs as any, onLoginComplete as any);
  return {
    setAuthentication(auth: { userToken: string; encryptionKey: string }) {
      sdk.setAuthentication(auth);
    },
    execute(challengeId: string, onCompleted?: (error: unknown, result?: unknown) => void) {
      sdk.execute(challengeId, onCompleted as any);
    },
  };
}
