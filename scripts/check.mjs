import { loadCatalog } from '../src/catalog.js';
import { root } from '../src/cli.js';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const catalog = await loadCatalog(root);
const extension = JSON.parse(await readFile(path.join(root, 'gemini-extension.json'), 'utf8'));
if (!extension.name || !extension.version || extension.contextFileName !== 'GEMINI.md') throw new Error('Invalid extension manifest');
for (const file of ['bin/gmini.js', 'src/cli.js', 'src/store.js', 'src/catalog.js', 'src/providers.js']) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
}
console.log(`OK: ${catalog.skills.size} skills, ${catalog.plugins.size} plugins; manifests and JavaScript syntax valid.`);
