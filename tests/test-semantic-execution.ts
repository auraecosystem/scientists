import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSemanticExecution, validateSemanticExecution, validateSemanticResult } from '../in-built/semantic-execution';

test('semantic validation rejects unsupported WebLLM modality', () => {
  const result = validateSemanticExecution({ subject: 'describe image', inputs: ['text', 'image'], output: { type: 'text' } }, 'webllm');
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /does not support image/);
});

test('semantic validation enforces localOnly', () => {
  const result = validateSemanticExecution({ subject: 'hello', inputs: ['text'], output: { type: 'text' }, constraints: { localOnly: true } }, 'cloud');
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /localOnly/);
});

test('semantic validation requires a JSON schema', () => {
  const result = validateSemanticExecution({ subject: 'return json', inputs: ['text'], output: { type: 'json' } } as any, 'cloud');
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /output.schema/);
});

test('semantic create selects cloud fallback and returns verified state', async () => {
  const execution = await createSemanticExecution({ subject: 'hello', inputs: ['text'], output: { type: 'text' } }, {
    globalObject: {},
    fetchImpl: async () => new Response('answer'),
  });
  assert.equal(execution.provider, 'cloud');
  assert.equal(execution.validation.status, 'verified');
  assert.equal(await execution.session.promptToText('hello'), 'answer');
  await execution.session.destroy();
});

test('semantic result validation verifies JSON required fields', async () => {
  const execution = await createSemanticExecution({ subject: 'json', inputs: ['text'], output: { type: 'json', schema: { type: 'object', required: ['answer'] } } }, {
    globalObject: {},
    fetchImpl: async () => new Response('{}'),
  });
  assert.equal(validateSemanticResult(execution, '{"answer":"ok"}').status, 'verified');
  assert.equal(validateSemanticResult(execution, '{}').valid, false);
  await execution.session.destroy();
});
