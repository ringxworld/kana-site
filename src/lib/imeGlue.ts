export type ImeHandle = {
  isReady: boolean;
  requestSuggest: (text?: string) => void;
  commitPick: (kanji: string) => void;
  clearCandidates: () => void;
  cleanup?: () => void;
};

export type CandidateState = {
  reading: string;
  candidates: string[];
  replaceLength: number;
  selectedIdx: number;
};

const LEARN_KEY = 'kana_ime_learn';

function loadLearnedCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LEARN_KEY);
    if (raw) return JSON.parse(raw) as Record<string, number>;
  } catch {}
  return {};
}

function saveLearnedCounts(counts: Record<string, number>) {
  try {
    localStorage.setItem(LEARN_KEY, JSON.stringify(counts));
  } catch {}
}

export function initIme({
  textarea,
  baseUrl,
  onCandidates,
}: {
  textarea: HTMLTextAreaElement;
  baseUrl: string;
  onCandidates?: (state: CandidateState | null) => void;
}): ImeHandle | null {
  if (!textarea) return null;

  let imeWorker: Worker | null = null;
  const learnedCounts = loadLearnedCounts();

  const ime: ImeHandle = {
    isReady: false,
    requestSuggest: () => {},
    commitPick: () => {},
    clearCandidates: () => {},
  };

  const queue: Array<{ type: 'suggest'; text: string }> = [];
  ime.requestSuggest = (text) => {
    const payload = { type: 'suggest' as const, text: text ?? textarea.value ?? '' };
    if (!ime.isReady) {
      queue.push(payload);
      return;
    }
    imeWorker?.postMessage(payload);
  };

  window.IME = ime;

  let currentReading = '';
  let currentList: string[] = [];
  let currentIndex = -1;
  let currentReplaceLength = 0;

  ime.clearCandidates = () => {
    currentReading = '';
    currentList = [];
    currentIndex = -1;
    currentReplaceLength = 0;
    onCandidates?.(null);
  };

  function notifyCandidates() {
    if (!currentList.length) {
      onCandidates?.(null);
      return;
    }
    onCandidates?.({
      reading: currentReading,
      candidates: currentList,
      replaceLength: currentReplaceLength,
      selectedIdx: currentIndex,
    });
  }

  function updateCandidates(reading: string, candidates: string[], replaceLength = 0) {
    currentReading = reading || '';
    currentList = candidates || [];
    currentIndex = currentList.length ? 0 : -1;
    currentReplaceLength = replaceLength;
    notifyCandidates();
  }

  ime.commitPick = (kanji: string) => {
    const v = textarea.value;
    if (currentReplaceLength > 0 && v.length >= currentReplaceLength) {
      const start = v.length - currentReplaceLength;
      textarea.value = v.slice(0, start) + kanji;
    } else {
      const match = v.match(/([ぁ-ゖー]+)$/);
      if (match) {
        const hira = match[1];
        textarea.value = v.slice(0, v.length - hira.length) + kanji;
      } else {
        textarea.value = v + kanji;
      }
    }
    if (ime.isReady && currentReading && imeWorker) {
      imeWorker.postMessage({ type: 'commit', reading: currentReading, kanji });
    }
    ime.clearCandidates();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  };

  function onKeydown(e: KeyboardEvent) {
    if (!currentList.length) return;
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      currentIndex = (currentIndex + 1) % currentList.length;
      notifyCandidates();
    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      currentIndex = (currentIndex - 1 + currentList.length) % currentList.length;
      notifyCandidates();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentIndex >= 0 && currentList[currentIndex]) ime.commitPick(currentList[currentIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      ime.clearCandidates();
    }
  }

  textarea.addEventListener('keydown', onKeydown);

  try {
    const workerUrl = new URL(`${baseUrl}js/ime-worker.js`, window.location.href);
    imeWorker = new Worker(workerUrl, { type: 'classic' });
  } catch {
    return {
      ...ime,
      cleanup: () => {
        textarea.removeEventListener('keydown', onKeydown);
      },
    };
  }

  const SKK_URL = new URL(`${baseUrl}dict/SKK-JISYO.L`, window.location.href).href;
  const KUROMOJI_URL = new URL(`${baseUrl}vendor/kuromoji/kuromoji.js`, window.location.href).href;
  const IPADIC_URL = new URL(`${baseUrl}vendor/ipadic/`, window.location.href).pathname;

  imeWorker.onmessage = (e: MessageEvent) => {
    const msg = e.data || {};
    if (msg.type === 'ready') {
      ime.isReady = true;
      for (const p of queue.splice(0)) imeWorker?.postMessage(p);
      return;
    }
    if (msg.type === 'suggest') {
      updateCandidates(
        msg.token?.reading || '',
        msg.candidates || [],
        msg.token?.replaceLength || 0
      );
      return;
    }
    if (msg.type === 'learn') {
      learnedCounts[msg.key] = msg.value;
      saveLearnedCounts(learnedCounts);
      return;
    }
  };

  imeWorker.postMessage({
    type: 'init',
    skkPath: SKK_URL,
    kuromojiPath: KUROMOJI_URL,
    ipadicPath: IPADIC_URL,
    userCounts: learnedCounts,
  });

  return {
    ...ime,
    cleanup: () => {
      textarea.removeEventListener('keydown', onKeydown);
      imeWorker?.terminate?.();
    },
  };
}
