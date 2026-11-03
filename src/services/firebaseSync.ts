import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { MemeItem, MemeTemplate } from '../types/meme';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: true,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Resilient singleton lazy initializer that never crashes top-level bundle evaluation
let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let initFailed = false;

export function getDb(): Firestore | null {
  if (cachedDb) return cachedDb;
  if (initFailed) return null;

  try {
    if (typeof window === 'undefined') return null;
    cachedApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    cachedDb = getFirestore(cachedApp, firebaseConfig.firestoreDatabaseId);
    return cachedDb;
  } catch (err) {
    initFailed = true;
    console.warn('[Firebase] Safe fallback active: Cloud database initialization deferred or restricted in this environment:', err);
    return null;
  }
}

/**
 * Validate connection to Firestore
 */
export async function testConnection(): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline / check configuration.');
    }
    return false;
  }
}

/**
 * Real-time listener for Meme Templates
 */
export function subscribeToFirestoreTemplates(onUpdate: (templates: MemeTemplate[]) => void): () => void {
  const db = getDb();
  if (!db) return () => {};

  try {
    const colRef = collection(db, 'templates');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const templates: MemeTemplate[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MemeTemplate;
          templates.push({
            id: docSnap.id,
            title: data.title,
            url: data.url,
            isCustom: data.isCustom ?? false,
            isHidden: data.isHidden ?? false,
            createdAt: data.createdAt ?? Date.now(),
          });
        });
        templates.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        onUpdate(templates);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'templates');
        } catch (err) {
          console.warn('Firestore templates listener notice (using local data):', err);
        }
      }
    );
  } catch (err) {
    console.warn('Firestore subscribeToFirestoreTemplates skipped:', err);
    return () => {};
  }
}

/**
 * Real-time listener for Pending Memes (for admin moderation)
 */
export function subscribeToFirestorePendingMemes(onUpdate: (memes: MemeItem[]) => void): () => void {
  const db = getDb();
  if (!db) return () => {};

  try {
    const colRef = collection(db, 'pending_memes');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const memes: MemeItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MemeItem;
          memes.push({
            id: docSnap.id,
            dataUrl: data.dataUrl,
            author: data.author,
            realAuthor: data.realAuthor,
            isAnonymous: data.isAnonymous ?? false,
            timestamp: data.timestamp ?? Date.now(),
            status: 'pending',
          });
        });
        memes.sort((a, b) => b.timestamp - a.timestamp);
        onUpdate(memes);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'pending_memes');
        } catch (err) {
          console.warn('Firestore pending memes listener notice (using local data):', err);
        }
      }
    );
  } catch (err) {
    console.warn('Firestore subscribeToFirestorePendingMemes skipped:', err);
    return () => {};
  }
}

/**
 * Real-time listener for Approved Memes (community gallery)
 */
export function subscribeToFirestoreApprovedMemes(onUpdate: (memes: MemeItem[]) => void): () => void {
  const db = getDb();
  if (!db) return () => {};

  try {
    const colRef = collection(db, 'approved_memes');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const memes: MemeItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MemeItem;
          memes.push({
            id: docSnap.id,
            dataUrl: data.dataUrl,
            author: data.author,
            realAuthor: data.realAuthor,
            isAnonymous: data.isAnonymous ?? false,
            timestamp: data.timestamp ?? Date.now(),
            status: 'approved',
          });
        });
        memes.sort((a, b) => b.timestamp - a.timestamp);
        onUpdate(memes);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'approved_memes');
        } catch (err) {
          console.warn('Firestore approved memes listener notice (using local data):', err);
        }
      }
    );
  } catch (err) {
    console.warn('Firestore subscribeToFirestoreApprovedMemes skipped:', err);
    return () => {};
  }
}

/**
 * Seed initial templates and memes if Firestore is completely empty
 */
export async function seedFirestoreIfEmpty(defaultTemplates: MemeTemplate[], initialMemes: MemeItem[]): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    const snap = await getDocs(collection(db, 'templates'));
    if (snap.empty) {
      for (const t of defaultTemplates) {
        await setDoc(doc(db, 'templates', t.id), {
          id: t.id,
          title: t.title,
          url: t.url,
          isCustom: false,
          isHidden: false,
          createdAt: Date.now(),
        });
      }
    }
  } catch (error) {
    console.warn('Seed templates skipped or offline:', error);
  }

  try {
    const memeSnap = await getDocs(collection(db, 'approved_memes'));
    if (memeSnap.empty) {
      for (const m of initialMemes) {
        await setDoc(doc(db, 'approved_memes', m.id), {
          id: m.id,
          dataUrl: m.dataUrl,
          author: m.author,
          realAuthor: m.realAuthor || m.author,
          isAnonymous: m.isAnonymous ?? false,
          timestamp: m.timestamp,
          status: 'approved',
        });
      }
    }
  } catch (error) {
    console.warn('Seed memes skipped or offline:', error);
  }
}

/**
 * Template Cloud Mutations
 */
export async function addFirestoreTemplate(template: MemeTemplate): Promise<void> {
  const db = getDb();
  if (!db) return;

  const path = `templates/${template.id}`;
  try {
    await setDoc(doc(db, 'templates', template.id), {
      id: template.id,
      title: template.title,
      url: template.url,
      isCustom: template.isCustom ?? true,
      isHidden: template.isHidden ?? false,
      createdAt: template.createdAt || Date.now(),
    });
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch (err) {
      console.warn('Firestore add template warning:', err);
    }
  }
}

export async function updateFirestoreTemplate(id: string, updates: Partial<MemeTemplate>): Promise<void> {
  const db = getDb();
  if (!db) return;

  const path = `templates/${id}`;
  try {
    await updateDoc(doc(db, 'templates', id), updates);
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch (err) {
      console.warn('Firestore update template warning:', err);
    }
  }
}

export async function deleteFirestoreTemplate(id: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const path = `templates/${id}`;
  try {
    await deleteDoc(doc(db, 'templates', id));
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, path);
    } catch (err) {
      console.warn('Firestore delete template warning:', err);
    }
  }
}

/**
 * Meme Cloud Mutations
 */
export async function submitFirestoreMeme(meme: MemeItem): Promise<void> {
  const db = getDb();
  if (!db) return;

  const path = `pending_memes/${meme.id}`;
  try {
    await setDoc(doc(db, 'pending_memes', meme.id), {
      id: meme.id,
      dataUrl: meme.dataUrl,
      author: meme.author,
      realAuthor: meme.realAuthor || meme.author,
      isAnonymous: meme.isAnonymous ?? false,
      timestamp: meme.timestamp,
      status: 'pending',
    });
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch (err) {
      console.warn('Firestore submit meme warning:', err);
    }
  }
}

export async function approveFirestoreMeme(meme: MemeItem): Promise<void> {
  const db = getDb();
  if (!db) return;

  const approvedPath = `approved_memes/${meme.id}`;
  const pendingPath = `pending_memes/${meme.id}`;
  try {
    await setDoc(doc(db, 'approved_memes', meme.id), {
      id: meme.id,
      dataUrl: meme.dataUrl,
      author: meme.author,
      realAuthor: meme.realAuthor || meme.author,
      isAnonymous: meme.isAnonymous ?? false,
      timestamp: meme.timestamp,
      status: 'approved',
    });
    await deleteDoc(doc(db, 'pending_memes', meme.id));
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, approvedPath || pendingPath);
    } catch (err) {
      console.warn('Firestore approve meme warning:', err);
    }
  }
}

export async function rejectFirestoreMeme(memeId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const path = `pending_memes/${memeId}`;
  try {
    await deleteDoc(doc(db, 'pending_memes', memeId));
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, path);
    } catch (err) {
      console.warn('Firestore reject meme warning:', err);
    }
  }
}

export async function deleteFirestoreApprovedMeme(memeId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const path = `approved_memes/${memeId}`;
  try {
    await deleteDoc(doc(db, 'approved_memes', memeId));
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, path);
    } catch (err) {
      console.warn('Firestore delete approved meme warning:', err);
    }
  }
}
