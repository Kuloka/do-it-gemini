import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { mkdir, readFile, writeFile, access, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { Store, safeName } from './store.js';
import { loadCatalog, enabledSkills, buildContext } from './catalog.js';
import { findGemini, findAgy, installAgy, runNode, runExecutable, npmScript, apiReply, cliReply, agyReply } from './providers.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HELP = `do-it-gemini — навыки, плагины и мини-чат

gmini                         мини-чат (CLI при наличии, иначе API)
gmini chat --provider api      чат через GEMINI_API_KEY, без инструментов
gmini ask "текст"              один запрос с сохранением истории
gmini native                  полноценный Gemini CLI с инструментами
gmini setup [--install-cli]    подготовить data и локальную CLI
gmini bootstrap               скачать CLI, подготовить проект и открыть чат
gmini doctor                  проверить установку
gmini skills                  список навыков
gmini plugins                 список плагинов
gmini plugins enable NAME     включить пакет
gmini plugins disable NAME    выключить пакет
gmini sessions                сохранённые чаты

Параметры: --session NAME --model MODEL --provider auto|agy|cli|api
           --data PATH --workspace PATH --skill NAME
В чате: /help /skills /skill NAME /plugins /sessions /session NAME
        /new [NAME] /history /model NAME /exit
CLI-авторизация: gmini native. API-ключ: set GEMINI_API_KEY=...
История и конфигурация сохраняются в data; ключ не сохраняется.`;

export function parseArgs(args) {
  const flags = {}, positional = [];
  const boolean = new Set(['install-cli', 'help']);
  const values = new Set(['session', 'model', 'provider', 'data', 'workspace', 'skill']);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const name = arg.slice(2);
    if (boolean.has(name)) flags[name] = true;
    else if (values.has(name)) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Нужно значение --${name}`);
      flags[name] = args[++i];
    } else throw new Error(`Неизвестный параметр: ${arg}`);
  }
  return { flags, positional };
}

export async function installWorkspace(workspace, catalog, config) {
  const generated = path.join(workspace, '.gemini', 'do-it-gemini.md');
  const writes = [{ target: generated, content: await readFile(path.join(root, 'GEMINI.md')), label: 'контекст' }];
  const contextFile = path.join(workspace, 'GEMINI.md');
  let existing = '';
  try { existing = await readFile(contextFile, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Our own root already has context. In other projects preserve the user's context.
  const addImport = path.resolve(workspace) !== root && !existing.includes('@.gemini/do-it-gemini.md');
  async function collect(directory, destination) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const source = path.join(directory, entry.name), target = path.join(destination, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Символьные ссылки в навыке не поддерживаются: ${source}`);
      if (entry.isDirectory()) await collect(source, target);
      else if (entry.isFile()) writes.push({ target, content: await readFile(source), label: 'навык' });
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
    writes.push({ target, content: Buffer.from(command), label: 'команду' });
  }
  // Preflight every owned file before adding context imports or copying anything.
  const missing = [];
  for (const item of writes) {
    try {
      if (!(await readFile(item.target)).equals(item.content)) throw new Error(`Не перезаписываю существующий ${item.label}: ${item.target}`);
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
  if (!['auto', 'agy', 'cli', 'api'].includes(config.provider)) throw new Error('provider: auto, agy, cli или api');
  const cliPath = await findGemini(root, process.env, store.root);
  let agyPath = await findAgy();
  if (command === 'bootstrap') {
    if (!stdin.isTTY) throw new Error('Запускай bootstrap в интерактивном CMD. Для автоматизации используй setup и ask.');
    await installWorkspace(config.workspace, catalog, config);
    await store.write('config.json', config);
    let installedAgy = false;
    if (config.provider !== 'cli' && config.provider !== 'api' && !agyPath && !process.env.GEMINI_API_KEY) {
      console.log('Скачиваю официальный Antigravity CLI…');
      await installAgy(store.root);
      agyPath = await findAgy();
      if (!agyPath) throw new Error('Antigravity установлен, но agy не найден. Задай GMINI_AGY_PATH.');
      installedAgy = true;
    }
    if (config.provider === 'cli' && !cliPath && !process.env.GEMINI_API_KEY) {
      console.log('Скачиваю официальный Gemini CLI…');
      await runNode(await npmScript(), ['install', '--prefix', path.join(store.root, 'runtime'), '--no-audit', '--no-fund', '@google/gemini-cli@0.63.0'], { cwd: config.workspace, interactive: true });
    }
    const readyCli = await findGemini(root, process.env, store.root);
    if (installedAgy && !config.onboardingComplete) {
      console.log('Первый вход в Antigravity. После входа введи /quit для мини-чата.');
      await runExecutable(agyPath, config.model ? ['--model', config.model] : [], { cwd: config.workspace, interactive: true });
      config.onboardingComplete = true;
      await store.write('config.json', config);
    }
    if (config.provider === 'cli' && readyCli && !config.onboardingComplete && !process.env.GEMINI_API_KEY) {
      console.log(`Первый запуск: войди в Google и подтверди рабочий проект. Затем /quit откроет мини-чат. Данные: ${store.root}`);
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
    await store.write('config.json', config);
    if (flags['install-cli']) {
      console.log('Установка официального Gemini CLI в data/runtime…');
      // Pin a researched version for reproducible setup, without global mutations.
      await runNode(await npmScript(), ['install', '--prefix', path.join(store.root, 'runtime'), '--no-audit', '--no-fund', '@google/gemini-cli@0.63.0'], { cwd: root, interactive: true });
    }
    console.log(`Готово. Данные: ${store.root}\nПроект: ${config.workspace}\nЗапуск: gmini.cmd\nВход Google и инструменты: gmini.cmd native`);
    return;
  }
  if (command === 'doctor') {
    console.log(`Node: ${process.version}\nДанные: ${store.root}\nНавыки: ${catalog.skills.size}\nПлагины: ${catalog.plugins.size}\nAntigravity CLI: ${agyPath || 'не установлен'}\nGemini CLI: ${cliPath || 'не установлен; gmini setup --install-cli'}\nAPI-ключ: ${process.env.GEMINI_API_KEY ? 'задан' : 'не задан'}\nПроект: ${config.workspace}`);
    if (!agyPath && !cliPath && !process.env.GEMINI_API_KEY) process.exitCode = 1;
    return;
  }
  if (command === 'skills') { for (const skill of enabledSkills(catalog, config)) console.log(`${skill.name.padEnd(24)} ${skill.description}`); return; }
  if (command === 'plugins') {
    const [, action, name] = positional;
    if (action) {
      if (!['enable', 'disable'].includes(action) || !catalog.plugins.has(name)) throw new Error('Используй plugins enable|disable NAME');
      config.plugins = action === 'enable' ? [...new Set([...config.plugins, name])] : config.plugins.filter(n => n !== name);
      await store.write('config.json', config);
    }
    for (const plugin of catalog.plugins.values()) console.log(`${config.plugins.includes(plugin.name) ? '[on] ' : '[off]'} ${plugin.name}: ${plugin.description}`);
    console.log('Переключение влияет на мини-чат. Уже установленные нативные навыки остаются в .gemini/skills.');
    return;
  }
  if (command === 'sessions') { console.log((await store.sessions()).join('\n') || 'Сессий пока нет.'); return; }
  if (command === 'native') {
    const nativeAgy = config.provider === 'agy' || (config.provider === 'auto' && agyPath);
    if (!nativeAgy && !cliPath) throw new Error('Сначала gmini setup --install-cli');
    if (nativeAgy && !agyPath) throw new Error('Antigravity CLI не найден. Установи официальный agy или задай GMINI_AGY_PATH.');
    await installWorkspace(config.workspace, catalog, config);
    const args = config.model ? ['--model', config.model] : [];
    if (nativeAgy) await runExecutable(agyPath, args, { cwd: config.workspace, interactive: true });
    else await runNode(cliPath, args, { cwd: config.workspace, interactive: true });
    return;
  }
  if (!['chat', 'ask'].includes(command)) throw new Error(`Неизвестная команда: ${command}. gmini help`);
  const provider = config.provider === 'auto' ? (agyPath ? 'agy' : cliPath ? 'cli' : 'api') : config.provider;
  if (provider === 'agy' && !agyPath) throw new Error('Antigravity CLI не найден. Установи официальный agy или задай GMINI_AGY_PATH.');
  if (provider === 'cli' && !cliPath) throw new Error('Сначала gmini setup --install-cli или --provider api');
  if (provider === 'api' && !process.env.GEMINI_API_KEY) throw new Error('Нет авторизации. Выполни gmini setup --install-cli и gmini native либо задай GEMINI_API_KEY.');
  await access(config.workspace);
  let session = await store.session(flags.session || 'default');
  let selected = flags.skill ? [safeName(flags.skill)] : [];
  const answer = async text => {
    const explicit = [...text.matchAll(/(?:^|\s)\$([a-z][a-z0-9-]*)\b/g)].map(match => match[1]);
    const context = await buildContext(root, catalog, config, [...selected, ...explicit]);
    const user = { role: 'user', text, at: new Date().toISOString() };
    const messages = [...session.messages, user];
    console.log('Gemini думает…');
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
    if (!text) throw new Error('Укажи текст: gmini ask "Привет"');
    await answer(text); return;
  }
  if (!stdin.isTTY) throw new Error('Для мини-чата нужен терминал; для скриптов используй gmini ask "текст".');
  console.log(`do-it-gemini | ${provider} | ${config.model || 'модель по умолчанию'} | сессия ${session.name}\n/help — команды; /exit — выход. История: ${store.root}`);
  if (provider === 'api') console.log('API-режим: беседа без доступа к файлам и shell. Для работы с кодом: gmini native.');
  const rl = createInterface({ input: stdin, output: stdout });
  let closed = false;
  rl.on('close', () => { closed = true; });
  try {
    while (!closed) {
      let line;
      try { line = (await rl.question('ты > ')).trim(); } catch (error) { if (closed) break; throw error; }
      if (!line) continue;
      if (line === '/exit' || line === '/quit') break;
      try {
        if (!line.startsWith('/')) { await answer(line); continue; }
        const [action, ...parts] = line.split(/\s+/); const value = parts.join(' ');
        switch (action) {
          case '/help': console.log(HELP); break;
          case '/skills': console.log(enabledSkills(catalog, config).map(s => `${s.name}: ${s.description}`).join('\n')); break;
          case '/skill':
            if (!value || value === 'auto') selected = [];
            else { await buildContext(root, catalog, config, [value]); selected = [value]; }
            console.log(`Навык: ${selected.join(', ') || 'автоматический выбор'}`); break;
          case '/plugins': console.log(config.plugins.join(', ') || 'Все выключены'); break;
          case '/sessions': console.log((await store.sessions()).join('\n')); break;
          case '/session': if (!value) throw new Error('/session NAME'); session = await store.session(value); console.log(`Сессия ${session.name}`); break;
          case '/new': {
            const candidate = await store.session(value || `chat-${Date.now()}`);
            if (candidate.messages.length) throw new Error('Это имя уже используется; выбери другое.');
            await store.saveSession(candidate); session = candidate;
            console.log(`Сессия ${session.name}`); break;
          }
          case '/history': for (const m of session.messages) console.log(`${m.role}: ${m.text}\n`); break;
          case '/model': if (!value) throw new Error('/model NAME'); config.model = value; await store.write('config.json', config); console.log(`Модель: ${value}`); break;
          default: console.log('Неизвестная команда. /help');
        }
      } catch (error) { console.error(`Ошибка: ${error.message}`); }
    }
  } finally { rl.close(); }
}
