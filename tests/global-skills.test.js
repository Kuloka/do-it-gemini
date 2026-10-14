import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installGlobalSkills } from '../src/global-skills.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'global-skills-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, 'home');
  const source = path.join(root, 'source', 'plan');
  await mkdir(home);
  await mkdir(path.join(source, 'assets'), { recursive: true });
  await mkdir(path.join(source, 'references'));
  await mkdir(path.join(source, 'scripts'));
  await mkdir(path.join(source, 'empty'));
  await writeFile(path.join(source, 'SKILL.md'), '---\nname: plan\ndescription: Plan work\n---\nPlan instructions.\n');
  await writeFile(path.join(source, 'assets', 'binary.dat'), Buffer.from([0, 128, 255, 13, 10]));
  await writeFile(path.join(source, 'references', 'contract.md'), 'Contract');
  await writeFile(path.join(source, 'scripts', 'probe.js'), 'console.log("probe");');
  const catalog = {
    skills: new Map([['plan', { name: 'plan', file: path.join(source, 'SKILL.md') }]]),
    plugins: new Map([['developer', { skills: ['plan'] }], ['shared', { skills: ['plan'] }]]),
  };
  const config = { plugins: ['developer', 'shared'] };
  const directories = [path.join(home, '.gemini', 'skills'), path.join(home, '.gemini', 'antigravity-cli', 'skills')];
  return { home, source, catalog, config, directories };
}

test('global installation copies complete resources into both native roots without changing auth or config', async t => {
  const f = await fixture(t);
  await mkdir(path.join(f.home, '.gemini'));
  const credentials = path.join(f.home, '.gemini', 'oauth_creds.json');
  const globalContext = path.join(f.home, '.gemini', 'GEMINI.md');
  const settings = path.join(f.home, '.gemini', 'settings.json');
  for (const target of [credentials, globalContext, settings]) await writeFile(target, 'Keep unchanged');
  const result = await installGlobalSkills(f.catalog, f.config, f.home);
  assert.deepEqual(result, { directories: f.directories, skillCount: 1 });
  for (const directory of f.directories) {
    for (const relative of ['SKILL.md', 'assets/binary.dat', 'references/contract.md', 'scripts/probe.js']) {
      assert.deepEqual(await readFile(path.join(directory, 'plan', relative)), await readFile(path.join(f.source, relative)));
    }
    assert.deepEqual(await readdir(path.join(directory, 'plan', 'empty')), []);
  }
  for (const target of [credentials, globalContext, settings]) assert.equal(await readFile(target, 'utf8'), 'Keep unchanged');
});

test('matching global installation is idempotent and does not rewrite files', async t => {
  const f = await fixture(t);
  await installGlobalSkills(f.catalog, f.config, f.home);
  const target = path.join(f.directories[0], 'plan', 'SKILL.md');
  const before = await stat(target);
  await installGlobalSkills(f.catalog, f.config, f.home);
  assert.equal((await stat(target)).mtimeMs, before.mtimeMs);
});

test('a conflict in the second tree rejects before any first-tree or resource writes', async t => {
  const f = await fixture(t);
  const target = path.join(f.directories[1], 'plan', 'SKILL.md');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, 'Custom user skill');
  await assert.rejects(installGlobalSkills(f.catalog, f.config, f.home), /Refusing to overwrite/);
  assert.equal(await readFile(target, 'utf8'), 'Custom user skill');
  await assert.rejects(access(f.directories[0]), { code: 'ENOENT' });
  assert.deepEqual(await readdir(path.dirname(target)), ['SKILL.md']);
});

test('destination directory conflicts are detected before writes', async t => {
  const f = await fixture(t);
  await mkdir(path.join(f.home, '.gemini'));
  await writeFile(path.join(f.home, '.gemini', 'antigravity-cli'), 'User file');
  await assert.rejects(installGlobalSkills(f.catalog, f.config, f.home), /Conflicting skill directory/);
  await assert.rejects(access(f.directories[0]), { code: 'ENOENT' });
});

test('source directory symlinks are rejected before either tree is created', async t => {
  const f = await fixture(t);
  await symlink(path.join(f.source, 'references'), path.join(f.source, 'linked-reference'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(installGlobalSkills(f.catalog, f.config, f.home), /Symbolic links/);
  assert.deepEqual(await readdir(f.home), []);
});

test('disabled packs install no global files', async t => {
  const f = await fixture(t);
  const result = await installGlobalSkills(f.catalog, { plugins: [] }, f.home);
  assert.equal(result.skillCount, 0);
  assert.deepEqual(await readdir(f.home), []);
});
