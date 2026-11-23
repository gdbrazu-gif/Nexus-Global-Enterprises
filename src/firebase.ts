import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  enableNetwork,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreInstance;
export const FIREBASE_BOOTSTRAP_ADMIN_EMAIL = 'gdbrazu@gmail.com';
export const FIREBASE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

export async function signInWithGooglePopup() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutFirebase() {
  return firebaseSignOut(auth);
}

export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const probe = async () => {
    await getDocFromServer(doc(db, 'test', 'connection'));
  };

  try {
    await probe();
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (msg.includes('the client is offline') || msg.includes('unavailable')) {
      // Allow WebChannel/long-polling auto-detection a brief recovery attempt on cold start
      try {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await enableNetwork(db).catch(() => undefined);
        await probe();
        return true;
      } catch (retryError) {
        const retryMsg =
          retryError instanceof Error ? retryError.message.toLowerCase() : String(retryError).toLowerCase();
        if (retryMsg.includes('the client is offline')) {
          console.error('Please check your Firebase configuration: client is offline.');
          return false;
        }
        return true;
      }
    }
    // Non-offline errors (e.g., expected permission-denied on /test/connection) confirm server reachability
    return true;
  }
}

// Run startup connectivity check
void testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      out[k] = v
        .filter((item) => item !== undefined && item !== null)
        .map((item) =>
          typeof item === 'object' && item !== null && Object.getPrototypeOf(item) === Object.prototype
            ? stripUndefined(item as Record<string, unknown>)
            : item
        );
    } else if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
      out[k] = stripUndefined(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const utf8Encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

export function getUtf8ByteLength(value: string): number {
  return utf8Encoder ? utf8Encoder.encode(value).length : value.length;
}

/**
 * Ensures image/logo URLs stay within Firestore security rule byte limits.
 * Oversized base64 data URIs remain cached locally without breaking Firestore writes.
 */
export function clampSafeUrl(
  url: string | undefined,
  fallback: string,
  maxBytes = 1024
): string {
  if (typeof url !== 'string' || !url) return fallback;
  if (getUtf8ByteLength(url) <= maxBytes) return url;
  return fallback;
}

export function rotateDeviceSessionId(uid?: string): string {
  const safeUidPrefix = uid ? uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) : '';
  const storageKey = uid ? `apex_device_session_id_${uid}` : 'apex_device_session_id';
  const prefix = safeUidPrefix ? `DEV-${safeUidPrefix}-` : 'DEV-';
  const freshId = `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  localStorage.setItem(storageKey, freshId);
  return freshId;
}

export function getOrCreateDeviceSessionMeta(uid?: string): {
  sessionId: string;
  deviceType: 'Desktop' | 'Tablet' | 'Mobile';
  platform: string;
  browser: string;
} {
  const safeUidPrefix = uid ? uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) : '';
  const storageKey = uid ? `apex_device_session_id_${uid}` : 'apex_device_session_id';
  const expectedPrefix = safeUidPrefix ? `DEV-${safeUidPrefix}-` : 'DEV-';
  let sessionId = localStorage.getItem(storageKey);
  if (!sessionId || (safeUidPrefix && !sessionId.startsWith(expectedPrefix))) {
    sessionId = rotateDeviceSessionId(uid);
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const width = typeof window !== 'undefined' ? window.innerWidth : 1280;

  let deviceType: 'Desktop' | 'Tablet' | 'Mobile' = 'Desktop';
  if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua) || width < 768) {
    deviceType = 'Mobile';
  } else if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua) || (width >= 768 && width < 1024)) {
    deviceType = 'Tablet';
  }

  let platform = 'Web Browser';
  if (/Windows/i.test(ua)) platform = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua) && !/iPhone|iPad/i.test(ua)) platform = 'macOS';
  else if (/iPhone|iPad/i.test(ua)) platform = 'iOS / iPadOS';
  else if (/Android/i.test(ua)) platform = 'Android';
  else if (/Linux/i.test(ua)) platform = 'Linux';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  return { sessionId, deviceType, platform, browser };
}
