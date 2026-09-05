import { Tiktoken } from 'js-tiktoken/lite';
import { getValidCachedRanks, setVersionedCachedRanks } from './versioned-idb';
import type { MultimodalMessage } from './types';

const MODEL_KEY = 'cl100k_base';
let encoder: Tiktoken | null = null;
let encoderPromise: Promise<Tiktoken> | null = null;
type RankModule = { default: Record<string, number> };

async function getWorkerEncoder(): Promise<Tiktoken> {
  if (encoder) return encoder;
  if (!encoderPromise) encoderPromise = (async () => {
    const cachedRanks = await getValidCachedRanks(MODEL_KEY);
    if (cachedRanks) return new Tiktoken(cachedRanks);
    const ranks = await import('js-tiktoken/ranks/cl100k_base') as RankModule;
    await setVersionedCachedRanks(MODEL_KEY, ranks.default);
    return new Tiktoken(ranks.default);
  })().then((value) => { encoder = value; return value; }).catch((error) => { encoderPromise = null; throw error; });
  return encoderPromise;
}

function tokenText(content: MultimodalMessage['content']): string {
  if (typeof content === 'string') return content;
  return content.map((part) => part.type === 'text' && typeof part.value === 'string' ? part.value : part.type === 'image' ? '[image]' : part.type === 'audio' ? '[audio]' : '').join(' ');
}

self.onmessage = async (event: MessageEvent<{ id?: string; messages?: MultimodalMessage[] }>) => {
  const { id, messages } = event.data ?? {};
  if (typeof id !== 'string' || !Array.isArray(messages)) return;
  try {
    const tiktoken = await getWorkerEncoder();
    let tokens = 3;
    for (const message of messages) tokens += 3 + tiktoken.encode(String(message.role ?? '')).length + tiktoken.encode(tokenText(message.content)).length;
    self.postMessage({ id, tokens });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
