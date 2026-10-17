import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { connect } from 'node:net';
import { installAppPlugin } from '../src/app-plugin.js';
import { createMeterServer } from '../app-plugins/usage-meter/sidecars/meter/server.mjs';

test('App plugin installs a complete native sidecar without changing existing configuration', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'gmini-app-'));
  try {
    const directory = await installAppPlugin(home);
    const configFile = path.join(home, '.gemini/config/config.json');
    await writeFile(configFile, '{"unrelated":true}');
    await installAppPlugin(home);
    assert.equal(await readFile(configFile, 'utf8'), '{"unrelated":true}');
    const spec = JSON.parse(await readFile(path.join(directory, 'sidecars/meter/sidecar.json')));
    assert.equal(spec.has_web_ui, true);
    assert.equal(spec.ui_config.views[0].entrypoint, 'SIDECAR_UI_ENTRYPOINT_AUX_PANE');
    for (const file of ['main.mjs', 'metrics.mjs', 'server.mjs', 'index.html', 'panel.js', 'style.css']) assert.ok((await readFile(path.join(directory, 'sidecars/meter', file))).length);
    await writeFile(path.join(directory, 'sidecars/meter/panel.js'), '// user customization');
    await assert.rejects(installAppPlugin(home), /Refusing to overwrite/);
    assert.equal(await readFile(path.join(directory, 'sidecars/meter/panel.js'), 'utf8'), '// user customization');
  } finally { await rm(home, {recursive:true,force:true}); }
});

test('meter only exposes authenticated metrics and static assets; no conversation mutation endpoints', async () => {
  const calls = [];
  const metrics = {contextPercent:42,estimated:false,limitRemainingPercent:0};
  const server = createMeterServer({token:'test-private-token',readUsage:async id=>{calls.push(id);return metrics;}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body, token='test-private-token') => fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','X-Sidecar-Token':token},body:JSON.stringify(body)});
  try {
    const page = await fetch(base+'/');
    assert.equal(page.status,200);
    assert.match(page.headers.get('content-security-policy'), /default-src 'none'/);
    assert.match(await page.text(), /role="progressbar"/);
    const malformed = await new Promise((resolve, reject) => {
      const socket = connect(server.address().port, '127.0.0.1');
      let text = '';
      socket.on('connect', () => socket.end('GET http://[ HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'));
      socket.on('data', chunk => { text += chunk; });
      socket.on('end', () => resolve(text)); socket.on('error', reject);
    });
    assert.match(malformed, /^HTTP\/1\.1 400/);
    assert.equal((await fetch(base+'/')).status,200);
    assert.equal((await post('/usage',{conversationId:'conversation-123'},'incorrect')).status,401);
    assert.equal((await post('/usage',{conversationId:'../secrets'})).status,400);
    assert.equal((await fetch(base+'/usage',{method:'POST',headers:{'X-Sidecar-Token':'test-private-token'},body:'{broken'})).status,400);
    assert.equal((await post('/usage',{conversationId:'valid',padding:'x'.repeat(2048)})).status,413);
    assert.equal((await fetch(base+'/usage')).status,404);
    assert.equal((await post('/_sidecar/send-message',{conversationId:'valid',message:'no'})).status,404);
    assert.equal((await post('/_sidecar/new-conversation',{message:'no'})).status,404);
    assert.deepEqual(calls,[]);
    const result = await post('/usage',{conversationId:'conversation-123'});
    assert.deepEqual(await result.json(),metrics);
    assert.equal(result.headers.get('cache-control'),'no-store');
    assert.deepEqual(calls,['conversation-123']);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});

test('provider errors clear visible metrics without exposing internal errors', async () => {
  const server=createMeterServer({token:'private',readUsage:async()=>{throw new Error('private account detail');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const response=await fetch(`http://127.0.0.1:${server.address().port}/usage`,{method:'POST',headers:{'X-Sidecar-Token':'private'},body:'{"conversationId":"valid"}'});
    assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{contextPercent:null,estimated:false,limitRemainingPercent:null});
  }finally{await new Promise(resolve=>server.close(resolve));}
});
