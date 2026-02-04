import { describe, expect, it } from 'vitest';
import { parseFuriganaGroups, parsePairs } from './reader.js';

describe('parsePairs', () => {
  it('pairs JP + EN lines and allows blanks', () => {
    const input = 'こんにちは\nHello\n\nさようなら\nGoodbye';
    const pairs = parsePairs(input);
    expect(pairs).toEqual([
      { jp: 'こんにちは', en: 'Hello' },
      { jp: 'さようなら', en: 'Goodbye' },
    ]);
  });

  it('treats next JP line as JP when no English', () => {
    const input = '日本語\n仮名\nHello';
    const pairs = parsePairs(input);
    expect(pairs[0]).toEqual({ jp: '日本語', en: '' });
    expect(pairs[1]).toEqual({ jp: '仮名', en: 'Hello' });
  });
});

describe('parseFuriganaGroups', () => {
  it('extracts base + reading tokens', () => {
    const tokens = parseFuriganaGroups('よくできた(作品 (さくひん))だ。', false);
    const furi = tokens.find((t) => t.t === 'furi');
    expect(furi).toEqual({ t: 'furi', base: '作品', reading: 'さくひん' });
  });

  it('keeps parentheses when requested', () => {
    const tokens = parseFuriganaGroups('(作品 (さくひん))', true);
    expect(tokens[0]).toEqual({ t: 'text', v: '(' });
    expect(tokens[1]).toEqual({ t: 'furi', base: '作品', reading: 'さくひん' });
    expect(tokens[2]).toEqual({ t: 'text', v: ')' });
  });
});
