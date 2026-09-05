const DB_NAME = 'ScientistsTiktokenCache';
const STORE_NAME = 'ranks';
const DB_VERSION = 1;

function available() {
  return typeof indexedDB !== 'undefined';
}

function openDB() {
  if (!available()) return Promise.reject(new Error('IndexedDB is unavailable.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed.'));
  });
}

export async function getCachedRanks(key) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('IndexedDB read failed.'));
    });
  } catch {
    return null;
  }
}

export async function setCachedRanks(key, value) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('IndexedDB write failed.'));
    });
  } catch {
    // Cache failure must never prevent token counting.
  }
}
