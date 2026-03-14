import { useEffect, useState } from 'react';

const FONT_KEY = 'jp_reader_font';
const FS_KEY = 'jp_reader_fs';
const LH_KEY = 'jp_reader_lh';
const FURI_KEY = 'jp_reader_furi';
const KEEP_PARENS_KEY = 'jp_reader_keep_parens';
const SHOW_ALL_EN_KEY = 'jp_reader_show_all_en';

export const fontMap: Record<string, string> = {
  yuji_mai: '"Yuji Mai","Hina Mincho","Shippori Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
  serif: '"Noto Serif JP","Yu Mincho","MS Mincho",serif',
  sans: '"Noto Sans JP","Noto Sans","Yu Gothic","Meiryo",sans-serif',
  shippori: '"Shippori Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
  hina: '"Hina Mincho","Shippori Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
  yuji: '"Yuji Syuku","Yuji Mai","Shippori Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
  yusei: '"Yusei Magic","Noto Sans JP","Yu Gothic","Meiryo",sans-serif',
  kaisei_decol: '"Kaisei Decol","Shippori Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
  zen_kurenaido: '"Zen Kurenaido","Noto Sans JP","Yu Gothic","Meiryo",sans-serif',
  zin_bokuryu: '"Zin Hena Bokuryu RCF","Yuji Mai","Hina Mincho","Shippori Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
  zin_bokuryu_hard: '"Zin Hena Bokuryu RDF","Zin Hena Bokuryu RCF","Yuji Mai","Hina Mincho","Noto Serif JP","Yu Mincho","MS Mincho",serif',
  system_mincho: '"Yu Mincho","Hiragino Mincho ProN","MS Mincho",serif',
  system_gothic: '"Yu Gothic","Hiragino Kaku Gothic ProN","Meiryo",sans-serif',
};

export interface ReaderPrefs {
  showFuri: boolean;
  setShowFuri: (v: boolean) => void;
  showAllEn: boolean;
  setShowAllEn: (v: boolean) => void;
  keepParens: boolean;
  setKeepParens: (v: boolean) => void;
  fontSelect: string;
  setFontSelect: (v: string) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
  lineHeight: number;
  setLineHeight: (v: number) => void;
}

export function useReaderPrefs(): ReaderPrefs {
  const [showFuri, setShowFuri] = useState(true);
  const [showAllEn, setShowAllEn] = useState(false);
  const [keepParens, setKeepParens] = useState(false);
  const [fontSelect, setFontSelect] = useState('yuji_mai');
  const [fontSize, setFontSize] = useState(20);
  const [lineHeight, setLineHeight] = useState(1.9);

  // Inject custom @font-face declarations once
  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/';
    const styleId = 'reader-fonts';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
@font-face {
  font-family: "Zin Hena Bokuryu RCF";
  src: url("${base}fonts/ZinHenaBokuryu-RCF.otf") format("opentype");
  font-weight: normal; font-style: normal; font-display: swap;
}
@font-face {
  font-family: "Zin Hena Bokuryu RDF";
  src: url("${base}fonts/ZinHenaBokuryu-RDF.otf") format("opentype");
  font-weight: normal; font-style: normal; font-display: swap;
}`;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  // Restore from localStorage on mount
  useEffect(() => {
    const savedFont = localStorage.getItem(FONT_KEY);
    if (savedFont && fontMap[savedFont]) setFontSelect(savedFont);
    const fs = localStorage.getItem(FS_KEY);
    if (fs && !Number.isNaN(Number(fs))) setFontSize(Number(fs));
    const lh = localStorage.getItem(LH_KEY);
    if (lh && !Number.isNaN(Number(lh))) setLineHeight(Number(lh));
    const furi = localStorage.getItem(FURI_KEY);
    if (furi !== null) setShowFuri(furi === '1');
    const kp = localStorage.getItem(KEEP_PARENS_KEY);
    if (kp !== null) setKeepParens(kp === '1');
    const sae = localStorage.getItem(SHOW_ALL_EN_KEY);
    if (sae !== null) setShowAllEn(sae === '1');
  }, []);

  // Sync CSS variables
  useEffect(() => { document.documentElement.style.setProperty('--jp-font', fontMap[fontSelect] || fontMap.yuji_mai); }, [fontSelect]);
  useEffect(() => { document.documentElement.style.setProperty('--fs', `${fontSize}px`); }, [fontSize]);
  useEffect(() => { document.documentElement.style.setProperty('--lh', String(lineHeight)); }, [lineHeight]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(FONT_KEY, fontSelect);
    localStorage.setItem(FS_KEY, String(fontSize));
    localStorage.setItem(LH_KEY, String(lineHeight));
    localStorage.setItem(FURI_KEY, showFuri ? '1' : '0');
    localStorage.setItem(KEEP_PARENS_KEY, keepParens ? '1' : '0');
    localStorage.setItem(SHOW_ALL_EN_KEY, showAllEn ? '1' : '0');
  }, [fontSelect, fontSize, lineHeight, showFuri, keepParens, showAllEn]);

  return { showFuri, setShowFuri, showAllEn, setShowAllEn, keepParens, setKeepParens, fontSelect, setFontSelect, fontSize, setFontSize, lineHeight, setLineHeight };
}
