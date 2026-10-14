export function parseChatCommand(line) {
  const match = line.trim().match(/^\/\s*([a-z]+)(?:\s+(.*))?$/i);
  return match ? { action: `/${match[1].toLowerCase()}`, value: (match[2] || '').trim() } : null;
}

export async function selectModel(config, store, value) {
  const model = value.trim() === 'default' ? '' : value.trim();
  if (model && !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$/.test(model)) throw new Error('Enter a model ID from your provider, or default to reset.');
  await store.write('config.json', { ...config, model });
  config.model = model;
  return model;
}
