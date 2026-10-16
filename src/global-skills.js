import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { enabledSkills } from './catalog.js';
import { installSkillTrees } from './managed-skills.js';

export async function installGlobalSkills(catalog, config, home = os.homedir()) {
  const directories = [
    path.join(home, '.gemini', 'skills'),
    path.join(home, '.gemini', 'antigravity-cli', 'skills'),
    path.join(home, '.gemini', 'config', 'skills'),
  ];
  const migration = JSON.parse(await readFile(new URL('../migrations/0.1.2-skills.json', import.meta.url), 'utf8'));
  return installSkillTrees(enabledSkills(catalog, config), directories, { legacyHashes: migration.files });
}
