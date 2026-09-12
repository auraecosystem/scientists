import type { MultimodalPrompt, SessionOptions, SmartCreateOptions } from './types';
import { SmartLanguageSession } from './builtin-ai';

export type SemanticModality = 'text' | 'image' | 'audio';
export type SemanticProvider = 'native' | 'webllm' | 'cloud';
export type SemanticOutputType = 'text' | 'json';
export type ValidationStatus = 'verified' | 'rejected' | 'indeterminate';

export interface SemanticCreateRequest {
  subject: unknown;
  inputs: SemanticModality[];
  output: {
    type: SemanticOutputType;
    schema?: Record<string, unknown>;
  };
  constraints?: {
    provider?: SemanticProvider;
    localOnly?: boolean;
    maxTokens?: number;
    maxTurns?: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
  evidence: Record<string, unknown>;
}

export interface SemanticExecution {
  request: SemanticCreateRequest;
  provider: SemanticProvider;
  session: SmartLanguageSession;
  validation: ValidationResult;
}

const PROVIDER_CAPABILITIES: Record<SemanticProvider, readonly SemanticModality[]> = {
  native: ['text', 'image', 'audio'],
  webllm: ['text'],
  cloud: ['text', 'image', 'audio'],
};

function uniqueModalities(inputs: SemanticModality[]): SemanticModality[] {
  return [...new Set(inputs)];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateSchema(schema: unknown): string[] {
  if (!isPlainObject(schema)) return ['output.schema must be a JSON Schema object.'];
  if (schema.type !== undefined && typeof schema.type !== 'string') return ['output.schema.type must be a string when provided.'];
  if (schema.type === 'object' && schema.properties !== undefined && !isPlainObject(schema.properties)) return ['output.schema.properties must be an object when provided.'];
  if (schema.required !== undefined && (!Array.isArray(schema.required) || schema.required.some((key) => typeof key !== 'string'))) return ['output.schema.required must be an array of strings when provided.'];
  return [];
}

function validateRequest(request: SemanticCreateRequest): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isPlainObject(request)) errors.push('Create request must be an object.');
  if (request.subject === undefined || request.subject === null) errors.push('subject is required.');
  if (!Array.isArray(request.inputs) || request.inputs.length === 0) errors.push('inputs must contain at least one modality.');
  else if (request.inputs.some((input) => !['text', 'image', 'audio'].includes(input))) errors.push('inputs contains an unsupported modality.');
  if (!request.output || !['text', 'json'].includes(request.output.type)) errors.push('output.type must be text or json.');
  if (request.output?.type === 'json' && !request.output.schema) errors.push('JSON output requires output.schema.');
  if (request.output?.schema) errors.push(...validateSchema(request.output.schema));

  const constraints = request.constraints;
  if (constraints?.maxTokens !== undefined && (!Number.isFinite(constraints.maxTokens) || constraints.maxTokens < 1)) errors.push('constraints.maxTokens must be a positive finite number.');
  if (constraints?.maxTurns !== undefined && (!Number.isFinite(constraints.maxTurns) || constraints.maxTurns < 1)) errors.push('constraints.maxTurns must be a positive finite number.');
  if (constraints?.provider && !['native', 'webllm', 'cloud'].includes(constraints.provider)) errors.push('constraints.provider is invalid.');

  const normalized = uniqueModalities(request.inputs || []);
  if (normalized.length !== (request.inputs || []).length) warnings.push('Duplicate input modalities were normalized.');

  return {
    valid: errors.length === 0,
    status: errors.length === 0 ? 'verified' : 'rejected',
    errors,
    warnings,
    evidence: { phase: 'create', normalizedInputs: normalized },
  };
}

export function validateSemanticExecution(request: SemanticCreateRequest, provider: SemanticProvider, session?: SmartLanguageSession | null): ValidationResult {
  const base = validateRequest(request);
  const errors = [...base.errors];
  const warnings = [...base.warnings];
  const capabilities = PROVIDER_CAPABILITIES[provider];
  const inputs = uniqueModalities(request.inputs || []);

  if (!capabilities) errors.push(`Unknown provider: ${provider}.`);
  else for (const input of inputs) if (!capabilities.includes(input)) errors.push(`Provider ${provider} does not support ${input} input.`);
  if (request.constraints?.provider && request.constraints.provider !== provider) errors.push(`Requested provider ${request.constraints.provider} does not match selected provider ${provider}.`);
  if (request.constraints?.localOnly && provider === 'cloud') errors.push('localOnly execution cannot use the cloud provider.');
  if (session && session.source !== provider) errors.push(`Session provenance mismatch: session=${session.source}, provider=${provider}.`);
  if (provider === 'webllm' && inputs.some((input) => input !== 'text')) warnings.push('WebLLM currently provides text inference in this runtime; multimodal input must be routed elsewhere.');

  return {
    valid: errors.length === 0,
    status: errors.length === 0 ? 'verified' : 'rejected',
    errors,
    warnings,
    evidence: { phase: 'validate', provider, capabilities, inputs, outputType: request.output.type, localOnly: request.constraints?.localOnly === true, sessionSource: session?.source ?? null },
  };
}

function toPrompt(subject: unknown): MultimodalPrompt {
  if (typeof subject === 'string') return subject;
  return JSON.stringify(subject);
}

function buildSessionOptions(request: SemanticCreateRequest): SessionOptions {
  const inputs = uniqueModalities(request.inputs);
  return {
    expectedInputs: inputs.map((type) => type === 'text' ? { type, languages: ['en'] } : { type }),
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
    ...(request.constraints?.maxTokens ? { maxTokenBudget: request.constraints.maxTokens } : {}),
  };
}

function forceProvider(options: SmartCreateOptions, provider?: SemanticProvider): SmartCreateOptions {
  if (!provider || provider === 'native') return options;
  const baseGlobal = options.globalObject || globalThis;
  const globalObject = { ...baseGlobal, navigator: {}, LanguageModel: undefined as unknown } as Record<string, unknown>;
  delete globalObject.LanguageModel;
  return { ...options, globalObject, preferWebLLM: provider === 'webllm' };
}

export async function createSemanticExecution(request: SemanticCreateRequest, options: SmartCreateOptions = {}): Promise<SemanticExecution> {
  const initial = validateRequest(request);
  if (!initial.valid) throw new TypeError(initial.errors.join(' '));
  if (request.constraints?.localOnly && request.constraints.provider === 'cloud') throw new Error('Semantic validation rejected execution: localOnly execution cannot use the cloud provider.');

  const sessionOptions = buildSessionOptions(request);
  const session = await SmartLanguageSession.create({
    ...forceProvider(options, request.constraints?.provider),
    options: { ...(options.options || {}), ...sessionOptions },
    maxFallbackTurns: request.constraints?.maxTurns ?? options.maxFallbackTurns,
    maxTokenBudget: request.constraints?.maxTokens ?? options.maxTokenBudget,
  });

  const validation = validateSemanticExecution(request, session.source, session);
  if (!validation.valid) {
    await session.destroy();
    throw new Error(`Semantic validation rejected execution: ${validation.errors.join(' ')}`);
  }
  return { request, provider: session.source, session, validation };
}

export async function executeSemanticText(execution: SemanticExecution, options?: { signal?: AbortSignal }): Promise<string> {
  const validation = validateSemanticExecution(execution.request, execution.provider, execution.session);
  if (!validation.valid) throw new Error(`Semantic validation rejected execution: ${validation.errors.join(' ')}`);
  return execution.session.promptToText(toPrompt(execution.request.subject), options);
}

export function validateSemanticResult(execution: SemanticExecution, result: string): ValidationResult {
  const errors: string[] = [];
  if (execution.request.output.type === 'json') {
    try {
      const value = JSON.parse(result);
      const schema = execution.request.output.schema || {};
      if (schema.type === 'object' && !isPlainObject(value)) errors.push('Result does not satisfy schema.type=object.');
      if (Array.isArray(schema.required) && isPlainObject(value)) for (const key of schema.required) if (typeof key === 'string' && !(key in value)) errors.push(`Result is missing required property: ${key}.`);
    } catch {
      errors.push('Result is not valid JSON.');
    }
  }
  return { valid: errors.length === 0, status: errors.length === 0 ? 'verified' : 'rejected', errors, warnings: [], evidence: { phase: 'result', provider: execution.provider, outputType: execution.request.output.type } };
}
