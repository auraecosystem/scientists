import { Tiktoken } from "js-tiktoken/lite";

const DB_NAME = "TiktokenCacheDB";
const STORE_NAME = "versioned_ranks";
const MANIFEST_VERSION = "v1.0.8-cl100k";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getOrFetchRanks(): Promise<Record<string, number>> {
  try {
    const db = await openDB();
    const cached = await new Promise<any>((res) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get("cl100k_base");
      req.onsuccess = () => res(req.result);
    });

    if (cached && cached.version === MANIFEST_VERSION) {
      return cached.ranks;
    }
  } catch (err) {
    console.warn("IndexedDB read issue, fetching network ranks...", err);
  }

  // Dynamic import with bundler chunk naming
  const module = await import(
    /* webpackChunkName: "tiktoken-cl100k-ranks" */
    /* webpackPrefetch: true */
    "js-tiktoken/ranks/cl100k_base"
  );
  const ranks = module.default;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ ranks, version: MANIFEST_VERSION }, "cl100k_base");
  } catch (err) {
    console.warn("IndexedDB write issue:", err);
  }

  return ranks;
}

export async function countPayloadTokensMainThread(messages: any[]): Promise<number> {
  const ranks = await getOrFetchRanks();
  const encoder = new Tiktoken(ranks);
  let total = 3;

  for (const m of messages) {
    total += 3;
    total += encoder.encode(m.role).length;
    total += encoder.encode(typeof m.content === "string" ? m.content : JSON.stringify(m.content)).length;
  }
  return total;
}
