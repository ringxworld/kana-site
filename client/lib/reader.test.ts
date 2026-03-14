import { describe, expect, it } from 'vitest';
import { hasJapaneseChars, looksEnglish, parseFuriganaGroups, parsePairs } from './reader';

// ---------------------------------------------------------------------------
// hasJapaneseChars
// ---------------------------------------------------------------------------
describe('hasJapaneseChars', () => {
  it('returns true for hiragana', () => {
    expect(hasJapaneseChars('こんにちは')).toBe(true);
  });

  it('returns true for katakana', () => {
    expect(hasJapaneseChars('カタカナ')).toBe(true);
  });

  it('returns true for kanji', () => {
    expect(hasJapaneseChars('日本語')).toBe(true);
  });

  it('returns false for plain romaji', () => {
    expect(hasJapaneseChars('nihongo')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasJapaneseChars('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// looksEnglish
// ---------------------------------------------------------------------------
describe('looksEnglish', () => {
  it('returns true for an English sentence', () => {
    expect(looksEnglish('Hello, world!')).toBe(true);
  });

  it('returns false for hiragana line', () => {
    expect(looksEnglish('こんにちは')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(looksEnglish('')).toBe(false);
  });

  it('returns false for a single latin letter', () => {
    expect(looksEnglish('a')).toBe(false);
  });

  it('returns true for two or more latin letters', () => {
    expect(looksEnglish('OK')).toBe(true);
  });

  it('returns false for mixed kanji + romaji that has Japanese', () => {
    expect(looksEnglish('日本語 is cool')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parsePairs
// ---------------------------------------------------------------------------
describe('parsePairs', () => {
  it('pairs JP + EN lines', () => {
    const pairs = parsePairs('こんにちは\nHello');
    expect(pairs).toEqual([{ jp: 'こんにちは', en: 'Hello' }]);
  });

  it('allows blank lines between pairs', () => {
    const input = 'こんにちは\nHello\n\nさようなら\nGoodbye';
    expect(parsePairs(input)).toEqual([
      { jp: 'こんにちは', en: 'Hello' },
      { jp: 'さようなら', en: 'Goodbye' },
    ]);
  });

  it('treats next JP line as JP when no English follows', () => {
    const input = '日本語\n仮名\nHello';
    const pairs = parsePairs(input);
    expect(pairs[0]).toEqual({ jp: '日本語', en: '' });
    expect(pairs[1]).toEqual({ jp: '仮名', en: 'Hello' });
  });

  it('handles trailing JP with no EN', () => {
    const pairs = parsePairs('日本語\n');
    expect(pairs).toEqual([{ jp: '日本語', en: '' }]);
  });

  it('returns empty array for empty input', () => {
    expect(parsePairs('')).toEqual([]);
    expect(parsePairs('\n\n\n')).toEqual([]);
  });

  it('handles CRLF line endings', () => {
    const pairs = parsePairs('日本語\r\nJapanese');
    expect(pairs).toEqual([{ jp: '日本語', en: 'Japanese' }]);
  });

  it('handles CR-only line endings', () => {
    const pairs = parsePairs('日本語\rJapanese');
    expect(pairs).toEqual([{ jp: '日本語', en: 'Japanese' }]);
  });

  it('handles multiple consecutive blank lines', () => {
    const input = 'こんにちは\n\n\n\nHello';
    const pairs = parsePairs(input);
    expect(pairs).toEqual([{ jp: 'こんにちは', en: 'Hello' }]);
  });
});

// ---------------------------------------------------------------------------
// parseFuriganaGroups
// ---------------------------------------------------------------------------
describe('parseFuriganaGroups', () => {
  it('extracts base + reading tokens', () => {
    const tokens = parseFuriganaGroups('よくできた(作品 (さくひん))だ。', false);
    const furi = tokens.find((t) => t.t === 'furi');
    expect(furi).toEqual({ t: 'furi', base: '作品', reading: 'さくひん' });
  });

  it('keeps surrounding text tokens', () => {
    const tokens = parseFuriganaGroups('よくできた(作品 (さくひん))だ。', false);
    expect(tokens[0]).toEqual({ t: 'text', v: 'よ' });
  });

  it('keeps parentheses when keepParens is true', () => {
    const tokens = parseFuriganaGroups('(作品 (さくひん))', true);
    expect(tokens[0]).toEqual({ t: 'text', v: '(' });
    expect(tokens[1]).toEqual({ t: 'furi', base: '作品', reading: 'さくひん' });
    expect(tokens[2]).toEqual({ t: 'text', v: ')' });
  });

  it('omits parentheses when keepParens is false', () => {
    const tokens = parseFuriganaGroups('(作品 (さくひん))', false);
    expect(tokens[0]).toEqual({ t: 'furi', base: '作品', reading: 'さくひん' });
    expect(tokens.some((t) => t.t === 'text' && t.v === '(')).toBe(false);
  });

  it('handles multiple furigana groups in one string', () => {
    const tokens = parseFuriganaGroups('(日本 (にほん))(語 (ご))', false);
    const furis = tokens.filter((t) => t.t === 'furi');
    expect(furis).toHaveLength(2);
    expect(furis[0]).toEqual({ t: 'furi', base: '日本', reading: 'にほん' });
    expect(furis[1]).toEqual({ t: 'furi', base: '語', reading: 'ご' });
  });

  it('treats unclosed outer paren as plain text', () => {
    // "(作品 (さくひん)" — missing outer closing paren
    const tokens = parseFuriganaGroups('(作品 (さくひん)', false);
    const text = tokens
      .filter((t) => t.t === 'text')
      .map((t) => (t.t === 'text' ? t.v : ''))
      .join('');
    expect(text).toContain('(');
    expect(tokens.every((t) => t.t !== 'furi')).toBe(true);
  });

  it('returns plain text tokens for string with no furigana', () => {
    const tokens = parseFuriganaGroups('こんにちは', false);
    expect(tokens.every((t) => t.t === 'text')).toBe(true);
    const text = tokens.map((t) => (t.t === 'text' ? t.v : '')).join('');
    expect(text).toBe('こんにちは');
  });

  it('returns empty array for empty string', () => {
    expect(parseFuriganaGroups('', false)).toEqual([]);
  });

  it('trims whitespace from base and reading', () => {
    const tokens = parseFuriganaGroups('( 作品  ( さくひん ))', false);
    const furi = tokens.find((t) => t.t === 'furi');
    expect(furi).toEqual({ t: 'furi', base: '作品', reading: 'さくひん' });
  });
});
