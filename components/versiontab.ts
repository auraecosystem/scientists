import { CURRENT_RANK_MANIFEST, RankManifestItem } from './rankManifest';

const DB_NAME = 'TiktokenVersionedDB';
const STORE_NAME = 'versioned_ranks';
const DB_VERSION = 1;

interface CachedEntry {
  ranks: Record<string, number>;
  version: string;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Reads ranks from IndexedDB only if the stored version matches current manifest.
 */
export async function getValidCachedRanks(
  modelKey: 'cl100k_base' | 'o200k_base'
): Promise<Record<string, number> | null> {
  const manifest = CURRENT_RANK_MANIFEST[modelKey];
  if (!manifest) return null;

  try {
    const db = await openDB();
    const entry = await new Promise<CachedEntry | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(manifest.id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (!entry) return null;

    // Invalidation check: If version changed, return null to force re-fetch
    if (entry.version !== manifest.version) {
      console.log(`[Cache Invalidation] Stale rank version detected for ${modelKey}. Evicting...`);
      await evictStaleRank(manifest.id);
      return null;
    }

    return entry.ranks;
  } catch (err) {
    console.warn('Failed reading versioned IndexedDB cache:', err);
    return null;
  }
}

export async function setVersionedCachedRanks(
  modelKey: 'cl100k_base' | 'o200k_base',
  ranks: Record<string, number>
): Promise<void> {
  const manifest = CURRENT_RANK_MANIFEST[modelKey];
  if (!manifest) return;

  try {
    const db = await openDB();
    const entry: CachedEntry = {
      ranks,
      version: manifest.version,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(entry, manifest.id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed writing versioned IndexedDB cache:', err);
  }
}

async function evictStaleRank(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
