declare module 'kuroshiro' {
  interface ConvertOptions {
    mode?: 'normal' | 'spaced' | 'okurigana' | 'furigana';
    to?: 'hiragana' | 'katakana' | 'romaji';
    romajiSystem?: 'nippon' | 'passport' | 'hepburn';
    delimiter_start?: string;
    delimiter_end?: string;
  }

  class Kuroshiro {
    init(analyzer: unknown): Promise<void>;
    convert(str: string, options?: ConvertOptions): Promise<string>;
  }

  export = Kuroshiro;
}

declare module 'kuroshiro-analyzer-kuromoji' {
  class KuromojiAnalyzer {
    constructor(options?: { dictPath?: string });
  }
  export = KuromojiAnalyzer;
}
