import { Tiktoken } from 'js-tiktoken/lite';
import { getCachedRanks, setCachedRanks } from './idb-storage.mjs';

const CACHE_KEY = 'cl100k_base:v1';
let cachedEncoder = null;
let encoderPromise = null;

async function loadEncoder() {
  const cachedRanks = await getCachedRanks(CACHE_KEY);
  if (cachedRanks) return new Tiktoken(cachedRanks);

  const ranks = await import(
    /* webpackChunkName: "tiktoken-cl100k-ranks" */
    /* webpackMode: "lazy" */
    /* webpackPrefetch: true */
    'js-tiktoken/ranks/cl100k_base'
  );
  const rankData = ranks.default;
  await setCachedRanks(CACHE_KEY, rankData);
  return new Tiktoken(rankData);
}

export function getEncoder() {
  if (cachedEncoder) return Promise.resolve(cachedEncoder);
  if (!encoderPromise) {
    encoderPromise = loadEncoder()
      .then((encoder) => {
        cachedEncoder = encoder;
        return encoder;
      })
      .catch((error) => {
        encoderPromise = null;
        throw error;
      });
  }
  return encoderPromise;
}

export function prefetchEncoderOnIdle() {
  if (cachedEncoder || encoderPromise || typeof window === 'undefined') return;

  const start = () => {
    void getEncoder().catch(() => {
      // Demand loading remains available after an idle-prefetch failure.
    });
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(start, { timeout: 3000 });
  } else {
    window.setTimeout(start, 1000);
  }
}

export async function countTokens(messages) {
  const encoder = await getEncoder();
  let total = 3;
  for (const message of messages) {
    total += 3;
    total += encoder.encode(String(message.role ?? '')).length;
    total += encoder.encode(tokenText(message.content)).length;
  }
  return total;
}

export function tokenText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    if (part?.type === 'text' && typeof part.value === 'string') return part.value;
    if (part?.type === 'image') return '[image]';
    if (part?.type === 'audio') return '[audio]';
    return '';
  }).join(' ');
}
