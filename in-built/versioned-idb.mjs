import { CURRENT_RANK_MANIFEST } from './rank-manifest.mjs';

const DB_NAME = 'ScientistsTiktokenCache';
const STORE_NAME = 'versioned-ranks';
const DB_VERSION = 2;

function openDB() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable.'));
  }
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

export async function getValidCachedRanks(modelKey) {
  const manifest = CURRENT_RANK_MANIFEST[modelKey];
  if (!manifest || manifest.version === 'uninitialized') return null;

  try {
    const db = await openDB();
    const entry = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(manifest.id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();

    if (!entry || entry.version !== manifest.version || !entry.ranks) {
      if (entry) await evictStaleRank(manifest.id);
      return null;
    }
    return entry.ranks;
  } catch {
    return null;
  }
}

export async function setVersionedCachedRanks(modelKey, ranks) {
  const manifest = CURRENT_RANK_MANIFEST[modelKey];
  if (!manifest || manifest.version === 'uninitialized') return;

  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({
        ranks,
        version: manifest.version,
        updatedAt: Date.now(),
      }, manifest.id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted.'));
    });
    db.close();
  } catch {
    // Cache is an optimization; token counting must still work without it.
  }
}

async function evictStaleRank(id) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB delete aborted.'));
    });
    db.close();
  } catch {
    // Ignore cache eviction failures; the next read will miss safely.
  }
}

export async function invalidateAllRankCaches() {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB clear aborted.'));
    });
    db.close();
  } catch {
    // Ignore cache cleanup failures.
  }
}
