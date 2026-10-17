import { loadCatalog } from '../src/catalog.js';
import { root } from '../src/cli.js';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const catalog = await loadCatalog(root);
const extension = JSON.parse(await readFile(path.join(root, 'gemini-extension.json'), 'utf8'));
if (!extension.name || !extension.version || extension.contextFileName !== 'GEMINI.md') throw new Error('Invalid extension manifest');
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (manifest.version !== extension.version) throw new Error('Package and extension versions differ');
if (!manifest.files.includes('migrations')) throw new Error('Published package must include trusted migrations');
const provenance = JSON.parse(await readFile(path.join(root, 'skills/catalog.json'), 'utf8'));
if (provenance.length !== catalog.skills.size || new Set(provenance.map(item => item.name)).size !== provenance.length) throw new Error('Provenance catalog is incomplete or duplicated');
for (const item of provenance) {
  if (catalog.skills.get(item.name)?.description !== item.description || !item.source) throw new Error(`Stale provenance: ${item.name}`);
}
async function* files(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symbolic link: ${target}`);
    if (entry.isDirectory()) yield* files(target);
    else yield target;
  }
}
let resources = 0;
for (const skill of catalog.skills.values()) {
  const bundle = await realpath(path.dirname(skill.file));
  for await (const file of files(bundle)) {
    if (!file.endsWith('.md')) continue;
    const prose = (await readFile(file, 'utf8')).replace(/```[\s\S]*?```/g, '');
    for (const match of prose.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)) {
      if (/^(?:https?:|#)/.test(match[1])) continue;
      const target = await realpath(path.resolve(path.dirname(file), decodeURIComponent(match[1])));
      const relative = path.relative(bundle, target);
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`Resource escapes skill bundle: ${file}`);
      resources++;
    }
  }
}
for (const directory of ['bin', 'src', 'scripts', 'tests', 'app-plugins']) for await (const file of files(path.join(root, directory))) {
  if (!/\.(?:js|mjs)$/.test(file)) continue;
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
}
console.log(`OK: ${catalog.skills.size} skills, ${catalog.plugins.size} plugins, ${resources} resource links; provenance, manifests and JavaScript syntax valid.`);
