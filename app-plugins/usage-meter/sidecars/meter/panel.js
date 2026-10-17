(() => {
  const parameters = new URLSearchParams(location.search);
  const conversationId = parameters.get('conversationId');
  const token = parameters.get('token');
  const context = document.getElementById('context-value');
  const limit = document.getElementById('limit-value');
  const bar = document.getElementById('context-bar');
  const fill = document.getElementById('context-fill');
  const percent = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
  function render(value = {}) {
    const available = percent(value.contextPercent);
    context.textContent = available ? `${value.estimated ? '≈' : ''}${Math.round(value.contextPercent)}%` : '—';
    context.title = available ? 'Context occupied by the latest model invocation. Updates after model activity.' : 'No context measurement available for this conversation.';
    fill.style.width = available ? `${value.contextPercent}%` : '0%';
    bar.dataset.level = available && value.contextPercent >= 95 ? 'full' : available && value.contextPercent >= 80 ? 'high' : 'normal';
    if (available) bar.setAttribute('aria-valuenow', String(Math.round(value.contextPercent)));
    else bar.removeAttribute('aria-valuenow');
    bar.setAttribute('aria-valuetext', available ? `${value.estimated ? 'Approximately ' : ''}${Math.round(value.contextPercent)} percent used` : 'Unavailable');
    limit.textContent = percent(value.limitRemainingPercent) ? `${Math.round(value.limitRemainingPercent)}%` : '—';
    limit.title = percent(value.limitRemainingPercent) ? 'Remaining quota for the model used in the latest invocation. Refreshed at most once per minute.' : 'The App has not provided remaining quota for this model.';
  }
  const themeNames = new Set(['--background', '--foreground', '--muted', '--primary', '--border']);
  window.addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'theme-change') return;
    for (const [key, value] of Object.entries(event.data.payload?.cssVariables || {})) {
      if (themeNames.has(key) && typeof value === 'string' && CSS.supports('color', value)) document.documentElement.style.setProperty(key, value);
    }
  });
  let running = false;
  async function refresh() {
    if (running || document.hidden || !conversationId || !token) return;
    running = true;
    try {
      const response = await fetch('/usage', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Sidecar-Token': token}, body: JSON.stringify({conversationId}), signal: AbortSignal.timeout(20000)});
      if (!response.ok) throw new Error('Unavailable');
      render(await response.json());
    } catch { render(); }
    finally { running = false; }
  }
  render();
  refresh();
  setInterval(refresh, 10000);
  document.addEventListener('visibilitychange', refresh);
})();
