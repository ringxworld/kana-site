const API_BASES = ['http://kana.local', 'http://localhost:3001'];

async function apiBase() {
  for (const base of API_BASES) {
    try {
      const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1500) });
      if (r.ok) return base;
    } catch { /* try next */ }
  }
  throw new Error('kana-site server unreachable. Is it running?');
}

function show(id) {
  ['loading', 'result', 'done', 'error'].forEach((s) => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

function setError(msg) {
  document.getElementById('error-msg').textContent = msg;
  show('error');
}

async function loadDecks(base) {
  const res = await fetch(`${base}/api/v1/decks`);
  if (!res.ok) throw new Error('Failed to load decks');
  return res.json();
}

async function main() {
  show('loading');

  const { pendingText } = await browser.storage.session.get('pendingText');
  if (!pendingText) { setError('No text captured. Select text then right-click → Add to Kana.'); return; }

  let base;
  try { base = await apiBase(); } catch (e) { setError(e.message); return; }

  let enrichData;
  try {
    const res = await fetch(`${base}/api/v1/sentences/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: pendingText }),
    });
    if (!res.ok) throw new Error(`Enrich failed: ${res.status}`);
    enrichData = await res.json();
  } catch (e) { setError(e.message); return; }

  document.getElementById('original').textContent = enrichData.original;
  document.getElementById('furigana').innerHTML = enrichData.furigana;
  document.getElementById('translation').textContent = enrichData.translation;
  document.getElementById('model-tag').textContent =
    `${enrichData.furiganaSource} · ${enrichData.translationModel}`;

  let decks;
  try { decks = await loadDecks(base); } catch { decks = []; }

  const sel = document.getElementById('deck-select');
  sel.innerHTML = '';
  if (decks.length === 0) {
    sel.innerHTML = '<option value="">No decks — create one in kana-site first</option>';
  } else {
    decks.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      sel.appendChild(opt);
    });
    document.getElementById('save-btn').disabled = false;
  }

  show('result');

  document.getElementById('cancel-btn').onclick = () => window.close();

  document.getElementById('save-btn').onclick = async () => {
    const deckId = Number(sel.value);
    if (!deckId) return;
    try {
      const res = await fetch(`${base}/api/v1/sentences/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pendingText, deckId }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      await browser.storage.session.remove('pendingText');
      show('done');
      setTimeout(() => window.close(), 1500);
    } catch (e) { setError(e.message); }
  };
}

main();
