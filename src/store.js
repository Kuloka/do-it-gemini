import { mkdir, readFile, writeFile, rename, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function safeName(name) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(name)) throw new Error('Names must contain only letters, digits, _ and - (up to 80 characters).');
  return name;
}

export class Store {
  constructor(root) { this.root = path.resolve(root); }
  async init() { await mkdir(path.join(this.root, 'sessions'), { recursive: true }); }
  async read(relative, fallback) {
    try { return JSON.parse(await readFile(path.join(this.root, relative), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
  }
  async write(relative, value) {
    const target = path.join(this.root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    const temp = `${target}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
    await rename(temp, target);
  }
  async session(name) {
    return this.read(`sessions/${safeName(name)}.json`, { version: 1, name, messages: [], createdAt: new Date().toISOString() });
  }
  async saveSession(session) {
    await this.write(`sessions/${safeName(session.name)}.json`, { ...session, updatedAt: new Date().toISOString() });
  }
  async sessions() {
    await this.init();
    return (await readdir(path.join(this.root, 'sessions'))).filter(n => n.endsWith('.json')).map(n => n.slice(0, -5)).sort();
  }
}
