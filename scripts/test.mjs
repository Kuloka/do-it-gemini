import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const directory = new URL('../tests/', import.meta.url);
const files = (await readdir(directory)).filter(name => name.endsWith('.test.js')).sort().map(name => fileURLToPath(new URL(name, directory)));
if (!files.length) throw new Error('No project tests found');
const result = spawnSync(process.execPath, ['--test', ...files], {stdio:'inherit'});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
