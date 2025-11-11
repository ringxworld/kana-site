// public/js/ime-worker.js
// Classic Web Worker for JP IME: loads kuromoji, IPADIC, and SKK; serves suggestions.

let tokenizer = null;
let skkMap = new Map();                 // Map<reading (hiragana), string[]>
let userCounts = Object.create(null);   // "reading|kanji" -> freq

function log(msg) { postMessage({ type: 'log', msg }); }
function err(where, e) { postMessage({ type: 'error', where, message: String(e && e.stack ? e.stack : e) }); }

// --- helpers ---
function hira(str) {
  return (str || '').replace(/[\u30a1-\u30f6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}
function joinDicPath(dicPath, filename) {
  // dicPath may be an absolute URL or a root-relative path ("/vendor/ipadic/")
  if (/^https?:\/\//i.test(dicPath)) return new URL(filename, dicPath).toString();
  // path join (ensure one trailing slash)
  return (dicPath.endsWith('/') ? dicPath : dicPath + '/') + filename;
}
function rerank(reading, list) {
  const scored = list.map(w => ({ w, s: (userCounts[reading + '|' + w] || 0) }));
  scored.sort((a, b) => b.s - a.s);
  return scored.map(x => x.w);
}

// --- INIT ---
async function init({ skkPath, kuromojiPath, ipadicPath }) {
  try {
    log(`[init] kuromoji=${kuromojiPath} | ipadic=${ipadicPath} | skk=${skkPath}`);

    // 0) Load kuromoji in classic worker
    importScripts(kuromojiPath);
    if (typeof kuromoji === 'undefined') throw new Error('kuromoji undefined after importScripts()');

    // 1) Verify IPADIC blobs are accessible and not HTML (allow already-decompressed bytes)
    const required = [
      'base.dat.gz', 'cc.dat.gz', 'check.dat.gz',
      'tid.dat.gz', 'tid_map.dat.gz', 'tid_pos.dat.gz',
      'unk.dat.gz', 'unk_char.dat.gz', 'unk_compat.dat.gz',
      'unk_invoke.dat.gz', 'unk_map.dat.gz', 'unk_pos.dat.gz',
    ];
    for (const name of required) {
      const url = joinDicPath(ipadicPath, name);
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`[ipadic] ${name} -> ${resp.status} ${resp.statusText}`);
      const buf = await resp.arrayBuffer();
      const u8 = new Uint8Array(buf);
      if (u8.length < 16) throw new Error(`[ipadic] too small: ${url} (${u8.length} bytes)`);
      // If HTML slipped in, it will start with "<!" or "<h"
      const b0 = u8[0], b1 = u8[1];
      const looksHTML = (b0 === 0x3c /* '<' */) && (b1 === 0x21 /* '!' */ || b1 === 0x68 /* 'h' */);
      if (looksHTML) {
        const preview = String.fromCharCode(...u8.slice(0, 32)).replace(/\n/g, ' ');
        throw new Error(`[ipadic] looks like HTML: ${url} -> "${preview}"`);
      }
      log(`[ipadic OK] ${name} (${u8.length} bytes)`);
    }

    // 2) Build kuromoji tokenizer
    tokenizer = await new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: ipadicPath }).build((e, t) => e ? reject(e) : resolve(t));
    });

    // 3) Fetch + decode SKK robustly (UTF-8, else EUC-JP)
    const skkResp = await fetch(skkPath, { cache: 'no-store' });
    if (!skkResp.ok) throw new Error(`SKK fetch -> ${skkResp.status} ${skkResp.statusText}`);
    const skkBuf = await skkResp.arrayBuffer();

    let text = '';
    // try UTF-8 first
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(skkBuf); } catch {}
    const looksHtml = text && /^<!doctype html>/i.test(text.slice(0, 40));
    const looksSkk  = text && /^;;/.test(text.slice(0, 4));
    if (!looksSkk || looksHtml) {
      // fallback to EUC-JP (common for SKK dictionaries)
      try {
        text = new TextDecoder('euc-jp', { fatal: true }).decode(skkBuf);
      } catch {
        throw new Error('SKK decode failed (neither UTF-8 nor EUC-JP)');
      }
    }
    if (!/^;;/.test(text)) throw new Error('SKK header missing after decode');

    // 4) Parse SKK into map
    skkMap = new Map();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line || line[0] === ';') continue;
      // <yomi><spaces>/<cand1/ cand2/ ...>/
      const m = line.match(/^([^\s]+)\s+\/(.+?)\/\s*$/);
      if (!m) continue;

      const yomi = hira(m[1]);
      const arr = skkMap.get(yomi) || [];
      for (const raw of m[2].split('/')) {
        const cand = raw.split(';')[0].trim();   // strip per-candidate comments like ";freq"
        if (cand && !arr.includes(cand)) arr.push(cand);
      }
      if (arr.length) skkMap.set(yomi, arr);
    }

    // debug probes
    log(`[skk] entries=${skkMap.size}`);
    log(`[skk] かける -> ${(skkMap.get('かける') || []).length}`);
    log(`[skk] する   -> ${(skkMap.get('する')   || []).length}`);

    postMessage({ type: 'ready', stats: { entries: skkMap.size } });
  } catch (e) {
    err('init', e);
  }
}

// --- SUGGEST ---
function onSuggest(m) {
  try {
    let reading = m.reading || '';
    let srcText = m.text || '';

    // Extract trailing kana from text if reading not provided
    if (!reading && srcText) {
      const mm = srcText.match(/([ぁ-ゔ゛゜ーァ-ヺ・]+)$/);
      if (mm) reading = hira(mm[1]);   // normalize katakana → hiragana
    }

    log(`[suggest] text="${srcText}" reading="${reading}"`);
    if (!reading || reading.length < 1) return;

    const base = skkMap.get(reading) || [];
    log(`[suggest] candidates=${base.length} for "${reading}"`);
    if (!base.length) return;

    const list = rerank(reading, base).slice(0, 20);
    postMessage({ type: 'suggest', token: { reading }, candidates: list });
  } catch (e) {
    err('suggest', e);
  }
}

// --- COMMIT (simple learning -> rerank) ---
function onCommit(m) {
  try {
    const { reading, kanji } = m;
    if (!reading || !kanji) return;
    const key = reading + '|' + kanji;
    userCounts[key] = (userCounts[key] || 0) + 1;
    postMessage({ type: 'learn', key, value: userCounts[key] });
  } catch (e) {
    err('commit', e);
  }
}

// --- message pump ---
self.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.type === 'init')    return init(m);
  if (m.type === 'suggest') return onSuggest(m);
  if (m.type === 'commit')  return onCommit(m);
});
