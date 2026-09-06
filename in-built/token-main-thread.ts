import { Tiktoken } from 'js-tiktoken/lite';
import { getValidCachedRanks, setVersionedCachedRanks } from './versioned-idb';
import type { MultimodalMessage } from './types';

let cachedEncoder: Tiktoken | null = null;
let encoderPromise: Promise<Tiktoken> | null = null;
const MODEL_KEY = 'cl100k_base' as const;
type RankData = ConstructorParameters<typeof Tiktoken>[0];
type RankModule = { default: RankData };

async function loadEncoder(): Promise<Tiktoken> {
  const cachedRanks = await getValidCachedRanks(MODEL_KEY);
  if (cachedRanks) return new Tiktoken(cachedRanks);
  const ranks = await import('js-tiktoken/ranks/cl100k_base') as unknown as RankModule;
  const rankData = ranks.default;
  await setVersionedCachedRanks(MODEL_KEY, rankData);
  return new Tiktoken(rankData);
}

export function getEncoder(): Promise<Tiktoken> {
  if (cachedEncoder) return Promise.resolve(cachedEncoder);
  if (!encoderPromise) encoderPromise = loadEncoder().then((encoder) => { cachedEncoder = encoder; return encoder; }).catch((error) => { encoderPromise = null; throw error; });
  return encoderPromise;
}

export function prefetchEncoderOnIdle(): void {
  if (cachedEncoder || encoderPromise || typeof window === 'undefined') return;
  const start = () => void getEncoder().catch(() => undefined);
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 3000 });
  else globalThis.setTimeout(start, 1000);
}

export async function countTokens(messages: MultimodalMessage[]): Promise<number> {
  const encoder = await getEncoder();
  let total = 3;
  for (const message of messages) total += 3 + encoder.encode(String(message.role ?? '')).length + encoder.encode(tokenText(message.content)).length;
  return total;
}

export function tokenText(content: MultimodalMessage['content']): string {
  if (typeof content === 'string') return content;
  return content.map((part) => part.type === 'text' && typeof part.value === 'string' ? part.value : part.type === 'image' ? '[image]' : part.type === 'audio' ? '[audio]' : '').join(' ');
}
