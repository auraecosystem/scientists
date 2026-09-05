export type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';
export type SamplingMode = 'most-predictable' | 'predictable' | 'slightly-predictable' | 'balanced' | 'slightly-creative' | 'creative' | 'most-creative';
export type MediaInput = Blob | HTMLCanvasElement | HTMLImageElement | AudioBuffer | ArrayBuffer | ArrayBufferView;
export interface InitialPrompt { role: 'system' | 'user' | 'assistant'; content: string; prefix?: boolean }
export interface SessionOptions { systemPrompt?: string; initialPrompts?: InitialPrompt[]; expectedInputs?: Array<{ type: 'text' | 'image' | 'audio'; languages?: string[] }>; expectedOutputs?: Array<{ type: 'text'; languages?: string[] }>; samplingMode?: SamplingMode; topK?: number; temperature?: number; maxTokenBudget?: number; onContextOverflow?: (event: Event) => void }
export interface MultimodalPart { type: 'text' | 'image' | 'audio'; value?: string | MediaInput; base64Data?: string; mimeType?: string }
export interface MultimodalMessage { role: 'user' | 'assistant' | 'system'; content: string | MultimodalPart[] }
export type MultimodalPrompt = string | MultimodalPart[] | MultimodalMessage[];
export interface PromptOptions { responseConstraint?: Record<string, unknown>; omitResponseConstraintInput?: boolean; signal?: AbortSignal }
export interface Progress { loaded: number; complete: boolean; extracting: boolean; source: 'native' | 'webllm' }
export interface Status { state: string; source: 'native' | 'webllm' | 'cloud'; availability?: string; model?: string }
export interface SmartCreateOptions { options?: SessionOptions; fallbackEndpoint?: string; signal?: AbortSignal; onProgress?: (progress: Progress) => void; onStatus?: (status: Status) => void; globalObject?: any; fetchImpl?: typeof fetch; preferWebLLM?: boolean; webllmModel?: string; webllmModule?: any; maxFallbackTurns?: number; maxTokenBudget?: number; useTokenBudget?: boolean }
export interface NativeLanguageModel extends EventTarget { prompt(input: MultimodalPrompt, options?: PromptOptions): Promise<string>; promptStreaming(input: MultimodalPrompt, options?: PromptOptions): ReadableStream<string>; append(input: MultimodalPrompt, options?: { signal?: AbortSignal }): Promise<void>; clone(options?: { signal?: AbortSignal }): Promise<NativeLanguageModel>; measureContextUsage?(input: MultimodalPrompt, options?: PromptOptions): number | Promise<number>; contextUsage?: number; contextWindow?: number; destroy(): void }
export interface WebLLMEngine { chat: { completions: { create(options: any): Promise<AsyncIterable<any>> } }; unload?: () => Promise<void> }
export interface RankManifestEntry { id: string; version: string; model: string }
export type MessageLike = MultimodalMessage;
