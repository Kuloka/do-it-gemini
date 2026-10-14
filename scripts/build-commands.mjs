import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadCatalog } from '../src/catalog.js';
import { root } from '../src/cli.js';
const { skills } = await loadCatalog(root);
const directory = path.join(root, 'commands', 'gmini');
await mkdir(directory, { recursive: true });
for (const skill of skills.values()) {
  const prompt = `Use the ${skill.name} skill for the following request. Activate it with the actual available skill tool, then follow its instructions. User request: {{args}}`;
  await writeFile(path.join(directory, `${skill.name}.toml`), `description = ${JSON.stringify(skill.description)}\nprompt = ${JSON.stringify(prompt)}\n`);
}
console.log(`Built ${skills.size} native Gemini commands.`);
