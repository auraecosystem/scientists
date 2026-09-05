import { Tiktoken } from 'js-tiktoken/lite';
import { getCachedRanks, setCachedRanks } from './idb-storage.mjs';

const CACHE_KEY = 'cl100k_base:v1';
let encoder = null;
let encoderPromise = null;

async function getWorkerEncoder() {
  if (encoder) return encoder;
  if (!encoderPromise) {
    encoderPromise = (async () => {
      const cachedRanks = await getCachedRanks(CACHE_KEY);
      if (cachedRanks) return new Tiktoken(cachedRanks);

      const ranks = await import(
        /* webpackChunkName: "tiktoken-cl100k-ranks-worker" */
        /* webpackMode: "lazy" */
        'js-tiktoken/ranks/cl100k_base'
      );
      const rankData = ranks.default;
      await setCachedRanks(CACHE_KEY, rankData);
      return new Tiktoken(rankData);
    })().then((value) => {
      encoder = value;
      return value;
    }).catch((error) => {
      encoderPromise = null;
      throw error;
    });
  }
  return encoderPromise;
}

function tokenText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    if (part?.type === 'text' && typeof part.value === 'string') return part.value;
    if (part?.type === 'image') return '[image]';
    if (part?.type === 'audio') return '[audio]';
    return '';
  }).join(' ');
}

self.onmessage = async (event) => {
  const { id, messages } = event.data || {};
  if (typeof id !== 'string' || !Array.isArray(messages)) return;

  try {
    const tiktoken = await getWorkerEncoder();
    let tokens = 3;
    for (const message of messages) {
      tokens += 3;
      tokens += tiktoken.encode(String(message?.role ?? '')).length;
      tokens += tiktoken.encode(tokenText(message?.content)).length;
    }
    self.postMessage({ id, tokens });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
