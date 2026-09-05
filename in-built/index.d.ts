// Scientists local AI runtime declarations. No external runtime navigation is required.

export type Availability = "unavailable" | "downloadable" | "downloading" | "available";

export interface CreateMonitorEventMap { downloadprogress: ProgressEvent; }
export interface CreateMonitor extends EventTarget {
  addEventListener<K extends keyof CreateMonitorEventMap>(type: K, listener: (this: CreateMonitor, ev: CreateMonitorEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<K extends keyof CreateMonitorEventMap>(type: K, listener: (this: CreateMonitor, ev: CreateMonitorEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}
export type CreateMonitorCallback = (monitor: CreateMonitor) => void;

export type LanguageModelSamplingMode = "most-predictable" | "predictable" | "slightly-predictable" | "balanced" | "slightly-creative" | "creative" | "most-creative";
export type LanguageModelSamplingOptions = { samplingMode?: LanguageModelSamplingMode; topK?: number; temperature?: number };
export type LanguageModelCreateCoreOptions = { expectedInputs?: LanguageModelExpected[]; expectedOutputs?: LanguageModelExpected[]; tools?: LanguageModelTool[]; systemPrompt?: string } & LanguageModelSamplingOptions;
export type LanguageModelCreateOptions = LanguageModelCreateCoreOptions & { signal?: AbortSignal; monitor?: CreateMonitorCallback; initialPrompts?: LanguageModelMessage[] };
export interface LanguageModelPromptOptions { responseConstraint?: Record<string, unknown>; omitResponseConstraintInput?: boolean; signal?: AbortSignal; }
export interface LanguageModelAppendOptions { signal?: AbortSignal; }
export interface LanguageModelCloneOptions { signal?: AbortSignal; }
export interface LanguageModelExpected { type: LanguageModelMessageType; languages?: string[]; }
export interface LanguageModelTool { name: string; description: string; inputSchema: object; execute: (...args: any[]) => Promise<string>; }
export type LanguageModelPrompt = string | (LanguageModelMessage | LanguageModelAssistantMessage)[];
export interface LanguageModelMessage { role: "user" | "assistant" | "system"; content: LanguageModelMessageContent[] | string; }
export interface LanguageModelAssistantMessage extends LanguageModelMessage { role: "assistant"; prefix?: boolean; }
export interface LanguageModelMessageContent { type: "text" | "image" | "audio"; value: ImageBitmapSource | AudioBuffer | BufferSource | string; }
export type LanguageModelMessageType = "text" | "image" | "audio";

export declare class LanguageModel extends EventTarget {
  static create(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
  static availability(options?: LanguageModelCreateCoreOptions): Promise<Availability>;
  prompt(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise<string>;
  promptStreaming(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): ReadableStream<string>;
  append(input: LanguageModelPrompt, options?: LanguageModelAppendOptions): Promise<void>;
  clone(options?: LanguageModelCloneOptions): Promise<LanguageModel>;
  measureContextUsage(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise<number>;
  countPromptTokens(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise<number>;
  readonly contextUsage: number;
  readonly contextWindow: number;
  readonly temperature: number;
  readonly topK: number;
  destroy(): void;
}

export interface LanguageModelParams { readonly defaultTopK: number; readonly maxTopK: number; readonly defaultTemperature: number; readonly maxTemperature: number; }

export interface SmartSessionStatus { state: string; source: "native" | "webllm" | "cloud"; availability?: string; model?: string; }
export interface SmartSessionProgress { loaded: number; complete: boolean; extracting: boolean; source: "native" | "webllm"; }
export interface SmartSessionCreateOptions {
  options?: LanguageModelCreateCoreOptions;
  fallbackEndpoint?: string;
  signal?: AbortSignal;
  onProgress?: (progress: SmartSessionProgress) => void;
  onStatus?: (status: SmartSessionStatus) => void;
  globalObject?: any;
  fetchImpl?: typeof fetch;
  preferWebLLM?: boolean;
  webllmModel?: string;
  webllmModule?: any;
}
export interface SmartPromptOptions extends LanguageModelPromptOptions {}

export declare class SmartLanguageSession extends EventTarget {
  static create(options?: SmartSessionCreateOptions): Promise<SmartLanguageSession>;
  readonly source: "native" | "webllm" | "cloud";
  readonly contextUsage: number | undefined;
  readonly contextWindow: number | undefined;
  readonly contextUsageRatio: number | undefined;
  promptStreaming(prompt: LanguageModelPrompt, options?: SmartPromptOptions): AsyncGenerator<string>;
  promptToText(prompt: LanguageModelPrompt, onChunk?: (chunk: string, accumulated: string) => void, options?: SmartPromptOptions): Promise<string>;
  append(messages: LanguageModelPrompt, options?: LanguageModelAppendOptions): Promise<void>;
  clone(options?: LanguageModelCloneOptions): Promise<SmartLanguageSession>;
  measureContextUsage(input: LanguageModelPrompt, options?: SmartPromptOptions): Promise<number>;
  destroy(): Promise<void>;
}

export declare const DEFAULT_LANGUAGE_OPTIONS: Readonly<LanguageModelCreateCoreOptions>;
export declare const DEFAULT_WEBLLM_MODEL: string;
export declare function isSupported(globalObject?: any): boolean;
export declare function isWebLLMSupported(globalObject?: any): boolean;
export declare function isAbortError(error: unknown): boolean;
export declare function getAvailability(options?: LanguageModelCreateCoreOptions, globalObject?: any): Promise<Availability | "unsupported">;
export declare function createLocalSession(options?: any): Promise<LanguageModel>;
export declare function createWebLLMSession(options?: any): Promise<any>;
export declare function createSmartSession(options?: SmartSessionCreateOptions): Promise<SmartLanguageSession>;
export declare function promptStreaming(session: LanguageModel, prompt: LanguageModelPrompt, options?: SmartPromptOptions): Promise<ReadableStream<string>>;
export declare function promptToText(session: LanguageModel, prompt: LanguageModelPrompt, onChunk?: (chunk: string, accumulated: string) => void, options?: SmartPromptOptions): Promise<string>;
export declare function normalizeStream(stream: AsyncIterable<string>): AsyncGenerator<string>;
export declare function createHybridRunner(options: { localSession?: SmartLanguageSession | null; cloudPrompt: (prompt: string) => Promise<string> }): (prompt: string, options?: { preferLocal?: boolean; onChunk?: (chunk: string, accumulated: string) => void; options?: SmartPromptOptions }) => Promise<string>;

declare global { interface Window { ai?: { languageModel: typeof LanguageModel }; } }
