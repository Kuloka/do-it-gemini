import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { mkdir, readFile, writeFile, access, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { Store, safeName } from './store.js';
import { loadCatalog, enabledSkills, buildContext } from './catalog.js';
import { installGlobalSkills } from './global-skills.js';
import { parseChatCommand, selectModel } from './chat-commands.js';
import { findGemini, findAgy, installAgy, runNode, runExecutable, npmScript, apiReply, cliReply, agyReply } from './providers.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HELP = `do-it-gemini — skills, plugins and mini chat

gmini                         mini chat (native provider when available, otherwise API)
gmini chat --provider api      chat using GEMINI_API_KEY, without tools
gmini ask "message"              one request with saved history
gmini native                  interactive native CLI with tools
gmini setup [--install-cli]    prepare data and workspace skills
gmini setup --global          install skills for Gemini and Antigravity globally
gmini bootstrap               install a provider, prepare the workspace and open chat
gmini doctor                  check installation
gmini skills                  list enabled skills
gmini plugins                 list plugin packs
gmini plugins enable NAME     enable a pack
gmini plugins disable NAME    disable a pack
gmini sessions                saved chats

Options: --session NAME --model MODEL --provider auto|agy|cli|api
           --data PATH --workspace PATH --skill NAME
In chat: /help /skills /skill NAME /plugins /sessions /session NAME
        /new [NAME] /history /model NAME /exit
Native authentication: gmini native. API key: set GEMINI_API_KEY=...
History and configuration are saved in data; API keys are not stored.`;

export function parseArgs(args) {
  const flags = {}, positional = [];
  const boolean = new Set(['install-cli', 'help', 'global']);
  const values = new Set(['session', 'model', 'provider', 'data', 'workspace', 'skill']);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const name = arg.slice(2);
    if (boolean.has(name)) flags[name] = true;
    else if (values.has(name)) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for --${name}`);
      flags[name] = args[++i];
    } else throw new Error(`Unknown option: ${arg}`);
  }
  return { flags, positional };
}

export async function installWorkspace(workspace, catalog, config) {
  const generated = path.join(workspace, '.gemini', 'do-it-gemini.md');
  const writes = [{ target: generated, content: await readFile(path.join(root, 'GEMINI.md')), label: 'context' }];
  const contextFile = path.join(workspace, 'GEMINI.md');
  let existing = '';
  try { existing = await readFile(contextFile, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Our own root already has context. In other projects preserve the user's context.
  const addImport = path.resolve(workspace) !== root && !existing.includes('@.gemini/do-it-gemini.md');
  async function collect(directory, destination) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const source = path.join(directory, entry.name), target = path.join(destination, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Skill symlinks are not supported: ${source}`);
      if (entry.isDirectory()) await collect(source, target);
      else if (entry.isFile()) writes.push({ target, content: await readFile(source), label: 'skill' });
    }
  }
  for (const skill of enabledSkills(catalog, config)) {
    const directory = path.join(workspace, '.gemini', 'skills', skill.name);
    await collect(path.dirname(skill.file), directory);
    await collect(path.dirname(skill.file), path.join(workspace, '.agents', 'skills', skill.name));
  }
  const commands = path.join(workspace, '.gemini', 'commands', 'gmini');
  for (const skill of enabledSkills(catalog, config)) {
    const command = `description = ${JSON.stringify(skill.description)}\nprompt = ${JSON.stringify(`Use the ${skill.name} skill for this request. Read .gemini/skills/${skill.name}/SKILL.md first and follow it. User request: {{args}}`)}\n`;
    const target = path.join(commands, `${skill.name}.toml`);
    writes.push({ target, content: Buffer.from(command), label: 'command' });
  }
  // Preflight every owned file before adding context imports or copying anything.
  const missing = [];
  for (const item of writes) {
    try {
      if (!(await readFile(item.target)).equals(item.content)) throw new Error(`Refusing to overwrite existing ${item.label}: ${item.target}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; missing.push(item); }
  }
  for (const item of missing) {
    await mkdir(path.dirname(item.target), { recursive: true });
    await writeFile(item.target, item.content, { flag: 'wx' });
  }
  if (addImport) {
    await writeFile(contextFile, `${existing}${existing ? '\n\n' : ''}@.gemini/do-it-gemini.md\n`);
  }
}

export async function main(argv = process.argv.slice(2)) {
  const { flags, positional } = parseArgs(argv);
  const installed = root.split(path.sep).includes('node_modules');
  const command = positional[0] || (installed ? 'bootstrap' : 'chat');
  if (flags.help || command === 'help') { console.log(HELP); return; }
  const persistentHome = process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share');
  const defaultData = installed ? path.join(persistentHome, 'do-it-gemini', 'data') : path.join(root, 'data');
  const store = new Store(flags.data || process.env.GMINI_DATA_DIR || defaultData);
  await store.init();
  const catalog = await loadCatalog(root);
  const config = await store.read('config.json', { version: 1, provider: 'auto', plugins: [...catalog.plugins.keys()], workspace: installed ? path.join(path.dirname(defaultData), 'workspace') : root, model: '' });
  if (flags.workspace) config.workspace = path.resolve(flags.workspace);
  if (flags.model) config.model = flags.model;
  if (flags.provider) config.provider = flags.provider;
  if (!['auto', 'agy', 'cli', 'api'].includes(config.provider)) throw new Error('provider: auto, agy, cli or api');
  const cliPath = await findGemini(root, process.env, store.root);
  let agyPath = await findAgy();
  if (command === 'bootstrap') {
    if (!stdin.isTTY) throw new Error('Run bootstrap in an interactive terminal. Use setup and ask for automation.');
    await installWorkspace(config.workspace, catalog, config);
    await installGlobalSkills(catalog, config);
    await store.write('config.json', config);
    let installedAgy = false;
    if (config.provider !== 'cli' && config.provider !== 'api' && !agyPath && !process.env.GEMINI_API_KEY) {
      console.log('Downloading official Antigravity CLI…');
      await installAgy(store.root);
      agyPath = await findAgy();
      if (!agyPath) throw new Error('Antigravity was installed but agy was not found. Set GMINI_AGY_PATH.');
      installedAgy = true;
    }
    if (config.provider === 'cli' && !cliPath && !process.env.GEMINI_API_KEY) {
      console.log('Downloading official Gemini CLI…');
      await runNode(await npmScript(), ['install', '--prefix', path.join(store.root, 'runtime'), '--no-audit', '--no-fund', '@google/gemini-cli@0.63.0'], { cwd: config.workspace, interactive: true });
    }
    const readyCli = await findGemini(root, process.env, store.root);
    if (installedAgy && !config.onboardingComplete) {
      console.log('Sign in to Antigravity, then enter /quit to open the mini chat.');
      await runExecutable(agyPath, config.model ? ['--model', config.model] : [], { cwd: config.workspace, interactive: true });
      config.onboardingComplete = true;
      await store.write('config.json', config);
    }
    if (config.provider === 'cli' && readyCli && !config.onboardingComplete && !process.env.GEMINI_API_KEY) {
      console.log(`First launch: sign in to Google and trust the workspace. Enter /quit to open mini chat. Data: ${store.root}`);
      await runNode(readyCli, config.model ? ['--model', config.model] : [], { cwd: config.workspace, interactive: true });
      config.onboardingComplete = true;
      await store.write('config.json', config);
    }
    const selectedProvider = config.provider === 'auto' ? (process.env.GEMINI_API_KEY ? 'api' : agyPath ? 'agy' : 'cli') : config.provider;
    await main(['chat', '--data', store.root, '--workspace', config.workspace, '--provider', selectedProvider]);
    return;
  }
  if (command === 'setup') {
    await installWorkspace(config.workspace, catalog, config);
    if (flags.global) {
      const result = await installGlobalSkills(catalog, config);
      console.log(`Installed ${result.skillCount} native skills in:\n${result.directories.join('\n')}`);
    }
    await store.write('config.json', config);
    if (flags['install-cli']) {
      console.log('Installing official Gemini CLI in data/runtime…');
      // Pin a researched version for reproducible setup, without global mutations.
      await runNode(await npmScript(), ['install', '--prefix', path.join(store.root, 'runtime'), '--no-audit', '--no-fund', '@google/gemini-cli@0.63.0'], { cwd: root, interactive: true });
    }
    console.log(`Ready. Data: ${store.root}\nWorkspace: ${config.workspace}\nStart: gmini.cmd\nNative authentication and tools: gmini.cmd native`);
    return;
  }
  if (command === 'doctor') {
    console.log(`Node: ${process.version}\nData: ${store.root}\nSkills: ${catalog.skills.size}\nPlugins: ${catalog.plugins.size}\nAntigravity CLI: ${agyPath || 'not installed'}\nGemini CLI: ${cliPath || 'not installed; gmini setup --install-cli'}\nAPI key: ${process.env.GEMINI_API_KEY ? 'set' : 'not set'}\nWorkspace: ${config.workspace}`);
    if (!agyPath && !cliPath && !process.env.GEMINI_API_KEY) process.exitCode = 1;
    return;
  }
  if (command === 'skills') { for (const skill of enabledSkills(catalog, config)) console.log(`${skill.name.padEnd(24)} ${skill.description}`); return; }
  if (command === 'plugins') {
    const [, action, name] = positional;
    if (action) {
      if (!['enable', 'disable'].includes(action) || !catalog.plugins.has(name)) throw new Error('Use plugins enable|disable NAME');
      config.plugins = action === 'enable' ? [...new Set([...config.plugins, name])] : config.plugins.filter(n => n !== name);
      await store.write('config.json', config);
    }
    for (const plugin of catalog.plugins.values()) console.log(`${config.plugins.includes(plugin.name) ? '[on] ' : '[off]'} ${plugin.name}: ${plugin.description}`);
    console.log('Pack changes affect mini chat. Already installed native skills remain in their workspace folders.');
    return;
  }
  if (command === 'sessions') { console.log((await store.sessions()).join('\n') || 'No saved sessions yet.'); return; }
  if (command === 'native') {
    const nativeAgy = config.provider === 'agy' || (config.provider === 'auto' && agyPath);
    if (!nativeAgy && !cliPath) throw new Error('Run gmini setup --install-cli first');
    if (nativeAgy && !agyPath) throw new Error('Antigravity CLI was not found. Install official agy or set GMINI_AGY_PATH.');
    await installWorkspace(config.workspace, catalog, config);
    const args = config.model ? ['--model', config.model] : [];
    if (nativeAgy) await runExecutable(agyPath, args, { cwd: config.workspace, interactive: true });
    else await runNode(cliPath, args, { cwd: config.workspace, interactive: true });
    return;
  }
  if (!['chat', 'ask'].includes(command)) throw new Error(`Unknown command: ${command}. gmini help`);
  const provider = config.provider === 'auto' ? (agyPath ? 'agy' : cliPath ? 'cli' : 'api') : config.provider;
  if (provider === 'agy' && !agyPath) throw new Error('Antigravity CLI was not found. Install official agy or set GMINI_AGY_PATH.');
  if (provider === 'cli' && !cliPath) throw new Error('Run gmini setup --install-cli first or use --provider api');
  if (provider === 'api' && !process.env.GEMINI_API_KEY) throw new Error('Authentication is unavailable. Use gmini native or set GEMINI_API_KEY.');
  await access(config.workspace);
  let session = await store.session(flags.session || 'default');
  let selected = flags.skill ? [safeName(flags.skill)] : [];
  const answer = async text => {
    const explicit = [...text.matchAll(/(?:^|\s)\$([a-z][a-z0-9-]*)\b/g)].map(match => match[1]);
    const context = await buildContext(root, catalog, config, [...selected, ...explicit]);
    const user = { role: 'user', text, at: new Date().toISOString() };
    const messages = [...session.messages, user];
    console.log('Thinking…');
    const reply = provider === 'api'
      ? await apiReply({ context, messages, model: config.model || 'gemini-3.8-flash' })
      : provider === 'agy' ? await agyReply({ agyPath, cwd: config.workspace, context, messages, model: config.model })
      : await cliReply({ cliPath, cwd: config.workspace, context, messages, model: config.model });
    // Commit a complete turn only; failed requests cannot corrupt subsequent roles.
    const completed = { ...session, messages: [...messages, { role: 'assistant', text: reply, at: new Date().toISOString() }] };
    await store.saveSession(completed);
    session = completed;
    console.log(`\n${reply}\n`);
  };
  if (command === 'ask') {
    const text = positional.slice(1).join(' ');
    if (!text) throw new Error('Provide a message: gmini ask "Hello"');
    await answer(text); return;
  }
  if (!stdin.isTTY) throw new Error('Mini chat requires an interactive terminal; use gmini ask "message" in scripts.');
  console.log(`do-it-gemini | ${provider} | ${config.model || 'default model'} | session ${session.name}\n/help — commands; /model — choose a model; /exit — quit. History: ${store.root}`);
  if (provider === 'api') console.log('API mode has no file or shell tools. Use gmini native for interactive coding.');
  const rl = createInterface({ input: stdin, output: stdout });
  let closed = false;
  rl.on('close', () => { closed = true; });
  try {
    while (!closed) {
      let line;
      try { line = (await rl.question('you > ')).trim(); } catch (error) { if (closed) break; throw error; }
      if (!line) continue;
      try {
        if (!line.startsWith('/')) { await answer(line); continue; }
        const parsed = parseChatCommand(line);
        if (!parsed) { console.log('Unknown command. Use /help.'); continue; }
        const { action, value } = parsed;
        if (action === '/exit' || action === '/quit') break;
        switch (action) {
          case '/help': console.log(HELP); break;
          case '/skills': console.log(enabledSkills(catalog, config).map(s => `${s.name}: ${s.description}`).join('\n')); break;
          case '/skill':
            if (!value || value === 'auto') selected = [];
            else { await buildContext(root, catalog, config, [value]); selected = [value]; }
            console.log(`Skill: ${selected.join(', ') || 'automatic selection'}`); break;
          case '/plugins': console.log(config.plugins.join(', ') || 'All disabled'); break;
          case '/sessions': console.log((await store.sessions()).join('\n')); break;
          case '/session': if (!value) throw new Error('/session NAME'); session = await store.session(value); console.log(`Session ${session.name}`); break;
          case '/new': {
            const candidate = await store.session(value || `chat-${Date.now()}`);
            if (candidate.messages.length) throw new Error('This name is already in use; choose another.');
            await store.saveSession(candidate); session = candidate;
            console.log(`Session ${session.name}`); break;
          }
          case '/history': for (const m of session.messages) console.log(`${m.role}: ${m.text}\n`); break;
          case '/model': {
            let choice = value;
            if (!choice || choice === 'list') {
              console.log(`Current model: ${config.model || 'provider default'}`);
              if (provider === 'agy') {
                try { console.log(await runExecutable(agyPath, ['models'], { cwd: config.workspace, timeout: 30000 })); }
                catch (error) { console.error(`Model list unavailable: ${error.message}`); }
              }
              if (choice === 'list') break;
              choice = (await rl.question('Model ID (Enter to keep, default to reset): ')).trim();
              if (!choice) break;
            }
            const model = await selectModel(config, store, choice);
            console.log(`Model: ${model || 'provider default'}`); break;
          }
          default: console.log('Unknown command. Use /help.');
        }
      } catch (error) { console.error(`Error: ${error.message}`); }
    }
  } finally { rl.close(); }
}
