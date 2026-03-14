// ==UserScript==
// @name         Kotoba Capture
// @namespace    http://kotoba.local/
// @version      1.0.0
// @description  Select Japanese text on any page → enrich with furigana + translation via kotoba-lab
// @author       shikarii
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      kotoba.local
// ==/UserScript==

(function () {
  'use strict';

  const API_BASE = 'http://kotoba.local/api/v1/sentences';
  const JP_RE = /[\u3040-\u9FFF\uFF66-\uFF9F]/;

  let btn = null;

  function removeBtn() {
    if (btn && btn.isConnected) btn.remove();
    btn = null;
  }

  function showResult(furigana, translation, model) {
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed', 'bottom:16px', 'right:16px', 'z-index:2147483647',
      'background:#1e1c18', 'color:#e3dccf', 'border:1px solid #302d28',
      'border-radius:6px', 'padding:12px 14px', 'max-width:360px',
      'font:13px/1.5 system-ui,sans-serif', 'box-shadow:0 4px 16px rgba(0,0,0,.5)',
    ].join(';');

    overlay.innerHTML = `
      <div style="font-size:11px;color:#80786b;margin-bottom:4px">
        furigana · <em>${model}</em>
      </div>
      <div style="margin-bottom:6px;line-height:1.8">${furigana}</div>
      <div style="color:#3a9570">${translation}</div>
      <div style="text-align:right;margin-top:8px">
        <button id="kc-close" style="background:none;border:none;color:#80786b;cursor:pointer;font-size:12px">✕ close</button>
      </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#kc-close').onclick = () => overlay.remove();
    setTimeout(() => overlay.isConnected && overlay.remove(), 12000);
  }

  document.addEventListener('mouseup', () => {
    removeBtn();

    const text = window.getSelection()?.toString().trim() ?? '';
    if (!text || !JP_RE.test(text)) return;

    btn = document.createElement('button');
    btn.textContent = '+ Kana';
    btn.style.cssText = [
      'position:fixed', 'bottom:16px', 'right:16px', 'z-index:2147483647',
      'padding:6px 14px', 'background:#2d7a5e', 'color:#fff',
      'border:none', 'border-radius:4px', 'cursor:pointer',
      'font:13px/1 system-ui,sans-serif', 'box-shadow:0 2px 8px rgba(0,0,0,.4)',
    ].join(';');
    document.body.appendChild(btn);

    const autoRemove = setTimeout(removeBtn, 5000);

    btn.onclick = () => {
      clearTimeout(autoRemove);
      removeBtn();

      GM_xmlhttpRequest({
        method: 'POST',
        url: `${API_BASE}/enrich`,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ text }),
        onload: (res) => {
          try {
            const data = JSON.parse(res.responseText);
            showResult(data.furigana, data.translation, data.translationModel);
          } catch {
            alert('[kotoba-capture] Failed to parse server response.');
          }
        },
        onerror: () => alert('[kotoba-capture] Could not reach kotoba.local — is the server running?'),
      });
    };
  });
})();
