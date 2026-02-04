/* kana.js — emits ん only on "nn" or "n'". */
(function () {
  const MAP = new Map(
    Object.entries({
      a: 'あ',
      i: 'い',
      u: 'う',
      e: 'え',
      o: 'お',
      ka: 'か',
      ki: 'き',
      ku: 'く',
      ke: 'け',
      ko: 'こ',
      kya: 'きゃ',
      kyu: 'きゅ',
      kyo: 'きょ',
      sa: 'さ',
      shi: 'し',
      su: 'す',
      se: 'せ',
      so: 'そ',
      sha: 'しゃ',
      shu: 'しゅ',
      sho: 'しょ',
      ta: 'た',
      chi: 'ち',
      tsu: 'つ',
      te: 'て',
      to: 'と',
      cha: 'ちゃ',
      chu: 'ちゅ',
      cho: 'ちょ',
      na: 'な',
      ni: 'に',
      nu: 'ぬ',
      ne: 'ね',
      no: 'の',
      nya: 'にゃ',
      nyu: 'にゅ',
      nyo: 'にょ',
      ha: 'は',
      hi: 'ひ',
      fu: 'ふ',
      he: 'へ',
      ho: 'ほ',
      hya: 'ひゃ',
      hyu: 'ひゅ',
      hyo: 'ひょ',
      ma: 'ま',
      mi: 'み',
      mu: 'む',
      me: 'め',
      mo: 'も',
      mya: 'みゃ',
      myu: 'みゅ',
      myo: 'みょ',
      ya: 'や',
      yu: 'ゆ',
      yo: 'よ',
      ra: 'ら',
      ri: 'り',
      ru: 'る',
      re: 'れ',
      ro: 'ろ',
      rya: 'りゃ',
      ryu: 'りゅ',
      ryo: 'りょ',
      wa: 'わ',
      wi: 'うぃ',
      we: 'うぇ',
      wo: 'を',
      ga: 'が',
      gi: 'ぎ',
      gu: 'ぐ',
      ge: 'げ',
      go: 'ご',
      gya: 'ぎゃ',
      gyu: 'ぎゅ',
      gyo: 'ぎょ',
      za: 'ざ',
      ji: 'じ',
      zu: 'ず',
      ze: 'ぜ',
      zo: 'ぞ',
      ja: 'じゃ',
      ju: 'じゅ',
      jo: 'じょ',
      da: 'だ',
      de: 'で',
      do: 'ど',
      ba: 'ば',
      bi: 'び',
      bu: 'ぶ',
      be: 'べ',
      bo: 'ぼ',
      bya: 'びゃ',
      byu: 'びゅ',
      byo: 'びょ',
      pa: 'ぱ',
      pi: 'ぴ',
      pu: 'ぷ',
      pe: 'ぺ',
      po: 'ぽ',
      pya: 'ぴゃ',
      pyu: 'ぴゅ',
      pyo: 'ぴょ',
      fa: 'ふぁ',
      fi: 'ふぃ',
      fe: 'ふぇ',
      fo: 'ふぉ',
      va: 'ゔぁ',
      vi: 'ゔぃ',
      vu: 'ゔ',
      ve: 'ゔぇ',
      vo: 'ゔぉ',
      xa: 'ぁ',
      xi: 'ぃ',
      xu: 'ぅ',
      xe: 'ぇ',
      xo: 'ぉ',
      xtsu: 'っ',
      ltsu: 'っ',
    })
  );
  const KEYS = [...MAP.keys()].sort((a, b) => b.length - a.length);
  const KATA_SHIFT = 0x60;
  const isConsonant = (ch) => /[bcdfghjklmnpqrstvwxyz]/.test(ch);

  function toKatakanaStr(s) {
    return s.replace(/[\u3041-\u3096]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) + KATA_SHIFT)
    );
  }
  function applyKatakanaLongVowels(kana) {
    return kana
      .replace(/アア/g, 'アー')
      .replace(/イイ/g, 'イー')
      .replace(/ウウ/g, 'ウー')
      .replace(/エエ/g, 'エー')
      .replace(/オオ/g, 'オー')
      .replace(/オウ/g, 'オー');
  }

  function convert(input, { mode = 'hiragana' } = {}) {
    const toKatakana = mode === 'katakana';
    const s = (input ?? '').normalize('NFKC').toLowerCase();
    const out = [];
    let i = 0;

    while (i < s.length) {
      const ch = s[i];

      // ん only on "nn" or "n'"
      if (ch === 'n') {
        const look = s[i + 1] ?? '';
        if (look === 'n') {
          // "nn" -> ん
          out.push(toKatakana ? 'ン' : 'ん');
          i += 2;
          continue;
        }
        if (look === "'") {
          // "n'" -> ん
          out.push(toKatakana ? 'ン' : 'ん');
          i += 2;
          continue;
        }
        // Single 'n' does NOT emit ん; fall through to allow "na/ni/nya..." etc.
        // We do not consume it yet; let the longest-match handle (e.g., "na" starts at i).
      }

      // sokuon for double consonants (not 'nn' which we handled above)
      if (isConsonant(ch) && ch !== 'n' && ch === s[i + 1]) {
        out.push(toKatakana ? 'ッ' : 'っ');
        i += 1;
        continue;
      }

      // longest-key match from current i
      let matched = false;
      for (const key of KEYS) {
        if (s.startsWith(key, i)) {
          const hira = MAP.get(key);
          out.push(toKatakana ? toKatakanaStr(hira) : hira);
          i += key.length;
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // passthrough and advance by one character to avoid infinite loop on stray 'n'
      out.push(s[i]);
      i += 1;
    }

    let result = out.join('');
    if (toKatakana) result = applyKatakanaLongVowels(result);
    return result;
  }

  window.Kana = { convert };
})();
