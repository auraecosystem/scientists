import { countTokens as countTokensMainThread, getEncoder as getMainThreadEncoder, prefetchEncoderOnIdle } from './token-main-thread';
import type { MultimodalMessage } from './types';

type Pending = { resolve: (value: number) => void; reject: (reason?: unknown) => void };

class TokenService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, Pending>();
  private useWorker = false;
  constructor() { this.initWorker(); }
  private initWorker(): void {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;
    try {
      this.worker = new Worker(new URL('./token-worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<{ id?: string; tokens?: number; error?: string }>) => {
        const { id, tokens, error } = event.data ?? {};
        if (!id) return;
        const pending = this.pendingRequests.get(id);
        if (!pending) return;
        this.pendingRequests.delete(id);
        if (error) pending.reject(new Error(error)); else pending.resolve(Number(tokens));
      };
      this.worker.onerror = () => this.fallbackToMainThread();
      this.useWorker = true;
    } catch { this.fallbackToMainThread(); }
  }
  private fallbackToMainThread(): void {
    this.useWorker = false;
    this.worker?.terminate();
    this.worker = null;
    for (const pending of this.pendingRequests.values()) pending.reject(new Error('Token worker stopped.'));
    this.pendingRequests.clear();
  }
  prefetch(): void { prefetchEncoderOnIdle(); }
  async countPayloadTokens(messages: MultimodalMessage[]): Promise<number> {
    if (!this.useWorker || !this.worker) return countTokensMainThread(messages);
    try { return await this.countWithWorker(messages); }
    catch (error) { this.fallbackToMainThread(); try { return await countTokensMainThread(messages); } catch { throw error; } }
  }
  private countWithWorker(messages: MultimodalMessage[]): Promise<number> {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      try { this.worker?.postMessage({ id, messages }); } catch (error) { this.pendingRequests.delete(id); reject(error); }
    });
  }
  async getMainThreadEncoder() { return getMainThreadEncoder(); }
  terminate(): void {
    this.worker?.terminate(); this.worker = null; this.useWorker = false;
    for (const pending of this.pendingRequests.values()) pending.reject(new Error('Token service terminated.'));
    this.pendingRequests.clear();
  }
}
export const tokenService = new TokenService();
