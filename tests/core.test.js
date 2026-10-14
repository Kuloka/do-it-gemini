import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store, safeName } from '../src/store.js';
import { loadCatalog, enabledSkills, buildContext } from '../src/catalog.js';
import { apiReply, cliReply, findGemini, findAgy, agyReply, installAgy, runNode } from '../src/providers.js';
import { parseArgs, installWorkspace, root as projectRoot } from '../src/cli.js';

async function temporary(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'gmini-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

async function fixture(t) {
  const root = await temporary(t);
  await mkdir(path.join(root, 'skills', 'review'), { recursive: true });
  await mkdir(path.join(root, 'skills', 'plan'), { recursive: true });
  await mkdir(path.join(root, 'plugins', 'core'), { recursive: true });
  await mkdir(path.join(root, 'plugins', 'extra'), { recursive: true });
  for (const name of ['review', 'plan']) {
    await writeFile(path.join(root, 'skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: "${name} work"\n---\nInstructions for ${name}.\n`);
  }
  for (const [name, skills] of [['core', ['review']], ['extra', ['review', 'plan']]]) {
    await writeFile(path.join(root, 'plugins', name, 'plugin.json'), JSON.stringify({ name, version: '1.0.0', instructions: `Guidance for ${name}.`, skills }));
  }
  await writeFile(path.join(root, 'GEMINI.md'), 'Base guidance.');
  return root;
}

test('sessions survive reopening the store with complete message history', async t => {
  const root = await temporary(t);
  const store = new Store(root);
  const session = await store.session('work');
  session.messages.push({ role: 'user', text: 'Привет' }, { role: 'assistant', text: 'Hello' });
  await store.saveSession(session);
  const saved = await new Store(root).session('work');
  assert.deepEqual(saved.messages, session.messages);
  assert.equal(saved.createdAt, session.createdAt);
  assert.ok(!Number.isNaN(Date.parse(saved.updatedAt)));
  assert.deepEqual(await readdir(path.join(root, 'sessions')), ['work.json']);
});

test('new sessions are independent and do not appear in the list until saved', async t => {
  const store = new Store(await temporary(t));
  const first = await store.session('first');
  first.messages.push({ role: 'user', text: 'One' });
  assert.deepEqual((await store.session('second')).messages, []);
  assert.deepEqual(await store.sessions(), []);
  await store.saveSession(await store.session('z'));
  await store.saveSession(await store.session('a'));
  await writeFile(path.join(store.root, 'sessions', 'ignored.tmp'), '{}');
  assert.deepEqual(await store.sessions(), ['a', 'z']);
});

test('session names reject traversal and accept the 80 character boundary', async t => {
  const store = new Store(await temporary(t));
  for (const name of ['../outside', '..\\outside', '/absolute', '', 'x'.repeat(81), 'a/b']) {
    assert.throws(() => safeName(name));
    await assert.rejects(store.session(name));
    await assert.rejects(store.saveSession({ name, messages: [] }));
  }
  assert.equal(safeName('x'.repeat(80)), 'x'.repeat(80));
  assert.equal(safeName('chat_1-2'), 'chat_1-2');
});

test('corrupt saved sessions surface an error instead of silently losing history', async t => {
  const store = new Store(await temporary(t));
  await store.init();
  await writeFile(path.join(store.root, 'sessions', 'broken.json'), '{broken');
  await assert.rejects(store.session('broken'), SyntaxError);
});

test('enabled plugins deduplicate shared skills and reject unknown plugins', async t => {
  const catalog = await loadCatalog(await fixture(t));
  assert.deepEqual(enabledSkills(catalog, { plugins: ['core', 'extra'] }).map(s => s.name), ['review', 'plan']);
  assert.deepEqual(enabledSkills(catalog, { plugins: [] }), []);
  assert.throws(() => enabledSkills(catalog, { plugins: ['missing'] }), /missing/);
});

test('catalog rejects a plugin referencing an absent skill', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'plugins', 'core', 'plugin.json'), JSON.stringify({ name: 'core', version: '1', instructions: '', skills: ['missing'] }));
  await assert.rejects(loadCatalog(root), /missing/);
});

test('catalog rejects skill metadata that disagrees with its folder', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'skills', 'review', 'SKILL.md'), '---\nname: other\ndescription: work\n---\nBody');
  await assert.rejects(loadCatalog(root), /review/);
});

test('explicit context loads only selected skill bodies while listing available skills', async t => {
  const root = await fixture(t);
  const catalog = await loadCatalog(root);
  const context = await buildContext(root, catalog, { plugins: ['extra'] }, ['review', 'review']);
  assert.match(context, /Base guidance/);
  assert.match(context, /Guidance for extra/);
  assert.match(context, /plan: plan work/);
  assert.match(context, /Instructions for review/);
  assert.doesNotMatch(context, /Instructions for plan/);
  assert.equal(context.match(/Skill review:/g).length, 1);
  await assert.rejects(buildContext(root, catalog, { plugins: ['core'] }, ['plan']), /plan/);
});

test('automatic context includes enabled skill bodies and excludes disabled packs', async t => {
  const root = await fixture(t);
  const catalog = await loadCatalog(root);
  const context = await buildContext(root, catalog, { plugins: ['core'] });
  assert.match(context, /Instructions for review/);
  assert.doesNotMatch(context, /Instructions for plan|Guidance for extra/);
});

test('API sends instructions and full role-mapped history and omits thought parts', async () => {
  let request;
  const reply = await apiReply({ context: 'Follow skills', apiKey: 'test-secret', model: 'gemini-test', messages: [{ role: 'user', text: 'First' }, { role: 'assistant', text: 'Prior' }, { role: 'user', text: 'Next' }], fetchImpl: async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ thought: true, text: 'Hidden' }, { text: 'Hello ' }, { text: 'world' }] } }] }) };
  } });
  assert.equal(reply, 'Hello world');
  assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['x-goog-api-key'], 'test-secret');
  assert.deepEqual(request.body.contents.map(c => [c.role, c.parts[0].text]), [['user', 'First'], ['model', 'Prior'], ['user', 'Next']]);
  assert.match(request.body.systemInstruction.parts[0].text, /Follow skills/);
  assert.match(request.body.systemInstruction.parts[0].text, /no filesystem/);
  assert.doesNotMatch(JSON.stringify(request.body), /test-secret/);
});

test('API rejects missing credentials and invalid model before sending a request', async () => {
  const fetchImpl = () => assert.fail('Validation must precede the network request');
  await assert.rejects(apiReply({ context: '', messages: [], apiKey: '', fetchImpl }), /GEMINI_API_KEY/);
  await assert.rejects(apiReply({ context: '', messages: [], apiKey: 'test', model: '../model', fetchImpl }));
});

test('API surfaces HTTP status and server error', async () => {
  await assert.rejects(apiReply({ context: '', messages: [], apiKey: 'test', fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'Quota exhausted' } }) }) }), /429: Quota exhausted/);
});

test('API retains the HTTP status when an error response is not JSON', async () => {
  await assert.rejects(apiReply({ context: '', messages: [], apiKey: 'test', fetchImpl: async () => ({ ok: false, status: 502, json: async () => { throw new SyntaxError('Unexpected token <'); } }) }), /502/);
});

test('API surfaces blocked and empty responses instead of saving empty text', async () => {
  for (const [payload, reason] of [[{ promptFeedback: { blockReason: 'SAFETY' } }, 'SAFETY'], [{ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: ' ' }] } }] }, 'STOP'], [{}, 'empty']]) {
    await assert.rejects(apiReply({ context: '', messages: [], apiKey: 'test', fetchImpl: async () => ({ ok: true, json: async () => payload }) }), new RegExp(reason));
  }
});

test('CLI subprocess receives context, conversation, JSON flag and optional model', async t => {
  const cwd = await temporary(t);
  const cliPath = path.join(cwd, 'mock.mjs');
  await writeFile(cliPath, `let input=''; for await (const chunk of process.stdin) input += chunk; console.log(JSON.stringify({response:JSON.stringify({input,args:process.argv.slice(2),cwd:process.cwd()})}));`);
  const result = JSON.parse(await cliReply({ cliPath, cwd, context: 'Use review', model: 'test-model', messages: [{ role: 'user', text: 'Hi' }, { role: 'assistant', text: 'Hello' }, { role: 'user', text: 'Next' }] }));
  assert.match(result.input, /INSTRUCTIONS:\nUse review/);
  assert.match(result.input, /USER:\nHi\n\nASSISTANT:\nHello\n\nUSER:\nNext/);
  assert.deepEqual(result.args.slice(-4), ['--output-format', 'json', '--model', 'test-model']);
  assert.equal(result.cwd, cwd);
});

test('CLI rejects invalid JSON, reported errors and empty responses', async t => {
  const cwd = await temporary(t);
  for (const [name, output, pattern] of [['invalid', 'not json', /JSON/], ['error', JSON.stringify({ error: { message: 'Authentication required' } }), /Authentication required/], ['empty', JSON.stringify({ response: ' ' }), /CLI/]]) {
    const cliPath = path.join(cwd, `${name}.mjs`);
    await writeFile(cliPath, `console.log(${JSON.stringify(output)});`);
    await assert.rejects(cliReply({ cliPath, cwd, context: '', messages: [] }), pattern);
  }
});

test('CLI nonzero exit reports diagnostics', async t => {
  const cwd = await temporary(t);
  const script = path.join(cwd, 'failure.mjs');
  await writeFile(script, "console.error('mock failure'); process.exit(7);");
  await assert.rejects(runNode(script, [], { cwd }), /7.*mock failure/);
});

test('CLI discovery honors the explicit script path without requiring a global install', async t => {
  const root = await temporary(t);
  const script = path.join(root, 'gemini.mjs');
  await writeFile(script, '');
  assert.equal(await findGemini(root, { GMINI_CLI_PATH: script, PATH: '' }), script);
  assert.equal(await findGemini(root, { PATH: '' }), null);
});

test('CLI discovery reads the package bin entry in a custom data directory', async t => {
  const root = await temporary(t);
  const dataRoot = path.join(root, 'custom-data');
  const packageRoot = path.join(dataRoot, 'runtime', 'node_modules', '@google', 'gemini-cli');
  await mkdir(path.join(packageRoot, 'bundle'), { recursive: true });
  const script = path.join(packageRoot, 'bundle', 'gemini.js');
  await writeFile(script, '');
  await writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ bin: { gemini: './bundle/gemini.js' } }));
  assert.equal(await findGemini(root, { PATH: '' }, dataRoot), script);
  assert.equal(await findGemini(root, { PATH: '' }), null);
  await writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ bin: './bundle/gemini.js' }));
  assert.equal(await findGemini(root, { PATH: '' }, dataRoot), script);
});

test('Antigravity discovery finds a user installation and prioritizes an explicit override', async t => {
  const home = await temporary(t);
  const directory = path.join(home, '.gemini', 'bin');
  await mkdir(directory, { recursive: true });
  const installed = path.join(directory, 'agy.exe');
  await writeFile(installed, '');
  const env = { USERPROFILE: home, PATH: '' };
  assert.equal(await findAgy(env), installed);
  const override = path.join(home, 'custom-agy.exe');
  await writeFile(override, '');
  assert.equal(await findAgy({ ...env, GMINI_AGY_PATH: override }), override);
  assert.equal(await findAgy({ ...env, GMINI_AGY_PATH: path.join(home, 'absent.exe') }), installed);
});

test('Antigravity discovery checks local app data and PATH without using the real user home', async t => {
  const home = await temporary(t);
  const appData = path.join(home, 'appdata');
  const directory = path.join(appData, 'agy', 'bin');
  await mkdir(directory, { recursive: true });
  const local = path.join(directory, 'agy.exe');
  await writeFile(local, '');
  assert.equal(await findAgy({ USERPROFILE: home, LOCALAPPDATA: appData, PATH: '' }), local);
  const pathDir = path.join(home, 'path-bin');
  await mkdir(pathDir);
  const executable = path.join(pathDir, process.platform === 'win32' ? 'agy.exe' : 'agy');
  await writeFile(executable, '');
  assert.equal(await findAgy({ USERPROFILE: home, PATH: pathDir }), executable);
  assert.equal(await findAgy({ USERPROFILE: home, PATH: '' }), null);
});

test('Antigravity sends a JSONL user event with full history and reads a nested success result', async () => {
  let invocation;
  const response = await agyReply({ agyPath: 'mock-agy', cwd: 'mock-workspace', timeout: 1234, model: 'mock-model', context: 'Follow review', messages: [{ role: 'user', text: 'First' }, { role: 'assistant', text: 'Prior' }, { role: 'user', text: 'Next' }], runner: async (executable, args, options) => {
    invocation = { executable, args, options };
    return JSON.stringify({ event: 'message', message: { content: 'Partial' } }) + '\r\n' + JSON.stringify({ event: 'result', result: { status: 'SUCCESS', response: 'Complete reply' } }) + '\n';
  } });
  assert.equal(response, 'Complete reply');
  assert.equal(invocation.executable, 'mock-agy');
  assert.deepEqual(invocation.args, ['--input-format', 'stream-json', '--output-format', 'stream-json', '--model', 'mock-model']);
  assert.equal(invocation.options.cwd, 'mock-workspace');
  assert.equal(invocation.options.timeout, 1234);
  assert.ok(invocation.options.input.endsWith('\n'));
  assert.equal(invocation.options.input.trim().split('\n').length, 1);
  const event = JSON.parse(invocation.options.input);
  assert.equal(event.event, 'user');
  assert.match(event.message.content, /INSTRUCTIONS:\nFollow review/);
  assert.match(event.message.content, /USER:\nFirst\n\nASSISTANT:\nPrior\n\nUSER:\nNext/);
});

test('Antigravity surfaces result errors, error events, invalid JSON and empty replies', async () => {
  const cases = [
    [JSON.stringify({ event: 'result', result: { status: 'FAILED', error: 'Quota exhausted' } }), /Quota exhausted/],
    [JSON.stringify({ event: 'result', result: { status: 'FAILED', error: { message: 'Auth required' } } }), /Auth required/],
    [JSON.stringify({ event: 'error', error: { message: 'Stream failure' } }), /Stream failure/],
    ['not JSON', /invalid JSON/],
    [JSON.stringify({ event: 'result', result: { status: 'SUCCESS', response: ' ' } }), /empty response/],
    [JSON.stringify({ event: 'message', message: { content: 'Incomplete' } }), /completed result/],
    [JSON.stringify({ event: 'result', result: { status: 'FAILED' } }), /FAILED/]
  ];
  for (const [output, expected] of cases) {
    await assert.rejects(agyReply({ agyPath: 'mock', context: '', messages: [], runner: async () => output }), expected);
  }
});

test('Antigravity setup downloads the official installer and invokes the saved script without alias or PATH changes', async t => {
  const dataRoot = await temporary(t);
  const script = '# UTF-8 installer: Привет\nWrite-Output "mock"\n';
  let invocation;
  await installAgy(dataRoot, { platform: 'win32', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://antigravity.google/cli/install.ps1');
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, text: async () => script };
  }, runner: async (executable, args, options) => { invocation = { executable, args, options }; } });
  const saved = path.join(dataRoot, 'runtime', 'agy-install.ps1');
  assert.equal(await readFile(saved, 'utf8'), script);
  assert.equal(invocation.executable, 'powershell.exe');
  assert.deepEqual(invocation.args, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', saved, '--skip-aliases', '--skip-path']);
  assert.deepEqual(invocation.options, { cwd: dataRoot, interactive: true });
});

test('Antigravity setup rejects HTTP errors before saving or running an installer', async t => {
  const dataRoot = await temporary(t);
  await assert.rejects(installAgy(dataRoot, { platform: 'win32', fetchImpl: async () => ({ ok: false, status: 503, text: () => assert.fail('Do not read a failed download') }), runner: () => assert.fail('Do not execute a failed download') }), /503/);
  assert.deepEqual(await readdir(dataRoot), []);
});

test('Antigravity setup rejects empty, HTML and oversized downloads without creating files', async t => {
  const dataRoot = await temporary(t);
  for (const script of ['   \n', ' \n<html>error</html>', '#'.repeat(1000001)]) {
    await assert.rejects(installAgy(dataRoot, { platform: 'win32', fetchImpl: async () => ({ ok: true, text: async () => script }), runner: () => assert.fail('Invalid content must never execute') }), /Invalid Antigravity installer/);
    assert.deepEqual(await readdir(dataRoot), []);
  }
});

test('Antigravity setup rejects unsupported platforms before downloading', async t => {
  await assert.rejects(installAgy(await temporary(t), { platform: 'linux', fetchImpl: () => assert.fail('Unsupported platform must not download'), runner: () => assert.fail('Unsupported platform must not execute') }), /https:\/\/antigravity\.google\/docs\/cli\/install\//);
});

test('Antigravity setup propagates an installer process failure', async t => {
  await assert.rejects(installAgy(await temporary(t), { platform: 'win32', fetchImpl: async () => ({ ok: true, text: async () => '# mock installer' }), runner: async () => { throw new Error('Mock installation failed'); } }), /Mock installation failed/);
});

test('ask resumes saved turns and a failed reply leaves the conversation intact', async t => {
  // Copy the CLI into an isolated fixture so neither catalog nor data depends on
  // the real project's evolving skill packs or saved conversations.
  const root = await fixture(t);
  await cp(path.join(projectRoot, 'src'), path.join(root, 'src'), { recursive: true });
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
  const entry = path.join(root, 'entry.mjs');
  await writeFile(entry, "import { main } from './src/cli.js'; try { await main(); } catch (error) { console.error(error.message); process.exitCode = 1; }");
  const cliPath = path.join(root, 'mock.mjs');
  await writeFile(cliPath, `let input=''; for await (const chunk of process.stdin) input+=chunk; if(input.endsWith('FAIL')) console.log(JSON.stringify({error:{message:'Mock rejected request'}})); else console.log(JSON.stringify({response:input.includes('ASSISTANT:')?'Resumed reply':'First reply'}));`);
  const data = path.join(root, 'data');
  const env = { ...process.env, GMINI_CLI_PATH: cliPath, GEMINI_API_KEY: '' };
  const args = ['--data', data, '--workspace', root, '--provider', 'cli', '--session', 'saved'];
  await runNode(entry, ['ask', 'First question', ...args], { cwd: root, env });
  await runNode(entry, ['ask', 'Second question', ...args], { cwd: root, env });
  const sessionFile = path.join(data, 'sessions', 'saved.json');
  const saved = await readFile(sessionFile, 'utf8');
  assert.deepEqual(JSON.parse(saved).messages.map(m => [m.role, m.text]), [['user', 'First question'], ['assistant', 'First reply'], ['user', 'Second question'], ['assistant', 'Resumed reply']]);
  await assert.rejects(runNode(entry, ['ask', 'FAIL', ...args], { cwd: root, env }), /Mock rejected request/);
  assert.equal(await readFile(sessionFile, 'utf8'), saved);
});

test('arguments preserve quoted prompt text and parse supported flags', () => {
  assert.deepEqual(parseArgs(['ask', 'two words', '--session', 'work', '--provider', 'cli', '--help']), { positional: ['ask', 'two words'], flags: { session: 'work', provider: 'cli', help: true } });
  for (const args of [['--unknown'], ['--model'], ['--provider', '--help'], ['--skill=review']]) assert.throws(() => parseArgs(args));
});

test('workspace setup preserves existing context and is repeatable', async t => {
  const fixtureRoot = await fixture(t);
  const catalog = await loadCatalog(fixtureRoot);
  const workspace = await temporary(t);
  await writeFile(path.join(workspace, 'GEMINI.md'), 'Project-specific guidance.\n');
  await installWorkspace(workspace, catalog, { plugins: ['core'] });
  const first = await readFile(path.join(workspace, 'GEMINI.md'), 'utf8');
  await installWorkspace(workspace, catalog, { plugins: ['core'] });
  assert.equal(await readFile(path.join(workspace, 'GEMINI.md'), 'utf8'), first);
  assert.match(first, /^Project-specific guidance\./);
  assert.equal(first.match(/@\.gemini\/do-it-gemini\.md/g).length, 1);
  assert.equal(await readFile(path.join(workspace, '.gemini', 'skills', 'review', 'SKILL.md'), 'utf8'), catalog.skills.get('review').text);
  assert.match(await readFile(path.join(workspace, '.gemini', 'commands', 'gmini', 'review.toml'), 'utf8'), /\{\{args\}\}/);
});

test('workspace setup refuses to overwrite a conflicting user skill', async t => {
  const catalog = await loadCatalog(await fixture(t));
  const workspace = await temporary(t);
  const directory = path.join(workspace, '.gemini', 'skills', 'review');
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, 'SKILL.md');
  await writeFile(target, 'User skill, keep it.');
  const context = path.join(workspace, 'GEMINI.md');
  await writeFile(context, 'Original project context.');
  await assert.rejects(installWorkspace(workspace, catalog, { plugins: ['core'] }), /SKILL\.md/);
  assert.equal(await readFile(target, 'utf8'), 'User skill, keep it.');
  assert.equal(await readFile(context, 'utf8'), 'Original project context.');
  await assert.rejects(readFile(path.join(workspace, '.gemini', 'do-it-gemini.md')), { code: 'ENOENT' });
  await assert.rejects(readFile(path.join(workspace, '.gemini', 'commands', 'gmini', 'review.toml')), { code: 'ENOENT' });
});

test('a conflicting generated context aborts setup before changing any workspace files', async t => {
  const catalog = await loadCatalog(await fixture(t));
  const workspace = await temporary(t);
  await mkdir(path.join(workspace, '.gemini'), { recursive: true });
  const context = path.join(workspace, 'GEMINI.md');
  const generated = path.join(workspace, '.gemini', 'do-it-gemini.md');
  await writeFile(context, 'Keep project guidance.');
  await writeFile(generated, 'Keep edited generated guidance.');
  await assert.rejects(installWorkspace(workspace, catalog, { plugins: ['core'] }), /do-it-gemini\.md/);
  assert.equal(await readFile(context, 'utf8'), 'Keep project guidance.');
  assert.equal(await readFile(generated, 'utf8'), 'Keep edited generated guidance.');
  assert.deepEqual(await readdir(workspace), ['.gemini', 'GEMINI.md']);
  assert.deepEqual(await readdir(path.join(workspace, '.gemini')), ['do-it-gemini.md']);
});

test('workspace setup copies nested skill resources and preserves binary bytes on repeated setup', async t => {
  const fixtureRoot = await fixture(t);
  const resourceRoot = path.join(fixtureRoot, 'skills', 'review', 'references', 'nested');
  await mkdir(resourceRoot, { recursive: true });
  const binary = Buffer.from([0, 255, 254, 128, 10, 13, 42]);
  await writeFile(path.join(resourceRoot, 'asset.bin'), binary);
  await writeFile(path.join(resourceRoot, 'guide.md'), 'Nested reference guidance.');
  const catalog = await loadCatalog(fixtureRoot);
  const workspace = await temporary(t);
  await installWorkspace(workspace, catalog, { plugins: ['core'] });
  await installWorkspace(workspace, catalog, { plugins: ['core'] });
  const copiedRoot = path.join(workspace, '.gemini', 'skills', 'review', 'references', 'nested');
  assert.deepEqual(await readFile(path.join(copiedRoot, 'asset.bin')), binary);
  assert.equal(await readFile(path.join(copiedRoot, 'guide.md'), 'utf8'), 'Nested reference guidance.');
  const agentsRoot = path.join(workspace, '.agents', 'skills', 'review', 'references', 'nested');
  assert.deepEqual(await readFile(path.join(agentsRoot, 'asset.bin')), binary);
  assert.equal(await readFile(path.join(agentsRoot, 'guide.md'), 'utf8'), 'Nested reference guidance.');
});

test('workspace setup refuses to overwrite a conflicting user command', async t => {
  const catalog = await loadCatalog(await fixture(t));
  const workspace = await temporary(t);
  const directory = path.join(workspace, '.gemini', 'commands', 'gmini');
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, 'review.toml');
  await writeFile(target, 'description = "User command"\n');
  await assert.rejects(installWorkspace(workspace, catalog, { plugins: ['core'] }), /review\.toml/);
  assert.equal(await readFile(target, 'utf8'), 'description = "User command"\n');
});
