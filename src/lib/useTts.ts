import { useCallback, useEffect, useRef, useState } from 'react';

function unlockAudioGesture() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      try {
        osc.stop();
        ctx.close();
      } catch {}
    }, 50);
  } catch {}
}

export type TtsStatus = 'locked' | 'ready' | 'unsupported' | 'error';

export function useTts() {
  const [status, setStatus] = useState<TtsStatus>('locked');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const ready = status === 'ready';
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const loadVoicesNow = useCallback(() => {
    const list = window.speechSynthesis.getVoices();
    if (list && list.length) {
      voicesRef.current = list;
      setVoices(list);
      if (!selectedVoice) setSelectedVoice(list[0].name);
      return true;
    }
    return false;
  }, [selectedVoice]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setStatus('unsupported');
      return;
    }

    if (!loadVoicesNow()) {
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoicesNow();
      };
    }

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [loadVoicesNow]);

  const init = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      setStatus('unsupported');
      return;
    }
    unlockAudioGesture();
    loadVoicesNow();
    setStatus('ready');
  }, [loadVoicesNow]);

  const getSelectedVoice = useCallback(() => {
    const list = window.speechSynthesis.getVoices();
    if (selectedVoice) {
      const found = list.find((v) => v.name === selectedVoice);
      if (found) return found;
    }
    return list.find((v) => /ja/i.test(v.lang)) || list[0] || null;
  }, [selectedVoice]);

  const speak = useCallback(
    (text: string) => {
      if (!text) return;
      if (!('speechSynthesis' in window)) {
        setStatus('unsupported');
        return;
      }
      try {
        window.speechSynthesis.cancel();
      } catch {}
      const utter = new SpeechSynthesisUtterance(text);
      const voice = getSelectedVoice();
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang || 'ja-JP';
      } else {
        utter.lang = 'ja-JP';
      }
      utter.rate = 1;
      utter.pitch = 1;
      utter.volume = 1;
      utter.onerror = () => setStatus('error');
      try {
        window.speechSynthesis.resume();
      } catch {}
      window.speechSynthesis.speak(utter);
    },
    [getSelectedVoice]
  );

  return {
    status,
    voices,
    selectedVoice,
    setSelectedVoice,
    init,
    speak,
    ready,
  };
}
