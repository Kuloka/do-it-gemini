import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';

const empty = { contextPercent: null, estimated: false, limitRemainingPercent: null };
const assets = new Map([['/', ['index.html', 'text/html; charset=utf-8']], ['/panel.js', ['panel.js', 'text/javascript; charset=utf-8']], ['/style.css', ['style.css', 'text/css; charset=utf-8']]]);
export function createMeterServer({ token, readUsage, reportFailure = () => {} }) {
  if (typeof token !== 'string' || !token) throw new Error('The App must provide a sidecar UI token.');
  const expected = Buffer.from(token);
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'");
    let url;
    try { url = new URL(request.url, 'http://localhost'); }
    catch { response.writeHead(400); response.end(); return; }
    if (request.method === 'GET' && assets.has(url.pathname)) {
      const [file, type] = assets.get(url.pathname);
      try {
        const body = await readFile(new URL(file, import.meta.url));
        response.writeHead(200, { 'Content-Type': type }); response.end(body);
      } catch { response.writeHead(503); response.end(); }
      return;
    }
    if (url.pathname !== '/usage' || request.method !== 'POST') { response.writeHead(404); response.end(); return; }
    const provided = Buffer.from(String(request.headers['x-sidecar-token'] || ''));
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) { response.writeHead(401); response.end(); return; }
    let body = '', size = 0;
    try {
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 2048) { response.writeHead(413); response.end(); return; }
        body += chunk;
      }
      let data;
      try { data = JSON.parse(body); }
      catch { response.writeHead(400); response.end(); return; }
      const { conversationId } = data ?? {};
      if (typeof conversationId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(conversationId)) { response.writeHead(400); response.end(); return; }
      const result = await readUsage(conversationId);
      response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(result));
    } catch (error) {
      reportFailure(error);
      response.writeHead(503, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(empty));
    }
  });
}
