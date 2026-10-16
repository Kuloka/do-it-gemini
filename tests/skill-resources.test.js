import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildContext } from '../src/catalog.js';

async function fixture(t, link) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skill-resources-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bundle = path.join(root, 'skills', 'design');
  await mkdir(path.join(bundle, 'references'), { recursive: true });
  await writeFile(path.join(root, 'GEMINI.md'), 'Base.');
  await writeFile(path.join(bundle, 'references', 'craft.md'), 'RESOURCE_ONLY_VISUAL_GUIDANCE');
  const skill = { name: 'design', description: 'Design work', file: path.join(bundle, 'SKILL.md'), text: `Design [craft](${link}).` };
  const catalog = { skills: new Map([['design', skill]]), plugins: new Map([['design', { skills: ['design'], instructions: '' }]]) };
  return { root, catalog, config: { plugins: ['design'] } };
}

test('explicit skill selection includes bundled Markdown resources for tool-free providers', async t => {
  const f = await fixture(t, 'references/craft.md');
  const context = await buildContext(f.root, f.catalog, f.config, ['design']);
  assert.match(context, /RESOURCE_ONLY_VISUAL_GUIDANCE/);
  assert.match(context, /bundle:/);
  const lazy = await buildContext(f.root, f.catalog, f.config);
  assert.doesNotMatch(lazy, /RESOURCE_ONLY_VISUAL_GUIDANCE/);
});

test('resource references cannot read outside their skill bundle', async t => {
  const f = await fixture(t, '../../private.md');
  await writeFile(path.join(f.root, 'private.md'), 'DO_NOT_INCLUDE');
  await assert.rejects(buildContext(f.root, f.catalog, f.config, ['design']), /leaves its bundle/);
});
