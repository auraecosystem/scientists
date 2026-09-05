import { CoreMessage, MultimodalPart, SessionOptions } from "./types";
import { mediaPartToBase64 } from "./mediaUtils";
import { countPayloadTokensMainThread } from "./tokenService";

export class SmartLanguageSession {
  private nativeSession: any | null = null;
  private fallbackEndpoint: string;
  private initialPrompts: CoreMessage[];
  private maxTokenBudget: number;
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, { resolve: (val: number) => void; reject: (err: any) => void }>();

  private constructor(
    nativeSession: any | null,
    fallbackEndpoint: string,
    initialPrompts: CoreMessage[],
    maxTokenBudget: number
  ) {
    this.nativeSession = nativeSession;
    this.fallbackEndpoint = fallbackEndpoint;
    this.initialPrompts = initialPrompts;
    this.maxTokenBudget = maxTokenBudget;

    if (typeof window !== "undefined" && typeof Worker !== "undefined") {
      try {
        this.worker = new Worker(new URL("./tokenWorker.ts", import.meta.url), { type: "module" });
        this.worker.onmessage = (e) => {
          const { id, tokens, error } = e.data;
          const deferred = this.pendingRequests.get(id);
          if (!deferred) return;
          if (error) deferred.reject(new Error(error));
          else deferred.resolve(tokens);
          this.pendingRequests.delete(id);
        };
      } catch (e) {
        console.warn("Worker creation failed; using main thread fallback.");
      }
    }
  }

  static async create(options: SessionOptions = {}, fallbackEndpoint = "/api/chat"): Promise<SmartLanguageSession> {
    const initialPrompts: CoreMessage[] = [];
    if (options.systemPrompt) initialPrompts.push({ role: "system", content: options.systemPrompt });
    if (options.initialPrompts) initialPrompts.push(...options.initialPrompts);

    const fullOptions = {
      expectedInputs: [{ type: "text" }, { type: "image" }, { type: "audio" }],
      expectedOutputs: [{ type: "text" }],
      ...options,
      initialPrompts: initialPrompts.length > 0 ? initialPrompts : undefined,
    };

    if ("LanguageModel" in self) {
      try {
        const availability = await (self as any).LanguageModel.availability(fullOptions);
        if (availability !== "unavailable") {
          const nativeSession = await (self as any).LanguageModel.create(fullOptions);
          if (options.onContextOverflow) {
            nativeSession.addEventListener("contextoverflow", options.onContextOverflow);
          }
          return new SmartLanguageSession(nativeSession, fallbackEndpoint, initialPrompts, options.maxTokenBudget || 4000);
        }
      } catch (err) {
        console.warn("Native AI initialization error:", err);
      }
    }

    return new SmartLanguageSession(null, fallbackEndpoint, initialPrompts, options.maxTokenBudget || 4000);
  }

  private async calculateTokens(messages: CoreMessage[]): Promise<number> {
    if (this.worker) {
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        this.pendingRequests.set(id, { resolve, reject });
        this.worker!.postMessage({ id, messages });
      });
    }
    return countPayloadTokensMainThread(messages);
  }

  private async enforceSlidingWindow(messages: CoreMessage[]): Promise<CoreMessage[]> {
    const systemMsgs = messages.filter((m) => m.role === "system");
    let conversation = messages.filter((m) => m.role !== "system");

    let payload = [...systemMsgs, ...conversation];
    let tokens = await this.calculateTokens(payload);

    while (tokens > this.maxTokenBudget && conversation.length > 1) {
      conversation.shift();
      payload = [...systemMsgs, ...conversation];
      tokens = await this.calculateTokens(payload);
    }
    return payload;
  }

  async *promptStreaming(input: string | MultimodalPart[] | CoreMessage[]): AsyncGenerator<string, void, unknown> {
    if (this.nativeSession) {
      const stream = this.nativeSession.promptStreaming(input);
      for await (const chunk of stream) yield chunk;
    } else {
      let rawMsgs: CoreMessage[] = [];
      if (typeof input === "string") {
        rawMsgs = [{ role: "user", content: input }];
      } else if (Array.isArray(input)) {
        if ("role" in input[0]) rawMsgs = input as CoreMessage[];
        else rawMsgs = [{ role: "user", content: input as MultimodalPart[] }];
      }

      const totalRaw = [...this.initialPrompts, ...rawMsgs];
      const trimmed = await this.enforceSlidingWindow(totalRaw);

      const serializedMsgs = await Promise.all(
        trimmed.map(async (msg) => {
          if (typeof msg.content === "string") return msg;
          const processedParts = await Promise.all(msg.content.map(mediaPartToBase64));
          return { ...msg, content: processedParts };
        })
      );

      const res = await fetch(this.fallbackEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: serializedMsgs }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP Error: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        yield text;
      }
    }
  }

  destroy() {
    this.worker?.terminate();
    if (this.nativeSession?.destroy) this.nativeSession.destroy();
  }
}
