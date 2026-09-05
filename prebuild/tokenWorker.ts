import { Tiktoken } from "js-tiktoken/lite";
import { getOrFetchRanks } from "./tokenService";

let encoder: Tiktoken | null = null;

self.onmessage = async (e: MessageEvent<{ id: string; messages: any[] }>) => {
  const { id, messages } = e.data;
  try {
    if (!encoder) {
      const ranks = await getOrFetchRanks();
      encoder = new Tiktoken(ranks);
    }

    let total = 3;
    for (const m of messages) {
      total += 3;
      total += encoder.encode(m.role).length;
      total += encoder.encode(typeof m.content === "string" ? m.content : JSON.stringify(m.content)).length;
    }

    self.postMessage({ id, tokens: total });
  } catch (err: any) {
    self.postMessage({ id, error: err.message });
  }
};
