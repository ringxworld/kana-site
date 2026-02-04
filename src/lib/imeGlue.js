export function initIme({ textarea, baseUrl }) {
  if (!textarea) return null;

  let imeWorker = null;
  const ime = {
    isReady: false,
    requestSuggest: () => {},
  };

  const queue = [];
  ime.requestSuggest = (text) => {
    const payload = { type: 'suggest', text: text ?? textarea.value ?? '' };
    if (!ime.isReady) {
      queue.push(payload);
      return;
    }
    imeWorker?.postMessage(payload);
  };

  window.IME = ime;

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
    const r = textarea.getBoundingClientRect();
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
    const v = textarea.value;
    const match = v.match(/([ぁ-ゖー]+)$/);
    if (match) {
      const hira = match[1];
      textarea.value = v.slice(0, v.length - hira.length) + kanji;
    } else {
      textarea.value = v + kanji;
    }
    if (ime.isReady && currentReading) {
      imeWorker.postMessage({ type: 'commit', reading: currentReading, kanji });
    }
    hidePopup();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
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

  function onKeydown(e) {
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
  }

  function onMouseDown(ev) {
    if (popup.style.display === 'block' && !popup.contains(ev.target) && ev.target !== textarea) {
      hidePopup();
    }
  }

  function onReposition() {
    if (popup.style.display === 'block') positionPopup();
  }

  textarea.addEventListener('keydown', onKeydown);
  document.addEventListener('mousedown', onMouseDown);
  window.addEventListener('resize', onReposition);
  window.addEventListener('scroll', onReposition);

  try {
    const workerUrl = new URL(`${baseUrl}js/ime-worker.js`, window.location.href);
    imeWorker = new Worker(workerUrl, { type: 'classic' });
  } catch (e) {
    return {
      ...ime,
      cleanup: () => {
        popup.remove();
      },
    };
  }

  const SKK_URL = new URL(`${baseUrl}dict/SKK-JISYO.L`, window.location.href).href;
  const KUROMOJI_URL = new URL(`${baseUrl}vendor/kuromoji/kuromoji.js`, window.location.href).href;
  const IPADIC_URL = new URL(`${baseUrl}vendor/ipadic/`, window.location.href).pathname;

  imeWorker.onmessage = (e) => {
    const msg = e.data || {};
    if (msg.type === 'ready') {
      ime.isReady = true;
      for (const p of queue.splice(0)) imeWorker.postMessage(p);
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
    ipadicPath: IPADIC_URL,
  });

  return {
    ...ime,
    cleanup: () => {
      textarea.removeEventListener('keydown', onKeydown);
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition);
      imeWorker?.terminate?.();
      popup.remove();
    },
  };
}
