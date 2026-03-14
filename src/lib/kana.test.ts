import { describe, expect, it } from 'vitest';
import { convertKana } from './kana';

// ---------------------------------------------------------------------------
// Hiragana mode
// ---------------------------------------------------------------------------
describe('convertKana – hiragana mode', () => {
  it('converts basic romaji', () => {
    expect(convertKana('nihongo')).toBe('にほんご');
  });

  it('defaults to hiragana when no mode supplied', () => {
    expect(convertKana('ka')).toBe('か');
  });

  it('double consonant produces small っ', () => {
    expect(convertKana('katta')).toBe('かった');
    expect(convertKana('zasshi')).toBe('ざっし');
  });

  it('n before non-vowel or at string boundary becomes ん', () => {
    // wanakana converts every standalone n-before-n to ん
    expect(convertKana('nihon')).toBe('にほん');
    expect(convertKana('nani')).toBe('なに');
  });

  it('n before non-vowel becomes ん', () => {
    expect(convertKana('nka')).toBe('んか');
    expect(convertKana('tanki')).toBe('たんき');
  });

  it('digraphs – sha / chi / tsu', () => {
    expect(convertKana('sha')).toBe('しゃ');
    expect(convertKana('chi')).toBe('ち');
    expect(convertKana('tsu')).toBe('つ');
  });

  it('digraphs – kyo / myo / ryu', () => {
    expect(convertKana('kyo')).toBe('きょ');
    expect(convertKana('myo')).toBe('みょ');
    expect(convertKana('ryu')).toBe('りゅ');
  });

  it('passes through already-hiragana unchanged', () => {
    expect(convertKana('にほんご', { mode: 'hiragana' })).toBe('にほんご');
  });

  it('converts katakana to hiragana', () => {
    expect(convertKana('ニホンゴ', { mode: 'hiragana' })).toBe('にほんご');
  });

  it('returns empty string for empty input', () => {
    expect(convertKana('')).toBe('');
  });

  it('normalises full-width ASCII via NFKC before converting', () => {
    // full-width 'ａ' (U+FF41) normalises to 'a' → 'あ'
    expect(convertKana('\uff41')).toBe('あ');
  });

  it('leaves unconvertible latin characters unchanged', () => {
    // lone consonant at end stays as-is
    const result = convertKana('k');
    expect(result).toBe('k');
  });
});

// ---------------------------------------------------------------------------
// Katakana mode
// ---------------------------------------------------------------------------
describe('convertKana – katakana mode', () => {
  it('converts basic romaji to katakana', () => {
    expect(convertKana('katakana', { mode: 'katakana' })).toBe('カタカナ');
  });

  it('double consonant produces small ッ', () => {
    expect(convertKana('katta', { mode: 'katakana' })).toBe('カッタ');
  });

  it('nn produces ン', () => {
    expect(convertKana('nihon', { mode: 'katakana' })).toBe('ニホン');
  });

  it('converts hiragana to katakana', () => {
    expect(convertKana('にほんご', { mode: 'katakana' })).toBe('ニホンゴ');
  });

  it('passes through already-katakana unchanged', () => {
    expect(convertKana('ニホンゴ', { mode: 'katakana' })).toBe('ニホンゴ');
  });

  it('applies long vowel substitution for bare vowel sequences', () => {
    // bare "ou" → オウ → applyKatakanaLongVowels → オー
    expect(convertKana('ou', { mode: 'katakana' })).toBe('オー');
    // consonant+ou stays as-is (コウ, not コー — function only sees bare vowel pairs)
    expect(convertKana('ko', { mode: 'katakana' })).toBe('コ');
  });

  it('digraphs – sha / chi / kyo', () => {
    expect(convertKana('sha', { mode: 'katakana' })).toBe('シャ');
    expect(convertKana('chi', { mode: 'katakana' })).toBe('チ');
    expect(convertKana('kyo', { mode: 'katakana' })).toBe('キョ');
  });

  it('returns empty string for empty input', () => {
    expect(convertKana('', { mode: 'katakana' })).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Mode switching round-trips
// ---------------------------------------------------------------------------
describe('convertKana – mode switching', () => {
  it('hiragana → katakana round-trip', () => {
    const hira = convertKana('nihongo', { mode: 'hiragana' });
    expect(hira).toBe('にほんご');
    const kata = convertKana(hira, { mode: 'katakana' });
    expect(kata).toBe('ニホンゴ');
  });

  it('katakana → hiragana round-trip', () => {
    const kata = convertKana('katakana', { mode: 'katakana' });
    expect(kata).toBe('カタカナ');
    const hira = convertKana(kata, { mode: 'hiragana' });
    expect(hira).toBe('かたかな');
  });

  it('hiragana text under none mode is unchanged', () => {
    expect(convertKana('にほんご', { mode: 'none' })).toBe('にほんご');
  });

  it('katakana text under none mode is unchanged', () => {
    expect(convertKana('ニホンゴ', { mode: 'none' })).toBe('ニホンゴ');
  });
});

// ---------------------------------------------------------------------------
// None mode
// ---------------------------------------------------------------------------
describe('convertKana – none mode', () => {
  it('returns original text unchanged', () => {
    expect(convertKana('abc', { mode: 'none' })).toBe('abc');
  });

  it('returns mixed kana unchanged', () => {
    const mixed = 'にほんごNihongo';
    expect(convertKana(mixed, { mode: 'none' })).toBe(mixed);
  });
});
