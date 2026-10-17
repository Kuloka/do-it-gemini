import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsageReader, extractContext, extractQuotas } from '../app-plugins/usage-meter/sidecars/meter/metrics.mjs';

const context = (usage, extra = {}) => ({
  model: 'MODEL_A', usage,
  chatStartMetadata: { contextWindowMetadata: { maxContextTokens: '1000' } },
  ...extra,
});
const status = configs => ({ userStatus: { cascadeModelConfigData: { clientModelConfigs: configs } } });
const quota = (model, remainingFraction) => ({ modelOrAlias: { model }, quotaInfo: { remainingFraction } });
const empty = { contextPercent: null, estimated: false, limitRemainingPercent: null };

test('context counts cache reads and output, using latest retry instead of initial usage', () => {
  assert.deepEqual(extractContext(context({ inputTokens: '900' }, {
    retryInfos: [ { usage: { inputTokens: '100' } }, { usage: { inputTokens: '100', cacheReadTokens: '200', outputTokens: '50' } } ],
  })), { contextPercent: 35, estimated: false });
  assert.equal(extractContext(context({ inputTokens: '2000' })).contextPercent, 100);
});

test('zero tokens are valid; absent protobuf counters may be zero', () => {
  assert.deepEqual(extractContext(context({ inputTokens: '0' })), { contextPercent: 0, estimated: false });
  assert.equal(extractContext(context({ cacheReadTokens: '300' })).contextPercent, 30);
});

test('retry entries without usage do not hide the last retry usage or base usage', () => {
  assert.deepEqual(extractContext(context({ inputTokens: '900' }, {
    retryInfos: [{ usage: { inputTokens: '200' } }, { retryReason: 'pending' }],
  })), { contextPercent: 20, estimated: false });
  assert.deepEqual(extractContext(context({ inputTokens: '100' }, {
    retryInfos: [{ retryReason: 'pending' }],
  })), { contextPercent: 10, estimated: false });
});

test('missing or malformed usage falls back only to explicit estimated context', () => {
  const metadata = { contextWindowMetadata: { maxContextTokens: '1000', estimatedTokensUsed: '250' } };
  for (const usage of [undefined, {}, { inputTokens: 'oops' }, { inputTokens: '-1' }, { inputTokens: Infinity }, { inputTokens: '' }, { inputTokens: '0xff' }]) {
    assert.deepEqual(extractContext(context(usage, { chatStartMetadata: metadata })), { contextPercent: 25, estimated: true });
  }
  assert.deepEqual(extractContext(context({ inputTokens: '100' }, { retryInfos: [{ usage: {} }] })), { contextPercent: null, estimated: false });
});

test('context never guesses maximum and rejects invalid denominators', () => {
  for (const maxContextTokens of [undefined, '', '0', '-1', 'NaN', true]) {
    assert.deepEqual(extractContext(context({ inputTokens: '100' }, {
      chatStartMetadata: { contextWindowMetadata: { maxContextTokens } },
    })), { contextPercent: null, estimated: false });
  }
});

test('quota preserves zero and rejects absent, invalid and ambiguous fractions', () => {
  const quotas = extractQuotas(status([
    quota('ZERO', 0), quota('HALF', '0.5'), quota('MISSING', undefined), quota('INVALID', 2),
    quota('NEGATIVE', -1), quota('EMPTY', ''), quota('DUP', 0.3), quota('DUP', 0.4), quota('DUP', 0.3),
  ]));
  assert.equal(quotas.get('ZERO'), 0);
  assert.equal(quotas.get('HALF'), 50);
  for (const model of ['MISSING', 'INVALID', 'NEGATIVE', 'EMPTY', 'DUP']) assert.equal(quotas.get(model), null);
});

test('reader advances offset, retains sanitized state on empty increments and caches quotas', async () => {
  const calls = [];
  let poll = 0;
  const readUsage = createUsageReader({ rpc: async (method, body) => {
    calls.push({ method, body });
    if (method === 'GetUserStatus') return status([quota('MODEL_A', 0), quota('OTHER', 1)]);
    poll++;
    return { generatorMetadata: poll === 1 ? [{ chatModel: context({ inputTokens: '100' }) }, { unrelated: true }] : [] };
  } });
  assert.deepEqual(await readUsage('one'), { contextPercent: 10, estimated: false, limitRemainingPercent: 0 });
  assert.deepEqual(await readUsage('one'), { contextPercent: 10, estimated: false, limitRemainingPercent: 0 });
  assert.deepEqual(calls, [
    { method: 'GetCascadeTrajectoryGeneratorMetadata', body: { cascadeId: 'one', generatorMetadataOffset: 0, includeMessages: false } },
    { method: 'GetUserStatus', body: {} },
    { method: 'GetCascadeTrajectoryGeneratorMetadata', body: { cascadeId: 'one', generatorMetadataOffset: 1, includeMessages: false } },
  ]);
});

test('streaming refresh rereads latest record as estimate evolves to actual usage', async () => {
  let poll = 0;
  const offsets = [];
  const readUsage = createUsageReader({ rpc: async (method, body) => {
    if (method === 'GetUserStatus') return status([quota('MODEL_A', 0.5)]);
    offsets.push(body.generatorMetadataOffset);
    poll++;
    if (poll === 1) return { generatorMetadata: [
      { chatModel: context({ inputTokens: '800' }) },
      { chatModel: context(undefined, { chatStartMetadata: { contextWindowMetadata: { maxContextTokens: '1000', estimatedTokensUsed: '300' } } }) },
    ] };
    if (poll === 2) return { generatorMetadata: [{ chatModel: context({ inputTokens: '400', outputTokens: '20' }) }] };
    return { generatorMetadata: [] };
  } });
  assert.deepEqual(await readUsage('one'), { contextPercent: 30, estimated: true, limitRemainingPercent: 50 });
  assert.deepEqual(await readUsage('one'), { contextPercent: 42, estimated: false, limitRemainingPercent: 50 });
  assert.deepEqual(await readUsage('one'), { contextPercent: 42, estimated: false, limitRemainingPercent: 50 });
  assert.deepEqual(await readUsage('one'), { contextPercent: 42, estimated: false, limitRemainingPercent: 50 });
  assert.deepEqual(offsets, [0, 1, 1, 1]);
});

test('newer invocation with unavailable usage does not resurrect old successful context', async () => {
  const readUsage = createUsageReader({ rpc: async method => method === 'GetUserStatus'
    ? status([quota('MODEL_A', 0.5), quota('MODEL_B', 0.8)])
    : { generatorMetadata: [ { chatModel: context({ inputTokens: '900' }) }, { chatModel: { model: 'MODEL_B' } } ] },
  });
  assert.deepEqual(await readUsage('one'), { contextPercent: null, estimated: false, limitRemainingPercent: 80 });
});

test('quota requires exact invocation model, never response model or arbitrary bucket', async () => {
  const readUsage = createUsageReader({ rpc: async method => method === 'GetUserStatus'
    ? status([quota('MODEL_A', 0.5)])
    : { generatorMetadata: [{ chatModel: { ...context({ inputTokens: '100' }), model: 'MODEL_B', responseModel: 'MODEL_A' } }] },
  });
  assert.deepEqual(await readUsage('one'), { contextPercent: 10, estimated: false, limitRemainingPercent: null });
});

test('quota refresh uses TTL and isolates conversation state', async () => {
  let time = 0;
  let quotaReads = 0;
  const readUsage = createUsageReader({ now: () => time, rpc: async (method, body) => {
    if (method === 'GetUserStatus') { quotaReads++; return status([quota('MODEL_A', 0.25)]); }
    return { generatorMetadata: body.cascadeId === 'one' ? [{ chatModel: context({ inputTokens: '100' }) }] : [] };
  } });
  await readUsage('one');
  assert.deepEqual(await readUsage('two'), empty);
  time = 59_999;
  await readUsage('one');
  assert.equal(quotaReads, 1);
  time = 60_000;
  await readUsage('one');
  assert.equal(quotaReads, 2);
});

test('failures clear readings and recovery rereads current history', async () => {
  let step = 0;
  const offsets = [];
  const readUsage = createUsageReader({ rpc: async (method, body) => {
    if (method === 'GetUserStatus') return status([quota('MODEL_A', 0.5)]);
    offsets.push(body.generatorMetadataOffset);
    step++;
    if (step === 2) throw new Error('offline');
    return { generatorMetadata: step === 1 ? [{ chatModel: context({ inputTokens: '100' }) }] : [] };
  } });
  assert.equal((await readUsage('one')).contextPercent, 10);
  await assert.rejects(readUsage('one'), { message: 'App usage unavailable', operation: 'GetCascadeTrajectoryGeneratorMetadata' });
  assert.deepEqual(await readUsage('one'), empty);
  assert.deepEqual(offsets, [0, 0, 0]);
});

test('errors expose only sanitized operation and valid status, never private failure details', async () => {
  for (const statusCode of [503, 99, 600, '401']) {
    const original = Object.assign(new Error('private token and prompt'), { status: statusCode, body: 'private account data' });
    const readUsage = createUsageReader({ rpc: async method => {
      if (method === 'GetCascadeTrajectoryGeneratorMetadata') return { generatorMetadata: [] };
      throw original;
    } });
    await assert.rejects(readUsage('one'), error => {
      assert.equal(error.message, 'App usage unavailable');
      assert.equal(error.operation, 'GetUserStatus');
      assert.equal(error.status, statusCode === 503 ? 503 : undefined);
      assert.equal(error.cause, undefined);
      assert.equal(error.body, undefined);
      assert.doesNotMatch(String(error) + JSON.stringify(error), /private|token|prompt/);
      return true;
    });
  }
});

test('reader bounds conversation cache at sixteen and rejects empty ids', async () => {
  const offsets = [];
  const readUsage = createUsageReader({ rpc: async (method, body) => {
    if (method === 'GetUserStatus') return status([]);
    offsets.push(body.generatorMetadataOffset);
    return { generatorMetadata: [{ chatModel: context({ inputTokens: '0' }) }] };
  } });
  assert.deepEqual(await readUsage(''), empty);
  for (let i = 0; i < 17; i++) await readUsage(String(i));
  await readUsage('0');
  assert.equal(offsets.at(-1), 0);
});
