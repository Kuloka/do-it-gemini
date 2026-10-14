import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChatCommand, selectModel } from '../src/chat-commands.js';

test('model command accepts slash spacing, listing and explicit IDs', () => {
  assert.deepEqual(parseChatCommand('/model'), { action: '/model', value: '' });
  assert.deepEqual(parseChatCommand('/ model gemini-3.8-flash'), { action: '/model', value: 'gemini-3.8-flash' });
  assert.deepEqual(parseChatCommand('/model list'), { action: '/model', value: 'list' });
  assert.deepEqual(parseChatCommand('/ quit'), { action: '/quit', value: '' });
  assert.equal(parseChatCommand('hello'), null);
});

test('model selection persists configuration, resets defaults and preserves other settings', async () => {
  const config = { model: 'old', plugins: ['developer'] }; let saved;
  const store = { write: async (file, value) => { assert.equal(file, 'config.json'); saved = value; } };
  await selectModel(config, store, 'gemini-3.8-flash');
  assert.equal(config.model, 'gemini-3.8-flash');
  assert.deepEqual(saved, { model: 'gemini-3.8-flash', plugins: ['developer'] });
  await selectModel(config, store, 'default'); assert.equal(config.model, '');
});

test('failed or invalid model selection does not change the current model', async () => {
  const config = { model: 'old' };
  const store = { write: async () => { throw new Error('disk full'); } };
  await assert.rejects(selectModel(config, store, 'new'), /disk full/);
  await assert.rejects(selectModel(config, store, 'invalid model'), /model ID/);
  assert.equal(config.model, 'old');
});
