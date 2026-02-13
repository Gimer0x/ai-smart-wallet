/**
 * Circle Programmable Wallets Web SDK helper.
 * Handles getDeviceId, config for performLogin, and execute challenge.
 */

import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

const STORAGE_KEY = 'circle_device';

interface StoredCredentials {
  deviceToken: string;
  deviceEncryptionKey: string;
  userToken?: string;
  encryptionKey?: string;
  ts: number;
}

const EXPIRY_MS = 1000 * 60 * 30; // 30 min

function getStored(): StoredCredentials | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCredentials;
    if (Date.now() - parsed.ts > EXPIRY_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setStored(partial: Partial<StoredCredentials>) {
  const current = getStored() || { deviceToken: '', deviceEncryptionKey: '', ts: Date.now() };
  const next = { ...current, ...partial, ts: Date.now() };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function setDeviceCredentials(deviceToken: string, deviceEncryptionKey: string): void {
  setStored({ deviceToken, deviceEncryptionKey });
}

export function setUserCredentials(userToken: string, encryptionKey: string): void {
  setStored({ userToken, encryptionKey });
}

export function getStoredCredentials(): StoredCredentials | null {
  return getStored();
}

export function clearCircleStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

let sdkInstance: W3SSdk | null = null;

/**
 * Get or create Circle W3SSdk.
 * Pass deviceToken/deviceEncryptionKey for performLogin; pass userToken/encryptionKey for execute via setAuthentication.
 */
export function getCircleSdk(
  appId: string,
  googleClientId: string,
  deviceToken: string,
  deviceEncryptionKey: string,
  onLoginComplete?: (error: unknown, result?: { userToken: string; encryptionKey: string }) => void
): W3SSdk {
  if (!sdkInstance) {
    sdkInstance = new W3SSdk(
      {
        appSettings: { appId },
        loginConfigs: {
          deviceToken,
          deviceEncryptionKey,
          google: {
            clientId: googleClientId,
            redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
            selectAccountPrompt: true,
          },
        },
      },
      onLoginComplete
    );
  } else {
    sdkInstance.updateConfigs(
      {
        appSettings: { appId },
        loginConfigs: {
          deviceToken,
          deviceEncryptionKey,
          google: {
            clientId: googleClientId,
            redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
            selectAccountPrompt: true,
          },
        },
      },
      onLoginComplete
    );
  }
  return sdkInstance;
}

/**
 * Create a minimal SDK instance to get device ID (opens invisible iframe).
 */
export function getDeviceId(appId: string): Promise<string> {
  const sdk = new W3SSdk({ appSettings: { appId } });
  return sdk.getDeviceId();
}
