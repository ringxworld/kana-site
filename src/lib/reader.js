export function hasJapaneseChars(line) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(line);
}

export function looksEnglish(line) {
  const s = line.trim();
  if (!s) return false;
  if (hasJapaneseChars(s)) return false;
  const latin = (s.match(/[A-Za-z]/g) || []).length;
  return latin >= 2;
}

export function parsePairs(input) {
  const lines = input.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const pairs = [];
  let i = 0;

  function nextNonEmpty(idx) {
    while (idx < lines.length && lines[idx].trim() === '') idx += 1;
    return idx;
  }

  while (i < lines.length) {
    i = nextNonEmpty(i);
    if (i >= lines.length) break;

    const jp = lines[i];
    i += 1;

    const j = nextNonEmpty(i);
    if (j >= lines.length) {
      pairs.push({ jp, en: '' });
      break;
    }

    const candidate = lines[j];

    if (looksEnglish(candidate)) {
      pairs.push({ jp, en: candidate });
      i = j + 1;
    } else {
      pairs.push({ jp, en: '' });
      i = j;
    }
  }

  return pairs;
}

export function parseFuriganaGroups(raw, keepParens) {
  const out = [];
  let i = 0;

  while (i < raw.length) {
    if (raw[i] !== '(') {
      out.push({ t: 'text', v: raw[i] });
      i += 1;
      continue;
    }

    const start = i;
    i += 1;

    let base = '';
    let foundReadingStart = false;

    while (i < raw.length) {
      if (raw[i] === '(') {
        foundReadingStart = true;
        break;
      }
      base += raw[i];
      i += 1;
    }

    if (!foundReadingStart) {
      out.push({ t: 'text', v: raw.slice(start, i) });
      continue;
    }

    i += 1;

    let reading = '';
    let readingClosed = false;

    while (i < raw.length) {
      if (raw[i] === ')') {
        readingClosed = true;
        i += 1;
        break;
      }
      reading += raw[i];
      i += 1;
    }

    if (!readingClosed) {
      out.push({ t: 'text', v: raw.slice(start, i) });
      continue;
    }

    if (i >= raw.length || raw[i] !== ')') {
      out.push({ t: 'text', v: raw.slice(start, i) });
      continue;
    }
    i += 1;

    const baseTrim = base.trim();
    const readingTrim = reading.trim();

    if (keepParens) out.push({ t: 'text', v: '(' });
    out.push({ t: 'furi', base: baseTrim, reading: readingTrim });
    if (keepParens) out.push({ t: 'text', v: ')' });
  }

  return out;
}
