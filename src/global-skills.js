import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { enabledSkills } from './catalog.js';
import { safeName } from './store.js';

export async function installGlobalSkills(catalog, config, home = os.homedir()) {
  const homeDirectory = path.resolve(home);
  const directories = [
    path.join(homeDirectory, '.gemini', 'skills'),
    path.join(homeDirectory, '.gemini', 'antigravity-cli', 'skills'),
  ];
  const skills = enabledSkills(catalog, config);
  const plannedDirectories = new Set();
  const files = [];

  async function collect(source, destinations) {
    const info = await lstat(source);
    if (info.isSymbolicLink()) throw new Error(`Symbolic links in skills are not supported: ${source}`);
    if (info.isDirectory()) {
      for (const destination of destinations) plannedDirectories.add(destination);
      for (const entry of await readdir(source)) {
        await collect(path.join(source, entry), destinations.map(destination => path.join(destination, entry)));
      }
    } else if (info.isFile()) {
      const content = await readFile(source);
      for (const target of destinations) files.push({ target, content });
    } else {
      throw new Error(`Only regular skill files and directories are supported: ${source}`);
    }
  }

  for (const skill of skills) {
    const name = safeName(skill.name);
    await collect(path.dirname(skill.file), directories.map(directory => path.join(directory, name)));
  }

  // Validate all destination ancestors and both trees before creating any files.
  const ancestors = new Set();
  for (const directory of plannedDirectories) {
    for (let current = directory; current !== homeDirectory; current = path.dirname(current)) {
      ancestors.add(current);
    }
  }
  for (const directory of ancestors) {
    try {
      const info = await lstat(directory);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`Conflicting skill directory: ${directory}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const missing = [];
  for (const file of files) {
    try {
      const info = await lstat(file.target);
      if (!info.isFile() || info.isSymbolicLink() || !(await readFile(file.target)).equals(file.content)) {
        throw new Error(`Refusing to overwrite existing global skill file: ${file.target}`);
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; missing.push(file); }
  }
  for (const directory of plannedDirectories) await mkdir(directory, { recursive: true });
  for (const file of missing) await writeFile(file.target, file.content, { flag: 'wx' });
  return { directories, skillCount: skills.length };
}
