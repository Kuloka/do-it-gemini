import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { safeName } from './store.js';

const receiptName = '.do-it-gemini-skills.json';

// Normalize Markdown line endings only; binary resources remain byte-exact.
export function skillDigest(relative, content) {
  const bytes = relative.toLowerCase().endsWith('.md') ? Buffer.from(content.toString('utf8').replace(/\r\n/g, '\n')) : content;
  return createHash('sha256').update(bytes).digest('hex');
}

async function inspect(target) {
  try { return await lstat(target); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function checkAncestors(directory) {
  for (let current = path.resolve(directory); ; current = path.dirname(current)) {
    const info = await inspect(current);
    if (info && (!info.isDirectory() || info.isSymbolicLink())) throw new Error(`Conflicting skill directory: ${current}`);
    if (path.dirname(current) === current) break;
  }
}

function validHashes(files) {
  return files && typeof files === 'object' && !Array.isArray(files) && Object.entries(files).every(([relative, hash]) => {
    const parts = relative.split('/');
    return parts.length > 1 && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(parts[0]) &&
      parts.every(part => part && part !== '.' && part !== '..' && !/[\\:]/.test(part)) &&
      typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash);
  });
}

export async function installSkillTrees(skills, directories, { legacyHashes = {} } = {}) {
  if (!validHashes(legacyHashes)) throw new Error('Invalid bundled skill migration hashes');
  skills = [...skills];
  directories = [...new Set(directories.map(directory => path.resolve(directory)))];
  const resources = [];
  const folders = [];
  async function collect(source, relative) {
    const info = await lstat(source);
    if (info.isSymbolicLink()) throw new Error(`Symbolic links in skills are not supported: ${source}`);
    if (info.isDirectory()) {
      folders.push(relative);
      for (const entry of await readdir(source)) await collect(path.join(source, entry), `${relative}/${entry}`);
    } else if (info.isFile()) {
      const content = await readFile(source);
      resources.push({ relative, content, digest: skillDigest(relative, content) });
    } else throw new Error(`Only regular skill files and directories are supported: ${source}`);
  }
  for (const skill of skills) {
    const source = path.dirname(skill.file);
    await checkAncestors(path.dirname(source));
    await collect(source, safeName(skill.name));
  }
  if (!skills.length) return { directories, skillCount: 0 };

  const plans = [];
  // Preflight every root and file before creating any destination directory.
  for (const directory of directories) {
    await checkAncestors(directory);
    for (const folder of folders) await checkAncestors(path.join(directory, folder));
    const receiptFile = path.join(directory, receiptName);
    const info = await inspect(receiptFile);
    let previous = {};
    let previousReceipt;
    if (info) {
      if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Invalid managed skill receipt: ${receiptFile}`);
      previousReceipt = await readFile(receiptFile, 'utf8');
      let receipt;
      try { receipt = JSON.parse(previousReceipt); } catch { throw new Error(`Invalid managed skill receipt: ${receiptFile}`); }
      if (receipt?.version !== 1 || receipt?.package !== 'do-it-gemini' || !validHashes(receipt.files)) throw new Error(`Invalid managed skill receipt: ${receiptFile}`);
      previous = receipt.files;
    }
    const writes = [];
    // Keep receipts for disabled skills, which may be enabled again on a later run.
    const hashes = { ...previous };
    for (const resource of resources) {
      const target = path.join(directory, resource.relative);
      const existing = await inspect(target);
      hashes[resource.relative] = resource.digest;
      if (!existing) { writes.push({ ...resource, target, before: null }); continue; }
      if (!existing.isFile() || existing.isSymbolicLink()) throw new Error(`Refusing to overwrite existing global skill file: ${target}`);
      const digest = skillDigest(resource.relative, await readFile(target));
      if (digest === resource.digest) continue;
      // Receipts verify expected content, never authorize overwriting user edits.
      if (digest !== previous[resource.relative] && digest !== legacyHashes[resource.relative]) throw new Error(`Refusing to overwrite existing global skill file: ${target}`);
      writes.push({ ...resource, target, before: digest });
    }
    const receipt = JSON.stringify({ version: 1, package: 'do-it-gemini', files: hashes }, null, 2) + '\n';
    plans.push({ directory, writes, receiptFile, receipt, previousReceipt });
  }
  for (const plan of plans) {
    for (const folder of folders) await mkdir(path.join(plan.directory, folder), { recursive: true });
    for (const file of plan.writes) {
      await checkAncestors(path.dirname(file.target));
      if (file.before === null) await writeFile(file.target, file.content, { flag: 'wx' });
      else {
        const info = await inspect(file.target);
        if (!info?.isFile() || info.isSymbolicLink() || skillDigest(file.relative, await readFile(file.target)) !== file.before) throw new Error(`Skill file changed during installation: ${file.target}`);
        await writeFile(file.target, file.content);
      }
    }
    if (plan.receipt !== plan.previousReceipt) {
      await checkAncestors(plan.directory);
      if (plan.previousReceipt !== undefined) {
        const info = await inspect(plan.receiptFile);
        if (!info?.isFile() || info.isSymbolicLink() || await readFile(plan.receiptFile, 'utf8') !== plan.previousReceipt) throw new Error(`Managed skill receipt changed during installation: ${plan.receiptFile}`);
      }
      await writeFile(plan.receiptFile, plan.receipt, { flag: plan.previousReceipt === undefined ? 'wx' : 'w' });
    }
  }
  return { directories, skillCount: skills.length };
}
