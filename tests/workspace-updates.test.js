import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installWorkspace, root } from '../src/cli.js';
import { skillDigest } from '../src/managed-skills.js';

// Exact design/SKILL.md from the published 0.1.2 release, before managed receipts.
const oldDesign = `---
name: design
description: Create or refresh a repository design contract from product, UI, and accessibility evidence.
---

# Design

Use when UI/product decisions need a maintained source of truth.
This skill creates a design contract; it does not claim pixel matching or image generation.

## Discover

Read existing design docs, routes, layouts, components, theme files, assets, and tests.
Inspect supplied screenshots only with a real available image-capable tool.
Distinguish observed behavior from an inferred design intention.
Identify missing users/jobs, device targets, brand constraints, and reference assets.
Ask only questions that materially change the design and cannot be answered locally.
Record minor assumptions and unresolved items instead of inventing brand facts.

## Durable contract

Maintain \`data/design/DESIGN.md\` unless the repository already has a canonical \`DESIGN.md\`.
Keep a single source of truth and preserve useful existing content.
Include these sections with concrete decisions or explicit unknowns:

- Status, date, product surfaces, and evidence reviewed.
- Brand personality, trust signals, and styles to avoid.
- Product goals, non-goals, and success signals.
- Personas, user jobs, and contexts of use.
- Information architecture, navigation, and content hierarchy.
- Design principles and their tradeoffs.
- Color, typography, spacing, motion, imagery, and iconography.
- Components, states, variants, and token ownership.
- Accessibility target, semantics, keyboard, focus, contrast, and reduced motion.
- Responsive layout, touch behavior, and target devices.
- Loading, empty, error, success, disabled, and relevant offline states.
- Content voice, terminology, and useful microcopy rules.
- Implementation constraints and verification expectations.
- Open questions, their owners, and consequences.

Avoid generic aesthetic mandates unsupported by the product or references.
Reuse an established component and token system before proposing a replacement.

## Apply and verify

Cite the relevant contract when making a UI decision.
Update conflicting decisions explicitly instead of creating a second design system.
Check that the contract addresses the actual user flows and failure states.
For implementation, validate relevant accessibility and responsive behavior with available tools.
Report visual inspection gaps honestly when browser/screenshot tools are unavailable.
Stop when the contract is actionable and remaining decisions are named.
`;

function generatedCommand(description) {
  return `description = ${JSON.stringify(description)}\nprompt = ${JSON.stringify('Use the design skill for this request. Read .gemini/skills/design/SKILL.md first and follow it. User request: {{args}}')}\n`;
}
const oldDescription = 'Create or refresh a repository design contract from product, UI, and accessibility evidence.';

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'workspace-update-test-'));
  t.after(() => rm(directory, {recursive:true, force:true}));
  const workspace = path.join(directory, 'workspace');
  const source = path.join(directory, 'source', 'design', 'SKILL.md');
  await mkdir(workspace);
  await mkdir(path.dirname(source), {recursive:true});
  await writeFile(source, 'Improved design skill\n');
  const skill = {name:'design', description:'New design direction and visual verification', file:source};
  const catalog = { skills:new Map([['design', skill]]), plugins:new Map([['design-pack', {skills:['design']} ]]) };
  const config = {plugins:['design-pack']};
  const targets = [path.join(workspace, '.gemini', 'skills', 'design', 'SKILL.md'), path.join(workspace, '.agents', 'skills', 'design', 'SKILL.md')];
  const command = path.join(workspace, '.gemini', 'commands', 'gmini', 'design.toml');
  return {directory, workspace, source, skill, catalog, config, targets, command};
}
async function place(target, text) {
  await mkdir(path.dirname(target), {recursive:true});
  await writeFile(target, text);
}

test('workspace upgrades known 0.1.2 design bodies and generated design command together', async t => {
  const f = await fixture(t);
  const migration = JSON.parse(await readFile(path.join(root, 'migrations', '0.1.2-skills.json'), 'utf8'));
  assert.equal(skillDigest('design/SKILL.md', Buffer.from(oldDesign)), migration.files['design/SKILL.md']);
  for (const target of f.targets) await place(target, oldDesign.replace(/\n/g, '\r\n'));
  await place(f.command, generatedCommand(oldDescription));
  await place(path.join(f.workspace, 'GEMINI.md'), 'Project guidance');
  await installWorkspace(f.workspace, f.catalog, f.config);
  for (const target of f.targets) assert.equal(await readFile(target, 'utf8'), 'Improved design skill\n');
  assert.equal(await readFile(f.command, 'utf8'), generatedCommand(f.skill.description));
  assert.equal(await readFile(path.join(f.workspace, 'GEMINI.md'), 'utf8'), 'Project guidance\n\n@.gemini/do-it-gemini.md\n');
  const before = (await stat(f.command)).mtimeMs;
  await installWorkspace(f.workspace, f.catalog, f.config);
  assert.equal((await stat(f.command)).mtimeMs, before);
});

test('workspace managed receipts allow subsequent body upgrades and preserve custom resources', async t => {
  const f = await fixture(t);
  await installWorkspace(f.workspace, f.catalog, f.config);
  await place(path.join(path.dirname(f.targets[0]), 'custom.md'), 'User notes');
  await writeFile(f.source, 'Further design improvements');
  await installWorkspace(f.workspace, f.catalog, f.config);
  for (const target of f.targets) assert.equal(await readFile(target, 'utf8'), 'Further design improvements');
  assert.equal(await readFile(path.join(path.dirname(f.targets[0]), 'custom.md'), 'utf8'), 'User notes');
});

test('a modified legacy skill aborts command upgrades, context imports and every other tree', async t => {
  const f = await fixture(t);
  await place(f.targets[1], oldDesign + '\nUser instructions');
  await place(f.command, generatedCommand(oldDescription));
  await place(path.join(f.workspace, 'GEMINI.md'), 'Keep guidance');
  await assert.rejects(installWorkspace(f.workspace, f.catalog, f.config), /Refusing to overwrite/);
  await assert.rejects(access(f.targets[0]), {code:'ENOENT'});
  await assert.rejects(access(path.join(f.workspace, '.gemini', 'do-it-gemini.md')), {code:'ENOENT'});
  assert.equal(await readFile(f.command, 'utf8'), generatedCommand(oldDescription));
  assert.equal(await readFile(path.join(f.workspace, 'GEMINI.md'), 'utf8'), 'Keep guidance');
});

test('a user-edited command blocks known legacy body upgrades before skill writes', async t => {
  const f = await fixture(t);
  for (const target of f.targets) await place(target, oldDesign);
  await place(f.command, generatedCommand(oldDescription) + '# User customization\n');
  await assert.rejects(installWorkspace(f.workspace, f.catalog, f.config), /Refusing to overwrite existing command/);
  for (const target of f.targets) assert.equal(await readFile(target, 'utf8'), oldDesign);
  await assert.rejects(access(path.join(f.workspace, 'GEMINI.md')), {code:'ENOENT'});
});

test('generated command destination junctions reject before skill or context writes', async t => {
  const f = await fixture(t);
  await mkdir(path.dirname(f.command), {recursive:true});
  await symlink(path.dirname(f.source), f.command, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(installWorkspace(f.workspace, f.catalog, f.config), /Refusing to overwrite existing command/);
  await assert.rejects(access(f.targets[0]), {code:'ENOENT'});
  await assert.rejects(access(path.join(f.workspace, 'GEMINI.md')), {code:'ENOENT'});
});
