import { createUsageReader } from './metrics.mjs';
import { createMeterServer } from './server.mjs';

// The App supplies this local connection; do not discover credentials in profiles.
const address = process.env.ANTIGRAVITY_LS_ADDRESS || '';
const endpoint = new URL(address.includes('://') ? address : `http://${address}`);
if (!['http:', 'https:'].includes(endpoint.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname) || endpoint.username || endpoint.password || endpoint.pathname !== '/' || endpoint.search || endpoint.hash) throw new Error('A local App endpoint is required.');
const csrf = process.env.ANTIGRAVITY_CSRF_TOKEN;
if (!csrf) throw new Error('Run Usage inside the Antigravity App.');
const methods = new Set(['GetUserStatus', 'GetCascadeTrajectoryGeneratorMetadata']);
const readUsage = createUsageReader({ rpc: async (method, body) => {
  if (!methods.has(method)) throw new Error('Unsupported read operation.');
  const response = await fetch(new URL(`/exa.language_server_pb.LanguageServerService/${method}`, endpoint), {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-codeium-csrf-token': csrf },
    body: JSON.stringify(body), signal: AbortSignal.timeout(8000), redirect: 'error',
  });
  if (!response.ok) {
    const error = new Error('App usage metadata unavailable.');
    error.status = response.status;
    throw error;
  }
  return response.json();
} });
const port = Number(process.env.ANTIGRAVITY_SIDECAR_WEB_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('A sidecar port is required.');
let lastReport = -Infinity;
const server = createMeterServer({ token: process.env.ANTIGRAVITY_SIDECAR_UI_TOKEN, readUsage, reportFailure: error => {
  if (Date.now() - lastReport < 60_000) return;
  lastReport = Date.now();
  const operation = methods.has(error?.operation) ? error.operation : 'ReadUsage';
  const status = Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599 ? ` HTTP ${error.status}` : '';
  console.error(`[Usage] ${operation}${status}: App metadata unavailable. Check App version and restart the Usage sidecar.`);
} });
server.listen(port, '127.0.0.1');
const stop = () => server.close(() => process.exit());
process.once('SIGTERM', stop); process.once('SIGINT', stop);
