import { Tiktoken } from 'js-tiktoken/lite';
import type { TiktokenBPE } from 'js-tiktoken/lite';

type RankData = TiktokenBPE;

const DB_NAME = 'TiktokenCacheDB';
const STORE_NAME = 'versioned_ranks';
const MANIFEST_VERSION = 'v1.0.8-cl100k';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getOrFetchRanks(): Promise<RankData> {
  try {
    const db = await openDB();
    const cached = await new Promise<{ ranks: RankData; version: string } | null>((res) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('cl100k_base');
      req.onsuccess = () => res(req.result ?? null);
      req.onerror = () => res(null);
    });
    db.close();
    if (cached && cached.version === MANIFEST_VERSION) return cached.ranks;
  } catch (err) {
    console.warn('IndexedDB read issue, loading bundled ranks...', err);
  }

  const module = await import('js-tiktoken/ranks/cl100k_base') as unknown as { default: RankData };
  const ranks = module.default;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ ranks, version: MANIFEST_VERSION }, 'cl100k_base');
    db.close();
  } catch (err) {
    console.warn('IndexedDB write issue:', err);
  }
  return ranks;
}

export async function countPayloadTokensMainThread(messages: Array<{ role: string; content: unknown }>): Promise<number> {
  const ranks = await getOrFetchRanks();
  const encoder = new Tiktoken(ranks);
  let total = 3;
  for (const message of messages) {
    total += 3;
    total += encoder.encode(message.role).length;
    total += encoder.encode(typeof message.content === 'string' ? message.content : JSON.stringify(message.content)).length;
  }
  return total;
}
