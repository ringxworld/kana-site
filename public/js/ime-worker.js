(function () {
  const OrigXHR = self.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OrigXHR();
    let _url = '';
    const origOpen = xhr.open;
    xhr.open = function (method, url) {
      _url = url;
      return origOpen.apply(xhr, arguments);
    };
    xhr.addEventListener('load', function () {
      try {
        if (typeof _url === 'string' && _url.includes('/vendor/ipadic/')) {
          // Kuromoji asks for ArrayBuffer. Peek at a few bytes.
          let b0 = -1,
            b1 = -1,
            preview = '';
          if (xhr.response instanceof ArrayBuffer) {
            const u8 = new Uint8Array(xhr.response);
            b0 = u8[0];
            b1 = u8[1];
            preview = String.fromCharCode(...u8.slice(0, 16)).replace(/\n/g, ' ');
          } else if (typeof xhr.response === 'string') {
            preview = xhr.response.slice(0, 32).replace(/\n/g, ' ');
          }
          postMessage({
            type: 'log',
            msg: `[kuromoji XHR] ${_url} -> status ${xhr.status}, bytes0=${b0},${b1} preview="${preview}"`,
          });
        }
      } catch (_) {}
    });
    return xhr;
  }
  PatchedXHR.UNSENT = OrigXHR.UNSENT;
  PatchedXHR.OPENED = OrigXHR.OPENED;
  PatchedXHR.HEADERS_RECEIVED = OrigXHR.HEADERS_RECEIVED;
  PatchedXHR.LOADING = OrigXHR.LOADING;
  PatchedXHR.DONE = OrigXHR.DONE;
  PatchedXHR.prototype = OrigXHR.prototype;
  self.XMLHttpRequest = PatchedXHR;
})();
let tokenizer = null;
let skkMap = new Map();
let userCounts = Object.create(null);

function log(msg) {
  postMessage({ type: 'log', msg });
}

function joinDicPath(dicPath, filename) {
  if (/^https?:\/\//i.test(dicPath)) {
    // absolute URL base
    return new URL(filename, dicPath).toString();
  }
  // treat as path (ensure one trailing slash)
  if (!dicPath.endsWith('/')) dicPath += '/';
  return dicPath + filename; // e.g. "/vendor/ipadic/base.dat.gz"
}

async function init({ skkPath, kuromojiPath, ipadicPath }) {
  try {
    postMessage({ type:'log', msg:`[init] ${kuromojiPath} | ${ipadicPath} | ${skkPath}` });

    importScripts(kuromojiPath);
    if (typeof kuromoji === 'undefined') throw new Error('kuromoji undefined after importScripts');

    // Preflight ALL the ipadic blobs (allow decompressed bytes; reject HTML/empty)
    const required = [
      'base.dat.gz','cc.dat.gz','check.dat.gz',
      'tid.dat.gz','tid_map.dat.gz','tid_pos.dat.gz',
      'unk.dat.gz','unk_char.dat.gz','unk_compat.dat.gz',
      'unk_invoke.dat.gz','unk_map.dat.gz','unk_pos.dat.gz',
    ];
    for (const name of required) {
      const url = joinDicPath(ipadicPath, name);
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`[ipadic] ${name} -> ${resp.status} ${resp.statusText}`);
      const buf = await resp.arrayBuffer();
      const u8  = new Uint8Array(buf);
      if (u8.length < 16) throw new Error(`[ipadic] too small: ${url} (${u8.length} bytes)`);
      const looksHTML = (u8[0] === 0x3c /* '<' */) && (u8[1] === 0x21 /* '!' */ || u8[1] === 0x68 /* 'h' */);
      if (looksHTML) {
        const preview = String.fromCharCode(...u8.slice(0, 32)).replace(/\n/g,' ');
        throw new Error(`[ipadic] looks like HTML: ${url} -> "${preview}"`);
      }
      postMessage({ type:'log', msg:`[ipadic OK] ${name} (${u8.length} bytes)` });
    }

    // Build tokenizer (Kuromoji accepts either absolute URL or path for dicPath)
    tokenizer = await new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: ipadicPath }).build((err, t) => err ? reject(err) : resolve(t));
    });

    // Fetch + parse SKK (unchanged)
    const res = await fetch(skkPath, { cache:'no-store' });
    if (!res.ok) throw new Error(`SKK fetch -> ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (/<!DOCTYPE html>/i.test(text)) throw new Error('SKK looks like HTML');

    skkMap = new Map();
    for (const line of text.split(/\r?\n/)) {
      if (!line || line[0] === ';') continue;
      const m = line.match(/^([^\s]+)\s+\/(.+)\/\s*$/);
      if (!m) continue;
      const yomi  = m[1];
      const items = m[2].split('/').map(s => s.split(';')[0].trim()).filter(Boolean);
      if (!items.length) continue;
      const arr = skkMap.get(yomi) || [];
      for (const c of items) if (!arr.includes(c)) arr.push(c);
      skkMap.set(yomi, arr);
    }

    postMessage({ type:'ready', stats:{ entries: skkMap.size } });
  } catch (e) {
    postMessage({ type:'error', where:'init', message: String(e) });
  }
}

function rerank(reading, list) {
  const scored = list.map((w) => ({ w, s: userCounts[reading + '|' + w] || 0 }));
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.w);
}

function onSuggest(m) {
  try {
    let reading = m.reading || '';
    if (!reading && m.text) {
      const mm = m.text.match(/([ぁ-ゖー]+)$/);
      if (mm) reading = mm[1];
    }
    if (!reading || reading.length < 2) return;
    const base = skkMap.get(reading) || [];
    if (!base.length) return;
    const list = rerank(reading, base).slice(0, 20);
    postMessage({ type: 'suggest', token: { reading }, candidates: list });
  } catch (e) {
    postMessage({ type: 'error', where: 'suggest', message: String(e) });
  }
}

function onCommit(m) {
  try {
    const { reading, kanji } = m;
    if (!reading || !kanji) return;
    const key = reading + '|' + kanji;
    userCounts[key] = (userCounts[key] || 0) + 1;
    postMessage({ type: 'learn', key, value: userCounts[key] });
  } catch (e) {
    postMessage({ type: 'error', where: 'commit', message: String(e) });
  }
}

self.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.type === 'init') return init(m);
  if (m.type === 'suggest') return onSuggest(m);
  if (m.type === 'commit') return onCommit(m);
});
