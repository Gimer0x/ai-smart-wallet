/**
 * Persist Circle user credentials by Google sub so we can restore them when
 * the same user logs in again (e.g. new session, new device) and skip the redirect flow.
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const FILE_PATH = path.join(DATA_DIR, "circle-users.json");

export interface StoredCircleUser {
  circleUserToken: string;
  circleEncryptionKey: string;
}

let cache: Record<string, StoredCircleUser> | null = null;

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAll(): Record<string, StoredCircleUser> {
  if (cache) return cache;
  ensureDir();
  if (!fs.existsSync(FILE_PATH)) {
    cache = {};
    return cache;
  }
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    cache = JSON.parse(raw) as Record<string, StoredCircleUser>;
    return cache ?? {};
  } catch {
    cache = {};
    return cache;
  }
}

function writeAll(data: Record<string, StoredCircleUser>): void {
  ensureDir();
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  cache = data;
}

export function getCircleUserByGoogleSub(googleSub: string): StoredCircleUser | null {
  const all = readAll();
  return all[googleSub] ?? null;
}

export function setCircleUserForGoogleSub(
  googleSub: string,
  circleUserToken: string,
  circleEncryptionKey: string
): void {
  const all = readAll();
  all[googleSub] = { circleUserToken, circleEncryptionKey };
  writeAll(all);
}
