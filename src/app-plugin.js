import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installSkillTrees } from './managed-skills.js';

export async function installAppPlugin(home = os.homedir()) {
  const directory = path.join(home, '.gemini', 'config', 'plugins');
  const file = fileURLToPath(new URL('../app-plugins/usage-meter/plugin.json', import.meta.url));
  await installSkillTrees([{name: 'do-it-gemini-usage', file}], [directory]);
  return path.join(directory, 'do-it-gemini-usage');
}
