import { CURRENT_RANK_MANIFEST } from './rank-manifest';
import type { TiktokenBPE } from 'js-tiktoken/lite';
import type { RankManifestEntry } from './types';

const DB_NAME = 'ScientistsTiktokenCache';
const STORE_NAME = 'versioned-ranks';
const DB_VERSION = 2;
type RankModelKey = keyof typeof CURRENT_RANK_MANIFEST;
type RankData = TiktokenBPE;
type CacheEntry = { ranks: RankData; version: string; updatedAt: number };

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB unavailable.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'));
  });
}

export async function getValidCachedRanks(modelKey: RankModelKey): Promise<RankData | null> {
  const manifest: RankManifestEntry | undefined = CURRENT_RANK_MANIFEST[modelKey];
  if (!manifest || manifest.version === 'uninitialized') return null;
  try {
    const db = await openDB();
    const entry = await new Promise<CacheEntry | null>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(manifest.id);
      request.onsuccess = () => resolve((request.result as CacheEntry | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (!entry || entry.version !== manifest.version || !entry.ranks) return null;
    return entry.ranks;
  } catch { return null; }
}

export async function setVersionedCachedRanks(modelKey: RankModelKey, ranks: RankData): Promise<void> {
  const manifest = CURRENT_RANK_MANIFEST[modelKey];
  if (!manifest || manifest.version === 'uninitialized') return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ ranks, version: manifest.version, updatedAt: Date.now() } satisfies CacheEntry, manifest.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted.'));
    });
    db.close();
  } catch { /* cache is an optimization */ }
}

export async function invalidateAllRankCaches(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB clear aborted.'));
    });
    db.close();
  } catch { /* ignore cache cleanup failures */ }
}
