import { describe, expect, it } from 'vitest';
import { convertKana } from './kana';

describe('convertKana', () => {
  it('converts romaji to hiragana by default', () => {
    expect(convertKana('nihongo')).toBe('にほんご');
  });

  it('converts romaji to katakana', () => {
    expect(convertKana('katakana', { mode: 'katakana' })).toBe('カタカナ');
  });

  it('returns original text when mode is none', () => {
    expect(convertKana('abc', { mode: 'none' })).toBe('abc');
  });
});
