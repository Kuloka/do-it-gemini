import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installSkillTrees, skillDigest } from '../src/managed-skills.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'managed-skills-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source', 'design');
  await mkdir(source, { recursive: true });
  await writeFile(path.join(source, 'SKILL.md'), 'New design instructions\n');
  const skills = [{ name: 'design', file: path.join(source, 'SKILL.md') }];
  const directories = [path.join(root, 'one'), path.join(root, 'two'), path.join(root, 'three')];
  const target = path.join(directories[0], 'design', 'SKILL.md');
  return { root, source, skills, directories, target };
}

async function place(target, content) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

test('managed updates replace unchanged installed files and preserve unrelated files', async t => {
  const f = await fixture(t);
  await installSkillTrees(f.skills, f.directories);
  await place(path.join(f.directories[0], 'design', 'custom.md'), 'User notes');
  await writeFile(f.skills[0].file, 'Better design instructions\n');
  await installSkillTrees(f.skills, f.directories);
  for (const directory of f.directories) assert.equal(await readFile(path.join(directory, 'design', 'SKILL.md'), 'utf8'), 'Better design instructions\n');
  assert.equal(await readFile(path.join(f.directories[0], 'design', 'custom.md'), 'utf8'), 'User notes');
});

test('identical unmanaged files are adopted without rewriting, including CRLF Markdown', async t => {
  const f = await fixture(t);
  await place(f.target, 'New design instructions\r\n');
  const before = await stat(f.target);
  await installSkillTrees(f.skills, f.directories);
  assert.equal((await stat(f.target)).mtimeMs, before.mtimeMs);
  const receipt = JSON.parse(await readFile(path.join(f.directories[0], '.do-it-gemini-skills.json'), 'utf8'));
  assert.equal(receipt.files['design/SKILL.md'], skillDigest('SKILL.md', Buffer.from('New design instructions\n')));
  const receiptTime = (await stat(path.join(f.directories[0], '.do-it-gemini-skills.json'))).mtimeMs;
  await installSkillTrees(f.skills, f.directories);
  assert.equal((await stat(path.join(f.directories[0], '.do-it-gemini-skills.json'))).mtimeMs, receiptTime);
});

test('trusted previous-release hashes migrate existing old Markdown without a receipt', async t => {
  const f = await fixture(t);
  const old = Buffer.from('Old release instructions\n');
  await place(f.target, 'Old release instructions\r\n');
  await installSkillTrees(f.skills, f.directories, { legacyHashes: { 'design/SKILL.md': skillDigest('SKILL.md', old) } });
  assert.equal(await readFile(f.target, 'utf8'), 'New design instructions\n');
});

test('modified old release content refuses before any root writes', async t => {
  const f = await fixture(t);
  const target = path.join(f.directories[2], 'design', 'SKILL.md');
  await place(target, 'User modified old instructions');
  await assert.rejects(installSkillTrees(f.skills, f.directories, { legacyHashes: { 'design/SKILL.md': skillDigest('SKILL.md', Buffer.from('Old instructions')) } }), /Refusing to overwrite/);
  await assert.rejects(access(f.directories[0]), {code:'ENOENT'});
  assert.deepEqual(await readdir(f.directories[2]), ['design']);
});

test('modified managed content refuses updates to every other root', async t => {
  const f = await fixture(t);
  await installSkillTrees(f.skills, f.directories);
  await writeFile(path.join(f.directories[2], 'design', 'SKILL.md'), 'User edited');
  await writeFile(f.skills[0].file, 'Upgrade');
  await assert.rejects(installSkillTrees(f.skills, f.directories), /Refusing to overwrite/);
  assert.equal(await readFile(f.target, 'utf8'), 'New design instructions\n');
});

test('unrecognized and invalid receipts cannot grant managed update eligibility', async t => {
  const f = await fixture(t);
  await place(f.target, 'Old instructions');
  const receiptPath = path.join(f.directories[0], '.do-it-gemini-skills.json');
  for (const receipt of [
    { version: 2, package: 'do-it-gemini', files: {} },
    { version: 1, package: 'other-pack', files: {} },
    { version: 1, package: 'do-it-gemini', files: { '../design/SKILL.md': 'a'.repeat(64) } },
    { version: 1, package: 'do-it-gemini', files: { 'design/SKILL.md': 'invalid' } },
  ]) {
    await writeFile(receiptPath, JSON.stringify(receipt));
    await assert.rejects(installSkillTrees(f.skills, f.directories), /Invalid managed skill receipt/);
  }
  await writeFile(receiptPath, JSON.stringify({version:1, package:'do-it-gemini', files:{'design/SKILL.md':'a'.repeat(64)}}));
  await assert.rejects(installSkillTrees(f.skills, f.directories), /Refusing to overwrite/);
  await assert.rejects(access(f.directories[1]), {code:'ENOENT'});
});

test('destination directory symlinks are rejected during all-root preflight', async t => {
  const f = await fixture(t);
  await mkdir(f.directories[2]);
  await symlink(f.source, path.join(f.directories[2], 'design'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(installSkillTrees(f.skills, f.directories), /Conflicting skill directory/);
  await assert.rejects(access(f.directories[0]), {code:'ENOENT'});
});

test('a directory occupying a resource file rejects before creating other roots', async t => {
  const f = await fixture(t);
  await mkdir(path.join(f.directories[2], 'design', 'SKILL.md'), {recursive:true});
  await assert.rejects(installSkillTrees(f.skills, f.directories), /Refusing to overwrite/);
  await assert.rejects(access(f.directories[0]), {code:'ENOENT'});
});

test('a receipt directory junction is rejected without following it', async t => {
  const f = await fixture(t);
  await mkdir(f.directories[2]);
  await symlink(f.source, path.join(f.directories[2], '.do-it-gemini-skills.json'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(installSkillTrees(f.skills, f.directories), /Invalid managed skill receipt/);
  await assert.rejects(access(f.directories[0]), {code:'ENOENT'});
});

test('receipts retain unchanged disabled skills for subsequent upgrades', async t => {
  const f = await fixture(t);
  const other = path.join(f.root, 'source', 'plan', 'SKILL.md');
  await place(other, 'Old plan');
  const both = [...f.skills, {name:'plan', file:other}];
  await installSkillTrees(both, f.directories);
  await installSkillTrees(f.skills, f.directories);
  await writeFile(other, 'Updated plan');
  await installSkillTrees(both, f.directories);
  assert.equal(await readFile(path.join(f.directories[0], 'plan', 'SKILL.md'), 'utf8'), 'Updated plan');
});

test('source and destination file symlinks and receipt symlinks are rejected', async t => {
  const f = await fixture(t);
  const external = path.join(f.root, 'external.md');
  await writeFile(external, 'External content');
  const link = path.join(f.source, 'linked.md');
  try { await symlink(external, link, 'file'); }
  catch (error) { if (error.code === 'EPERM') { t.skip('Windows file symlinks require Developer Mode or elevation'); return; } throw error; }
  await assert.rejects(installSkillTrees(f.skills, f.directories), /Symbolic links/);
  await rm(link);
  await mkdir(path.dirname(f.target), { recursive:true });
  await symlink(external, f.target, 'file');
  await assert.rejects(installSkillTrees(f.skills, f.directories), /Refusing to overwrite/);
  await rm(f.target);
  await symlink(external, path.join(f.directories[0], '.do-it-gemini-skills.json'), 'file');
  await assert.rejects(installSkillTrees(f.skills, f.directories), /Invalid managed skill receipt/);
  assert.equal(await readFile(external, 'utf8'), 'External content');
  await assert.rejects(access(f.directories[1]), {code:'ENOENT'});
});

test('binary digests preserve line endings and every byte', () => {
  assert.notEqual(skillDigest('asset.dat', Buffer.from([13,10])), skillDigest('asset.dat', Buffer.from([10])));
});
