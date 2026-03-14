// public/js/ime-worker.js
// Classic Web Worker for JP IME: loads kuromoji, IPADIC, and SKK; serves suggestions.

let tokenizer = null;
let skkMap = new Map(); // Map<reading (hiragana), string[]>
let userCounts = Object.create(null); // "reading|kanji" -> freq

function log(msg) {
  postMessage({ type: 'log', msg });
}
function err(where, e) {
  postMessage({ type: 'error', where, message: String(e && e.stack ? e.stack : e) });
}

// --- helpers ---
function hira(str) {
  return (str || '').replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}
function joinDicPath(dicPath, filename) {
  // dicPath may be an absolute URL or a root-relative path ("/vendor/ipadic/")
  if (/^https?:\/\//i.test(dicPath)) return new URL(filename, dicPath).toString();
  // path join (ensure one trailing slash)
  return (dicPath.endsWith('/') ? dicPath : dicPath + '/') + filename;
}
function rerank(reading, list) {
  const scored = list.map((w) => ({ w, s: userCounts[reading + '|' + w] || 0 }));
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.w);
}

function lastKanaToken(text) {
  if (!tokenizer || !text) return null;
  try {
    const tokens = tokenizer.tokenize(text);
    for (let i = tokens.length - 1; i >= 0; i--) {
      const surface = tokens[i].surface_form || '';
      if (/[\u3041-\u3096\u30A1-\u30FA\u30FC]/.test(surface)) {
        return tokens[i];
      }
    }
  } catch (e) {
    // ignore tokenization failures and fall back to regex tail
  }
  return null;
}

// katakana helper (hiragana → katakana, counterpart to hira())
function kata(str) {
  return (str || '').replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

// --- INIT ---
async function init({ skkPath, kuromojiPath, ipadicPath, userCounts: savedCounts }) {
  if (savedCounts && typeof savedCounts === 'object') {
    Object.assign(userCounts, savedCounts);
    log(`[init] loaded ${Object.keys(savedCounts).length} learned entries`);
  }
  try {
    log(`[init] kuromoji=${kuromojiPath} | ipadic=${ipadicPath} | skk=${skkPath}`);

    // 0) Load kuromoji in classic worker
    importScripts(kuromojiPath);
    if (typeof kuromoji === 'undefined')
      throw new Error('kuromoji undefined after importScripts()');

    // 1) Verify IPADIC blobs are accessible and not HTML (allow already-decompressed bytes)
    const required = [
      'base.dat.gz',
      'cc.dat.gz',
      'check.dat.gz',
      'tid.dat.gz',
      'tid_map.dat.gz',
      'tid_pos.dat.gz',
      'unk.dat.gz',
      'unk_char.dat.gz',
      'unk_compat.dat.gz',
      'unk_invoke.dat.gz',
      'unk_map.dat.gz',
      'unk_pos.dat.gz',
    ];
    for (const name of required) {
      const url = joinDicPath(ipadicPath, name);
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`[ipadic] ${name} -> ${resp.status} ${resp.statusText}`);
      const buf = await resp.arrayBuffer();
      const u8 = new Uint8Array(buf);
      if (u8.length < 16) throw new Error(`[ipadic] too small: ${url} (${u8.length} bytes)`);
      // If HTML slipped in, it will start with "<!" or "<h"
      const b0 = u8[0],
        b1 = u8[1];
      const looksHTML = b0 === 0x3c /* '<' */ && (b1 === 0x21 /* '!' */ || b1 === 0x68); /* 'h' */
      if (looksHTML) {
        const preview = String.fromCharCode(...u8.slice(0, 32)).replace(/\n/g, ' ');
        throw new Error(`[ipadic] looks like HTML: ${url} -> "${preview}"`);
      }
      log(`[ipadic OK] ${name} (${u8.length} bytes)`);
    }

    // 2) Build kuromoji tokenizer
    tokenizer = await new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: ipadicPath }).build((e, t) => (e ? reject(e) : resolve(t)));
    });

    // 3) Fetch + decode SKK robustly (UTF-8, else EUC-JP)
    const skkResp = await fetch(skkPath, { cache: 'no-store' });
    if (!skkResp.ok) throw new Error(`SKK fetch -> ${skkResp.status} ${skkResp.statusText}`);
    const skkBuf = await skkResp.arrayBuffer();

    let text = '';
    // try UTF-8 first
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(skkBuf);
    } catch {}
    const looksHtml = text && /^<!doctype html>/i.test(text.slice(0, 40));
    const looksSkk = text && /^;;/.test(text.slice(0, 4));
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
        const cand = raw.split(';')[0].trim(); // strip per-candidate comments like ";freq"
        if (cand && !arr.includes(cand)) arr.push(cand);
      }
      if (arr.length) skkMap.set(yomi, arr);
    }

    // debug probes
    log(`[skk] entries=${skkMap.size}`);
    log(`[skk] かける -> ${(skkMap.get('かける') || []).length}`);
    log(`[skk] する   -> ${(skkMap.get('する') || []).length}`);

    postMessage({ type: 'ready', stats: { entries: skkMap.size } });
  } catch (e) {
    err('init', e);
  }
}

// --- SUGGEST ---
function onSuggest(m) {
  try {
    let reading = m.reading || '';
    const srcText = m.text || '';
    let replaceLength = 0;
    let surface = '';

    // 1) If no explicit reading, try tokenizer for last kana token
    if (!reading && srcText) {
      const token = lastKanaToken(srcText);
      if (token) {
        surface = token.surface_form || '';
        replaceLength = surface.length;
        reading = token.reading ? hira(token.reading) : surface;
      } else {
        const tail = srcText.match(/([ぁ-ゖーァ-ヿ・]+)$/); // any JP kana tail
        if (tail) {
          reading = tail[1];
          surface = reading;
          replaceLength = reading.length;
        }
      }
    }

    // 2) Normalize: if tail contains katakana, capture it as the katakana variant then
    //    convert to hiragana for dictionary lookup.
    const hasKatakana =
      /[\u30A1-\u30FA\u30FC]/.test(reading) || /[\u30A1-\u30FA\u30FC]/.test(surface);
    // kataVariant is the katakana form to offer as a candidate when in katakana mode
    const kataVariant = hasKatakana ? surface || reading : null;
    if (hasKatakana) {
      reading = hira(reading);
    }

    // 3) Proceed only if hiragana is present after normalization
    if (!/[\u3041-\u3096]/.test(reading)) {
      postMessage({ type: 'log', msg: `[suggest] no hiragana tail in "${srcText}"` });
      return;
    }

    if (!replaceLength && reading) replaceLength = reading.length;

    postMessage({ type: 'log', msg: `[suggest] reading(hira)="${reading}"` });

    const base = skkMap.get(reading) || [];

    // In katakana mode the reading itself is a valid candidate; always show it even if
    // the dictionary has no entries (e.g. foreign loanwords not in SKK).
    if (!base.length && !kataVariant) {
      postMessage({ type: 'log', msg: `[suggest] candidates=0 for "${reading}"` });
      return;
    }

    let list = rerank(reading, base).slice(0, 20);

    // Prepend katakana variant (e.g. ニホンゴ) as the first option so the user can
    // keep katakana without converting to kanji.
    if (kataVariant && !list.includes(kataVariant)) {
      list = [kataVariant, ...list.slice(0, 19)];
    }

    // Also offer the hiragana form so users can convert katakana → hiragana.
    const hiraVariant = kata(reading) !== reading ? reading : null;
    if (hiraVariant && !list.includes(hiraVariant)) {
      list = [list[0], hiraVariant, ...list.slice(1, 19)];
    }

    postMessage({ type: 'suggest', token: { reading, replaceLength }, candidates: list });
  } catch (e) {
    postMessage({ type: 'error', where: 'suggest', message: String(e) });
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
  if (m.type === 'init') return init(m);
  if (m.type === 'suggest') return onSuggest(m);
  if (m.type === 'commit') return onCommit(m);
});
