import { countTokens as countTokensMainThread, getEncoder as getMainThreadEncoder, prefetchEncoderOnIdle } from './token-main-thread.mjs';

class TokenService {
  constructor() {
    this.worker = null;
    this.pendingRequests = new Map();
    this.useWorker = false;
    this.initWorker();
  }

  initWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    try {
      this.worker = new Worker(new URL('./token-worker.mjs', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event) => {
        const { id, tokens, error } = event.data || {};
        const pending = this.pendingRequests.get(id);
        if (!pending) return;
        this.pendingRequests.delete(id);
        if (error) pending.reject(new Error(error));
        else pending.resolve(tokens);
      };
      this.worker.onerror = () => this.fallbackToMainThread();
      this.useWorker = true;
    } catch {
      this.fallbackToMainThread();
    }
  }

  fallbackToMainThread() {
    this.useWorker = false;
    this.worker?.terminate();
    this.worker = null;
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('Token worker stopped; retrying on the main thread.'));
      this.pendingRequests.delete(id);
    }
  }

  prefetch() {
    prefetchEncoderOnIdle();
  }

  async countPayloadTokens(messages) {
    if (!this.useWorker || !this.worker) return countTokensMainThread(messages);
    try {
      return await this.countWithWorker(messages);
    } catch (error) {
      this.fallbackToMainThread();
      return countTokensMainThread(messages).catch(() => { throw error; });
    }
  }

  countWithWorker(messages) {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      try {
        this.worker.postMessage({ id, messages });
      } catch (error) {
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  async getMainThreadEncoder() {
    return getMainThreadEncoder();
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.useWorker = false;
    for (const pending of this.pendingRequests.values()) pending.reject(new Error('Token service terminated.'));
    this.pendingRequests.clear();
  }
}

export const tokenService = new TokenService();
