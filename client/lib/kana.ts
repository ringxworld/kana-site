import { toHiragana, toKatakana } from 'wanakana';

const KATA_SHIFT = 0x60;

function toKatakanaStr(s: string) {
  return s.replace(/[\u3041-\u3096]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + KATA_SHIFT));
}

function applyKatakanaLongVowels(kana: string) {
  return kana
    .replace(/アア/g, 'アー')
    .replace(/イイ/g, 'イー')
    .replace(/ウウ/g, 'ウー')
    .replace(/エエ/g, 'エー')
    .replace(/オオ/g, 'オー')
    .replace(/オウ/g, 'オー');
}

export type KanaMode = 'hiragana' | 'katakana' | 'none';

export function convertKana(
  input: string,
  { mode = 'hiragana', imeMode = true }: { mode?: KanaMode; imeMode?: boolean } = {}
) {
  const s = (input ?? '').normalize('NFKC');
  if (mode === 'none') return s;

  if (mode === 'katakana') {
    const base = toKatakana(s, { IMEMode: imeMode });
    return applyKatakanaLongVowels(toKatakanaStr(base));
  }

  return toHiragana(s, { IMEMode: imeMode });
}
