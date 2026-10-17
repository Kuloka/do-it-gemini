const emptyMetrics = () => ({ contextPercent: null, estimated: false, limitRemainingPercent: null });

function count(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function usageTokens(usage) {
  if (!usage || typeof usage !== 'object') return null;
  const fields = ['inputTokens', 'cacheReadTokens', 'outputTokens'];
  if (!fields.some(key => Object.hasOwn(usage, key))) return null;
  let total = 0;
  for (const key of fields) {
    const value = Object.hasOwn(usage, key) ? count(usage[key]) : 0;
    if (value === null) return null;
    total += value;
  }
  return Number.isFinite(total) ? total : null;
}

/** Extract context occupancy using only metadata supplied by the application. */
export function extractContext(chatModel) {
  const window = chatModel?.chatStartMetadata?.contextWindowMetadata;
  const maximum = count(window?.maxContextTokens);
  if (maximum === null || maximum === 0) return { contextPercent: null, estimated: false };
  const retries = Array.isArray(chatModel?.retryInfos) ? chatModel.retryInfos : [];
  const latestUsage = retries.findLast(retry => retry?.usage != null)?.usage ?? chatModel?.usage;
  let used = usageTokens(latestUsage);
  let estimated = false;
  if (used === null) {
    used = count(window?.estimatedTokensUsed);
    estimated = used !== null;
  }
  return {
    contextPercent: used === null ? null : Math.min(100, used / maximum * 100),
    estimated,
  };
}

function modelName(value) {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** Reduce user status immediately; account and unrelated configuration are discarded. */
export function extractQuotas(response) {
  const result = new Map();
  const configs = response?.userStatus?.cascadeModelConfigData?.clientModelConfigs;
  if (!Array.isArray(configs)) return result;
  for (const config of configs) {
    const model = modelName(config?.modelOrAlias?.model);
    if (!model) continue;
    const remaining = count(config?.quotaInfo?.remainingFraction);
    const percent = remaining !== null && remaining <= 1 ? remaining * 100 : null;
    if (result.has(model) && result.get(model) !== percent) result.set(model, null);
    else if (!result.has(model)) result.set(model, percent);
  }
  return result;
}

/** Create a bounded incremental reader. The transport owns authorization and timeouts. */
export function createUsageReader({ rpc, now = Date.now, quotaTtlMs = 60_000 }) {
  if (typeof rpc !== 'function') throw new TypeError('rpc must be a function');
  const conversations = new Map();
  let quotaCache = null;
  let quotaUpdatedAt = 0;

  return async function readUsage(cascadeId) {
    if (typeof cascadeId !== 'string' || !cascadeId.trim()) return emptyMetrics();
    let state = conversations.get(cascadeId);
    if (!state) state = { offset: 0, chatOffset: -1, model: null, contextPercent: null, estimated: false };
    conversations.delete(cascadeId);
    conversations.set(cascadeId, state);
    if (conversations.size > 16) conversations.delete(conversations.keys().next().value);

    let operation = 'GetCascadeTrajectoryGeneratorMetadata';
    try {
      // Streaming generators update their latest record in place before adding another.
      const requestOffset = Math.max(0, state.offset - 1);
      const response = await rpc('GetCascadeTrajectoryGeneratorMetadata', {
        cascadeId,
        generatorMetadataOffset: requestOffset,
        includeMessages: false,
      });
      if (!response || typeof response !== 'object') throw new Error('Invalid generator response');
      const entries = response?.generatorMetadata;
      if (entries !== undefined && !Array.isArray(entries)) throw new Error('Invalid generator metadata');
      for (const [index, entry] of (entries ?? []).entries()) {
        const entryOffset = requestOffset + index;
        if (entryOffset >= state.chatOffset && entry && Object.hasOwn(entry, 'chatModel')) {
          state.chatOffset = entryOffset;
          state.model = modelName(entry.chatModel?.model);
          Object.assign(state, extractContext(entry.chatModel));
        }
      }
      state.offset = Math.max(state.offset, requestOffset + (entries?.length ?? 0));

      if (quotaCache === null || now() - quotaUpdatedAt >= quotaTtlMs) {
        operation = 'GetUserStatus';
        quotaCache = extractQuotas(await rpc('GetUserStatus', {}));
        quotaUpdatedAt = now();
      }
      return {
        contextPercent: state.contextPercent,
        estimated: state.estimated,
        limitRemainingPercent: state.model ? quotaCache.get(state.model) ?? null : null,
      };
    } catch (cause) {
      // A failed poll must never present a previously successful reading as current.
      Object.assign(state, { offset: 0, chatOffset: -1, model: null, contextPercent: null, estimated: false });
      quotaCache = null;
      const error = new Error('App usage unavailable');
      error.operation = operation;
      if (Number.isInteger(cause?.status) && cause.status >= 100 && cause.status <= 599) error.status = cause.status;
      throw error;
    }
  };
}
