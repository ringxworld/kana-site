import { toHiragana, toKatakana } from 'wanakana';

const KATA_SHIFT = 0x60;

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

export function convertKana(input, { mode = 'hiragana' } = {}) {
  const s = (input ?? '').normalize('NFKC');
  if (mode === 'none') return s;

  if (mode === 'katakana') {
    const base = toKatakana(s);
    return applyKatakanaLongVowels(toKatakanaStr(base));
  }

  return toHiragana(s);
}
