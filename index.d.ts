// Built-in AI APIs Specification (W3C Web Machine Learning Working Group)
// https://webmachinelearning.github.io/prompt-api/

export type Availability = "unavailable" | "downloadable" | "downloading" | "available";

export interface CreateMonitorEventMap {
    downloadprogress: ProgressEvent;
}

export interface CreateMonitor extends EventTarget {
    ondownloadprogress: ((this: CreateMonitor, ev: ProgressEvent) => any) | null;

    addEventListener<K extends keyof CreateMonitorEventMap>(
        type: K,
        listener: (this: CreateMonitor, ev: CreateMonitorEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener<K extends keyof CreateMonitorEventMap>(
        type: K,
        listener: (this: CreateMonitor, ev: CreateMonitorEventMap[K]) => any,
        options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions
    ): void;
}

export type CreateMonitorCallback = (monitor: CreateMonitor) => void;

export interface DestroyableModel {
    destroy(): void;
}

// Language Model (Prompt API)
export interface LanguageModelEventMap {
    contextoverflow: Event;
    quotaoverflow: Event;
}

export declare class LanguageModel extends EventTarget implements DestroyableModel {
    static create(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
    static availability(options?: LanguageModelCreateCoreOptions): Promise<Availability>;
    static params(): Promise<LanguageModelParams>;

    prompt(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise<string>;
    promptStreaming(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): ReadableStream<string>;
    append(input: LanguageModelPrompt, options?: LanguageModelAppendOptions): Promise<void>;

    measureContextUsage(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise<number>;
    countPromptTokens(input: LanguageModelPrompt, options?: LanguageModelPromptOptions): Promise<number>;

    readonly contextUsage: number;
    readonly contextWindow: number;
    readonly temperature: number;
    readonly topK: number;

    oncontextoverflow: ((this: LanguageModel, ev: Event) => any) | null;

    addEventListener<K extends keyof LanguageModelEventMap>(
        type: K,
        listener: (this: LanguageModel, ev: LanguageModelEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener<K extends keyof LanguageModelEventMap>(
        type: K,
        listener: (this: LanguageModel, ev: LanguageModelEventMap[K]) => any,
        options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions
    ): void;

    clone(options?: LanguageModelCloneOptions): Promise<LanguageModel>;
    destroy(): void;
}

export interface LanguageModelParams {
    readonly defaultTopK: number;
    readonly maxTopK: number;
    readonly defaultTemperature: number;
    readonly maxTemperature: number;
}

export type LanguageModelSamplingMode =
    | "most-predictable"
    | "predictable"
    | "balanced"
    | "creative"
    | "most-creative";

export type LanguageModelSamplingOptions = {
    samplingMode?: LanguageModelSamplingMode;
    topK?: number;
    temperature?: number;
};

export type LanguageModelCreateCoreOptions = {
    expectedInputs?: LanguageModelExpected[];
    expectedOutputs?: LanguageModelExpected[];
    tools?: LanguageModelTool[];
    systemPrompt?: string;
} & LanguageModelSamplingOptions;

export type LanguageModelCreateOptions = LanguageModelCreateCoreOptions & {
    signal?: AbortSignal;
    monitor?: CreateMonitorCallback;
    initialPrompts?: LanguageModelMessage[];
};

export interface LanguageModelPromptOptions {
    responseConstraint?: Record<string, unknown>;
    omitResponseConstraintInput?: boolean;
    signal?: AbortSignal;
}

export interface LanguageModelAppendOptions {
    signal?: AbortSignal;
}

export interface LanguageModelCloneOptions {
    signal?: AbortSignal;
}

export interface LanguageModelExpected {
    type: LanguageModelMessageType;
    languages?: string[];
}

export interface LanguageModelTool {
    name: string;
    description: string;
    inputSchema: object;
    execute: (...args: any[]) => Promise<string>;
}

export type LanguageModelPrompt = (LanguageModelMessage | LanguageModelAssistantMessage)[] | string;

export interface LanguageModelMessage {
    role: LanguageModelMessageRole;
    content: LanguageModelMessageContent[] | string;
}

export interface LanguageModelAssistantMessage {
    role: "assistant";
    content: LanguageModelMessageContent[] | string;
    prefix?: boolean;
}

export interface LanguageModelSystemMessage {
    role: "system";
    content: LanguageModelMessageContent[] | string;
}

export interface LanguageModelMessageContent {
    type: LanguageModelMessageType;
    value: LanguageModelMessageValue;
}

export type LanguageModelMessageRole = "user" | "assistant" | "system";
export type LanguageModelMessageType = "text" | "image" | "audio";
export type LanguageModelMessageValue = ImageBitmapSource | AudioBuffer | BufferSource | string;

// Writing Assistance APIs
export type PerformancePreference = "auto" | "speed" | "capability";

export declare class Summarizer implements DestroyableModel {
    static create(options?: SummarizerCreateOptions): Promise<Summarizer>;
    static availability(options?: SummarizerCreateCoreOptions): Promise<Availability>;

    summarize(input: string, options?: SummarizerSummarizeOptions): Promise<string>;
    summarizeStreaming(input: string, options?: SummarizerSummarizeOptions): ReadableStream<string>;

    readonly sharedContext: string;
    readonly type: SummarizerType;
    readonly format: SummarizerFormat;
    readonly length: SummarizerLength;

    measureInputUsage(input: string, options?: SummarizerSummarizeOptions): Promise<number>;
    destroy(): void;
}

export interface SummarizerCreateCoreOptions {
    type?: SummarizerType;
    format?: SummarizerFormat;
    length?: SummarizerLength;
    preference?: PerformancePreference;
    expectedInputLanguages?: readonly string[];
    expectedContextLanguages?: readonly string[];
    outputLanguage?: string;
}

export interface SummarizerCreateOptions extends SummarizerCreateCoreOptions {
    signal?: AbortSignal;
    monitor?: CreateMonitorCallback;
    sharedContext?: string;
}

export interface SummarizerSummarizeOptions {
    signal?: AbortSignal;
    context?: string;
}

export type SummarizerType = "tldr" | "teaser" | "key-points" | "headline";
export type SummarizerFormat = "plain-text" | "markdown";
export type SummarizerLength = "short" | "medium" | "long";

export declare class Writer implements DestroyableModel {
    static create(options?: WriterCreateOptions): Promise<Writer>;
    static availability(options?: WriterCreateCoreOptions): Promise<Availability>;

    write(input: string, options?: WriterWriteOptions): Promise<string>;
    writeStreaming(input: string, options?: WriterWriteOptions): ReadableStream<string>;

    readonly sharedContext?: string;
    readonly tone: WriterTone;
    readonly format: WriterFormat;
    readonly length: WriterLength;

    destroy(): void;
}

export interface WriterCreateCoreOptions {
    tone?: WriterTone;
    format?: WriterFormat;
    length?: WriterLength;
    expectedInputLanguages?: string[];
    expectedContextLanguages?: string[];
    outputLanguage?: string;
}

export interface WriterCreateOptions extends WriterCreateCoreOptions {
    signal?: AbortSignal;
    monitor?: CreateMonitorCallback;
    sharedContext?: string;
}

export interface WriterWriteOptions {
    context?: string;
    signal?: AbortSignal;
}

export type WriterTone = "formal" | "neutral" | "casual";
export type WriterFormat = "plain-text" | "markdown";
export type WriterLength = "short" | "medium" | "long";

export declare class Rewriter implements DestroyableModel {
    static create(options?: RewriterCreateOptions): Promise<Rewriter>;
    static availability(options?: RewriterCreateCoreOptions): Promise<Availability>;

    rewrite(input: string, options?: RewriterRewriteOptions): Promise<string>;
    rewriteStreaming(input: string, options?: RewriterRewriteOptions): ReadableStream<string>;

    readonly sharedContext: string;
    readonly tone: RewriterTone;
    readonly format: RewriterFormat;
    readonly length: RewriterLength;

    destroy(): void;
}

export interface RewriterCreateCoreOptions {
    tone?: RewriterTone;
    format?: RewriterFormat;
    length?: RewriterLength;
    expectedInputLanguages?: readonly string[];
    expectedContextLanguages?: readonly string[];
    outputLanguage?: string;
}

export interface RewriterCreateOptions extends RewriterCreateCoreOptions {
    signal?: AbortSignal;
    monitor?: CreateMonitorCallback;
    sharedContext?: string;
}

export interface RewriterRewriteOptions {
    context?: string;
    signal?: AbortSignal;
}

export type RewriterTone = "as-is" | "more-formal" | "more-casual";
export type RewriterFormat = "as-is" | "plain-text" | "markdown";
export type RewriterLength = "as-is" | "shorter" | "longer";

// Translation & Language Detection APIs
export declare class Translator implements DestroyableModel {
    static create(options: TranslatorCreateOptions): Promise<Translator>;
    static availability(options: TranslatorCreateCoreOptions): Promise<Availability>;

    translate(input: string, options?: TranslatorTranslateOptions): Promise<string>;
    translateStreaming(input: string, options?: TranslatorTranslateOptions): ReadableStream<string>;

    readonly sourceLanguage: string;
    readonly targetLanguage: string;

    destroy(): void;
}

export interface TranslatorCreateCoreOptions {
    sourceLanguage: string;
    targetLanguage: string;
}

export interface TranslatorCreateOptions extends TranslatorCreateCoreOptions {
    signal?: AbortSignal;
    monitor?: CreateMonitorCallback;
}

export interface TranslatorTranslateOptions {
    signal?: AbortSignal;
}

export declare class LanguageDetector implements DestroyableModel {
    static create(options?: LanguageDetectorCreateOptions): Promise<LanguageDetector>;
    static availability(options?: LanguageDetectorCreateCoreOptions): Promise<Availability>;

    detect(input: string, options?: LanguageDetectorDetectOptions): Promise<LanguageDetectionResult[]>;

    readonly expectedInputLanguages: readonly string[];
    destroy(): void;
}

export interface LanguageDetectorCreateCoreOptions {
    expectedInputLanguages?: string[];
}

export interface LanguageDetectorCreateOptions extends LanguageDetectorCreateCoreOptions {
    signal?: AbortSignal;
    monitor?: CreateMonitorCallback;
}

export interface LanguageDetectorDetectOptions {
    signal?: AbortSignal;
}

export interface LanguageDetectionResult {
    detectedLanguage?: string;
    confidence?: number;
}

// Proofreader API
export declare class Proofreader implements DestroyableModel {
    static create(options?: ProofreaderCreateOptions): Promise<Proofreader>;
    static availability(options?: ProofreaderCreateCoreOptions): Promise<Availability>;

    proofread(input: string, options?: ProofreaderProofreadOptions): Promise<ProofreadResult>;

    readonly includeCorrectionTypes: boolean;
    readonly includeCorrectionExplanations: boolean;
    readonly correctionExplanationLanguage?: string;
    readonly expectedInputLanguages: readonly string[];

    destroy(): void;
}

export interface ProofreaderCreateCoreOptions {
    includeCorrectionTypes?: boolean;
    includeCorrectionExplanations?: boolean;
    correctionExplanationLanguage?: string;
    expectedInputLanguages?: string[];
}

export interface ProofreaderCreateOptions extends ProofreaderCreateCoreOptions {
    signal?: AbortSignal;
    monitor?: CreateMonitorCallback;
}

export interface ProofreaderProofreadOptions {
    signal?: AbortSignal;
}

export interface ProofreadResult {
    correctedInput: string;
    corrections: ProofreadCorrection[];
}

export interface ProofreadCorrection {
    startIndex: number;
    endIndex: number;
    correction: string;
    types?: CorrectionType[];
    explanation?: string;
}

export type CorrectionType = "spelling" | "punctuation" | "capitalization" | "preposition" | "missing-words" | "grammar";

// Global Augmentation for Window / Global Scope
declare global {
    interface Window {
        ai?: {
            languageModel: typeof LanguageModel;
            summarizer: typeof Summarizer;
            writer: typeof Writer;
            rewriter: typeof Rewriter;
            translator: typeof Translator;
            languageDetector: typeof LanguageDetector;
            proofreader: typeof Proofreader;
        };
    }
}
