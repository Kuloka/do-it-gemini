import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { safeName } from './store.js';

export async function loadCatalog(root) {
  const skills = new Map();
  for (const folder of await readdir(path.join(root, 'skills'), { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const file = path.join(root, 'skills', folder.name, 'SKILL.md');
    const text = await readFile(file, 'utf8');
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const name = front?.[1].match(/^name:\s*(.+)$/m)?.[1].trim();
    const description = front?.[1].match(/^description:\s*(.+)$/m)?.[1].trim().replace(/^['"]|['"]$/g, '');
    if (name !== folder.name || !description) throw new Error(`Invalid skill: ${file}`);
    safeName(name);
    skills.set(name, { name, description, text, file });
  }
  const plugins = new Map();
  for (const folder of await readdir(path.join(root, 'plugins'), { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const plugin = JSON.parse(await readFile(path.join(root, 'plugins', folder.name, 'plugin.json'), 'utf8'));
    safeName(plugin.name);
    if (plugin.name !== folder.name || !Array.isArray(plugin.skills) || !plugin.version || typeof plugin.instructions !== 'string') throw new Error(`Invalid plugin: ${folder.name}`);
    for (const name of plugin.skills) if (!skills.has(name)) throw new Error(`Plugin ${plugin.name}: unknown skill ${name}`);
    plugins.set(plugin.name, plugin);
  }
  return { skills, plugins };
}

export function enabledSkills(catalog, config) {
  const names = new Set();
  for (const name of config.plugins) {
    const plugin = catalog.plugins.get(name);
    if (!plugin) throw new Error(`Unknown plugin: ${name}`);
    for (const skill of plugin.skills) names.add(skill);
  }
  return [...names].map(name => catalog.skills.get(name));
}

export async function buildContext(root, catalog, config, selected = []) {
  const available = enabledSkills(catalog, config);
  const allowed = new Map(available.map(skill => [skill.name, skill]));
  const chosen = [...new Set(selected)];
  for (const name of chosen) if (!allowed.has(name)) throw new Error(`Skill ${name} is disabled. Use plugins enable <pack>.`);
  const base = await readFile(path.join(root, 'GEMINI.md'), 'utf8');
  const packs = config.plugins.map(name => catalog.plugins.get(name).instructions).join('\n');
  // Headless/API chats cannot call native activate_skill, so load enabled skills there.
  const loaded = chosen.length ? chosen.map(name => allowed.get(name)) : available;
  return `${base}\n\nPlugin guidance:\n${packs}\n\nAvailable skills:\n${available.map(s => `${s.name}: ${s.description}`).join('\n')}\n\n${loaded.map(s => `Skill ${s.name}:\n${s.text}`).join('\n\n')}\n\nExplicit skills for this turn: ${chosen.join(', ') || 'choose only relevant skills'}`;
}
