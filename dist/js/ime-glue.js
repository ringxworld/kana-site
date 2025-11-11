(() => {
  const ta = document.getElementById('input');
  if (!ta) {
    console.error('[IME] No #input element found');
    return;
  }

  let imeWorker = null;
  // Public API
  window.IME = window.IME || {};
  window.IME.isReady = false;
  const __imeQueue = [];
  window.IME.requestSuggest = (text) => {
    const payload = { type: 'suggest', text: text ?? ta.value ?? '' };
    if (!window.IME.isReady) {
      __imeQueue.push(payload);
      return;
    }
    imeWorker?.postMessage(payload);
  };

  // Popup UI
  const popup = document.createElement('div');
  Object.assign(popup.style, {
    position: 'absolute',
    display: 'none',
    background: '#0f1725',
    color: '#e6eefb',
    border: '1px solid #293241',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0,0,0,.35)',
    zIndex: '9999',
    minWidth: '220px',
    maxWidth: '480px',
    maxHeight: '320px',
    overflowY: 'auto',
    fontFamily:
      "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,'Noto Sans JP','Hiragino Kaku Gothic ProN',Meiryo,sans-serif",
  });
  document.body.appendChild(popup);

  let currentReading = '';
  let currentList = [];
  let currentIndex = -1;

  function hidePopup() {
    popup.style.display = 'none';
    currentReading = '';
    currentList = [];
    currentIndex = -1;
  }
  function positionPopup() {
    const r = ta.getBoundingClientRect();
    popup.style.left = window.scrollX + r.left + 'px';
    popup.style.top = window.scrollY + (r.bottom + 6) + 'px';
    popup.style.width = r.width + 'px';
  }
  function updateHighlight() {
    const kids = Array.from(popup.children);
    kids.forEach(
      (el, idx) => (el.style.background = idx === currentIndex ? '#152238' : 'transparent')
    );
    const active = kids[currentIndex];
    if (active) active.scrollIntoView({ block: 'nearest' });
  }
  function commitPick(kanji) {
    const v = ta.value;
    const m = v.match(/([ぁ-ゖー]+)$/);
    if (m) {
      const hira = m[1];
      ta.value = v.slice(0, v.length - hira.length) + kanji;
    } else {
      ta.value = v + kanji;
    }
    if (window.IME.isReady && currentReading) {
      imeWorker.postMessage({ type: 'commit', reading: currentReading, kanji });
    }
    hidePopup();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
  }
  function renderPopup(reading, candidates) {
    currentReading = reading || '';
    currentList = candidates || [];
    currentIndex = currentList.length ? 0 : -1;
    if (!currentList.length) {
      hidePopup();
      return;
    }
    popup.innerHTML = '';
    for (let i = 0; i < currentList.length; i++) {
      const div = document.createElement('div');
      div.textContent = currentList[i];
      Object.assign(div.style, {
        padding: '10px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        fontSize: '18px',
      });
      if (i === currentIndex) div.style.background = '#152238';
      div.addEventListener('mouseenter', () => {
        currentIndex = i;
        updateHighlight();
      });
      div.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        commitPick(currentList[i]);
      });
      popup.appendChild(div);
    }
    positionPopup();
    popup.style.display = 'block';
  }

  ta.addEventListener('keydown', (e) => {
    const open = popup.style.display === 'block';
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentList.length) {
        currentIndex = Math.min(currentIndex + 1, currentList.length - 1);
        updateHighlight();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentList.length) {
        currentIndex = Math.max(currentIndex - 1, 0);
        updateHighlight();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentIndex >= 0 && currentList[currentIndex]) commitPick(currentList[currentIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      hidePopup();
    }
  });
  document.addEventListener('mousedown', (ev) => {
    if (popup.style.display === 'block' && !popup.contains(ev.target) && ev.target !== ta)
      hidePopup();
  });
  window.addEventListener('resize', () => {
    if (popup.style.display === 'block') positionPopup();
  });
  window.addEventListener('scroll', () => {
    if (popup.style.display === 'block') positionPopup();
  });

  // Boot worker
  try {
    const workerUrl = new URL('./ime-worker.js', import.meta.url);
    imeWorker = new Worker(workerUrl, { type: 'classic' });
  } catch (e) {
    console.error('[IME] Worker boot failed', e);
    return;
  }

  console.log('[IME] glue loaded', { module: true });

  const here = new URL('.', import.meta.url); // .../js/
  const SKK_URL = new URL('../dict/SKK-JISYO.L', here).href;
  const KUROMOJI_URL = new URL('../vendor/kuromoji/kuromoji.js', here).href;
  const IPADIC_URL = new URL('../vendor/ipadic/', here).href; // trailing slash
  

  imeWorker.onmessage = (e) => {
    const msg = e.data || {};
    if (msg.type === 'ready') {
      window.IME.isReady = true;
      for (const p of __imeQueue.splice(0)) imeWorker.postMessage(p);
      console.log('[IME] ready', msg.stats);
      return;
    }
    if (msg.type === 'error') {
      console.error('[IME] worker error:', msg.where, msg.message);
      return;
    }
    if (msg.type === 'log') {
      console.log('[IME]', msg.msg);
      return;
    }
    if (msg.type === 'suggest') {
      renderPopup(msg.token?.reading || '', msg.candidates || []);
      return;
    }
  };

  imeWorker.postMessage({
    type: 'init',
    skkPath: SKK_URL,
    kuromojiPath: KUROMOJI_URL,
    ipadicPath: new URL('../vendor/ipadic/', here).pathname,
  });
})();
