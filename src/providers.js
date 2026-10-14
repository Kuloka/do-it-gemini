import { spawn } from 'node:child_process';
import { access, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export async function findAgy(env = process.env) {
  const home = env.USERPROFILE || env.HOME || os.homedir();
  const candidates = [env.GMINI_AGY_PATH, path.join(home, '.gemini', 'bin', 'agy.exe'), path.join(home, '.local', 'bin', 'agy')];
  if (env.LOCALAPPDATA) candidates.push(path.join(env.LOCALAPPDATA, 'agy', 'bin', 'agy.exe'));
  for (const directory of (env.PATH || '').split(path.delimiter)) candidates.push(path.join(directory, process.platform === 'win32' ? 'agy.exe' : 'agy'));
  for (const candidate of candidates.filter(Boolean)) {
    try { await access(candidate); return path.resolve(candidate); } catch {}
  }
  return null;
}

export async function installAgy(dataRoot, { fetchImpl = fetch, runner = runExecutable, platform = process.platform } = {}) {
  if (platform !== 'win32') throw new Error('Install Antigravity CLI for your platform: https://antigravity.google/docs/cli/install/');
  const response = await fetchImpl('https://antigravity.google/cli/install.ps1', { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Antigravity installer download failed (${response.status}).`);
  const script = await response.text();
  if (!script.trim() || /^\s*</.test(script) || script.length > 1000000) throw new Error('Invalid Antigravity installer response.');
  const directory = path.join(dataRoot, 'runtime');
  await mkdir(directory, { recursive: true });
  const file = path.resolve(directory, 'agy-install.ps1');
  await writeFile(file, script, 'utf8');
  await runner('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file, '--skip-aliases', '--skip-path'], { cwd: path.resolve(dataRoot), interactive: true });
}

export async function findGemini(root, env = process.env, dataRoot = path.join(root, 'data')) {
  const candidates = [];
  if (env.GMINI_CLI_PATH) candidates.push(path.resolve(env.GMINI_CLI_PATH));
  const packages = [path.join(dataRoot, 'runtime', 'node_modules', '@google', 'gemini-cli')];
  for (const dir of (env.PATH || '').split(path.delimiter)) {
    packages.push(path.join(dir, 'node_modules', '@google', 'gemini-cli'));
    packages.push(path.join(dir, '..', 'lib', 'node_modules', '@google', 'gemini-cli'));
  }
  for (const directory of packages) {
    try {
      const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
      const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.gemini;
      if (bin) candidates.push(path.resolve(directory, bin));
    } catch {}
  }
  for (const candidate of candidates) { try { await access(candidate); return candidate; } catch {} }
  return null;
}

export function runNode(script, args, { cwd, input, interactive = false, env = process.env, timeout = 180000 } = {}) {
  return runExecutable(process.execPath, [script, ...args], { cwd, input, interactive, env, timeout });
}

export function runExecutable(executable, args, { cwd, input, interactive = false, env = process.env, timeout = 180000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, env, shell: false, windowsHide: true, stdio: interactive ? 'inherit' : ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;
    const timer = interactive ? null : setTimeout(() => { timedOut = true; child.kill(); }, timeout);
    child.stdout?.on('data', chunk => { stdout += chunk; });
    child.stderr?.on('data', chunk => { stderr += chunk; });
    child.stdin?.on('error', error => { if (error.code !== 'EPIPE') reject(error); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      if (timedOut) reject(new Error('Gemini CLI: время ожидания истекло.'));
      else if (code !== 0) reject(new Error(`Gemini CLI завершился с кодом ${code}. ${stderr.slice(-2000)}`));
      else resolve(stdout);
    });
    if (!interactive) child.stdin.end(input || '');
  });
}

export async function agyReply({ agyPath, cwd, context, messages, model, timeout, runner = runExecutable }) {
  const transcript = messages.map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}:\n${m.text}`).join('\n\n');
  const args = ['--input-format', 'stream-json', '--output-format', 'stream-json'];
  if (model) args.push('--model', model);
  const content = `INSTRUCTIONS:\n${context}\n\nCONVERSATION:\n${transcript}\n\nAnswer the last user message.`;
  const output = await runner(agyPath, args, { cwd, timeout, input: JSON.stringify({ event: 'user', message: { content } }) + '\n' });
  let result;
  for (const line of output.split(/\r?\n/).filter(line => line.trim())) {
    let event;
    try { event = JSON.parse(line); } catch { throw new Error('Antigravity CLI returned invalid JSON.'); }
    if (event.event === 'result' || event.type === 'result') result = event.result || event;
    if (event.event === 'error') throw new Error(event.error?.message || event.message || 'Antigravity CLI failed.');
  }
  if (!result) throw new Error('Antigravity CLI did not return a completed result.');
  if (result.status !== 'SUCCESS' || result.error) throw new Error(result.error?.message || (typeof result.error === 'string' ? result.error : null) || `Antigravity CLI: ${result.status || 'failed'}`);
  if (typeof result.response !== 'string' || !result.response.trim()) throw new Error('Antigravity CLI returned an empty response.');
  return result.response;
}

export async function cliReply({ cliPath, cwd, context, messages, model, timeout }) {
  const transcript = messages.map(message => `${message.role === 'user' ? 'USER' : 'ASSISTANT'}:\n${message.text}`).join('\n\n');
  const args = ['-p', 'Answer the last user message using the instructions and conversation supplied on stdin.', '--output-format', 'json'];
  if (model) args.push('--model', model);
  const output = await runNode(cliPath, args, { cwd, timeout, input: `INSTRUCTIONS:\n${context}\n\nCONVERSATION:\n${transcript}` });
  let parsed;
  try { parsed = JSON.parse(output); } catch { throw new Error('Gemini CLI вернул некорректный JSON. Проверь версию CLI и авторизацию через gmini native.'); }
  if (parsed.error) throw new Error(parsed.error.message || 'Ошибка Gemini CLI');
  if (typeof parsed.response !== 'string' || !parsed.response.trim()) throw new Error('Gemini CLI вернул пустой ответ.');
  return parsed.response;
}

export async function apiReply({ context, messages, model = 'gemini-3.8-flash', apiKey = process.env.GEMINI_API_KEY, fetchImpl = fetch, timeout = 120000 }) {
  if (!apiKey) throw new Error('Задай GEMINI_API_KEY или используй --provider cli. Ключ не сохраняется в data.');
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('Некорректное имя модели.');
  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(timeout),
    body: JSON.stringify({ systemInstruction: { parts: [{ text: `${context}\nAPI chat has no filesystem, shell, browser or subagent tools. Explain this limit when execution is requested. Do not claim to have inspected or modified files.` }] }, contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })) })
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error(`Gemini API ${response.status}: сервер вернул ответ без корректного JSON`); }
  if (!response.ok) throw new Error(`Gemini API ${response.status}: ${payload.error?.message || 'ошибка запроса'}`);
  const text = payload.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('');
  if (!text?.trim()) throw new Error(`Gemini не вернул текст (${payload.promptFeedback?.blockReason || payload.candidates?.[0]?.finishReason || 'empty'}).`);
  return text;
}

export async function npmScript() {
  const candidates = [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) candidates.push(path.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  for (const candidate of candidates) { try { await readFile(candidate); return candidate; } catch {} }
  throw new Error('Не найден npm-cli.js. Установи Node.js с npm.');
}
