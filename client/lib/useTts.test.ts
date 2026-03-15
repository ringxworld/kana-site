import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTts } from './useTts';

// ---------------------------------------------------------------------------
// jsdom stubs for Web Speech API
// ---------------------------------------------------------------------------

class MockSpeechSynthesisUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  lang = 'ja-JP';
  rate = 1;
  pitch = 1;
  volume = 1;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

// Install/remove on the global object
function installUtteranceStub() {
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: MockSpeechSynthesisUtterance,
    writable: true,
    configurable: true,
  });
}
function removeUtteranceStub() {
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

function makeSpeechSynthesisMock() {
  let _onvoiceschanged: (() => void) | null = null;
  const voices: SpeechSynthesisVoice[] = [
    {
      name: 'Google US English',
      lang: 'en-US',
      default: true,
      localService: false,
      voiceURI: 'Google US English',
    },
    {
      name: 'Google 日本語',
      lang: 'ja-JP',
      default: false,
      localService: false,
      voiceURI: 'Google 日本語',
    },
  ] as SpeechSynthesisVoice[];

  const synth = {
    getVoices: vi.fn(() => voices),
    speak: vi.fn(),
    cancel: vi.fn(),
    resume: vi.fn(),
    get onvoiceschanged() {
      return _onvoiceschanged;
    },
    set onvoiceschanged(cb: (() => void) | null) {
      _onvoiceschanged = cb;
    },
    triggerVoicesChanged() {
      _onvoiceschanged?.();
    },
  };
  return { synth, voices };
}

function installSynth(synth: ReturnType<typeof makeSpeechSynthesisMock>['synth']) {
  Object.defineProperty(window, 'speechSynthesis', {
    value: synth,
    writable: true,
    configurable: true,
  });
}

function removeSynth() {
  // Delete so that `'speechSynthesis' in window` returns false
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).speechSynthesis;
  } catch {
    Object.defineProperty(window, 'speechSynthesis', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTts', () => {
  beforeEach(() => {
    installUtteranceStub();
  });

  afterEach(() => {
    removeUtteranceStub();
    vi.restoreAllMocks();
  });

  it('starts with status locked', () => {
    const { synth } = makeSpeechSynthesisMock();
    synth.getVoices.mockReturnValue([]);
    installSynth(synth);

    const { result } = renderHook(() => useTts());
    expect(result.current.status).toBe('locked');
    expect(result.current.ready).toBe(false);
  });

  it('sets status to unsupported when speechSynthesis is absent', () => {
    removeSynth();
    const { result } = renderHook(() => useTts());
    expect(result.current.status).toBe('unsupported');
  });

  it('loads voices on mount and defaults to the Japanese voice', () => {
    const { synth, voices } = makeSpeechSynthesisMock();
    installSynth(synth);

    const { result } = renderHook(() => useTts());
    expect(result.current.voices).toEqual(voices);
    // Should pick the ja-JP voice (voices[1]) not the first English voice
    expect(result.current.selectedVoice).toBe(voices[1].name);
    expect(result.current.hasJaVoice).toBe(true);
  });

  it('loads voices via onvoiceschanged and defaults to the Japanese voice', () => {
    const { synth, voices } = makeSpeechSynthesisMock();
    synth.getVoices.mockReturnValueOnce([]); // empty on first call
    installSynth(synth);

    const { result } = renderHook(() => useTts());
    expect(result.current.voices).toHaveLength(0);

    act(() => {
      synth.triggerVoicesChanged();
    });

    expect(result.current.voices).toEqual(voices);
    expect(result.current.selectedVoice).toBe(voices[1].name);
  });

  it('hasJaVoice is false when no Japanese voice is available', () => {
    const { synth } = makeSpeechSynthesisMock();
    synth.getVoices.mockReturnValue([
      {
        name: 'Google US English',
        lang: 'en-US',
        default: true,
        localService: false,
        voiceURI: 'Google US English',
      } as SpeechSynthesisVoice,
    ]);
    installSynth(synth);

    const { result } = renderHook(() => useTts());
    expect(result.current.hasJaVoice).toBe(false);
    // Falls back to list[0] when no Japanese voice
    expect(result.current.selectedVoice).toBe('Google US English');
  });

  it('init() sets status to ready', () => {
    const { synth } = makeSpeechSynthesisMock();
    installSynth(synth);

    const { result } = renderHook(() => useTts());
    act(() => {
      result.current.init();
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.ready).toBe(true);
  });

  it('setSelectedVoice updates selectedVoice without re-running loadVoicesNow', () => {
    const { synth, voices } = makeSpeechSynthesisMock();
    installSynth(synth);

    const { result } = renderHook(() => useTts());
    const callsBefore = synth.getVoices.mock.calls.length;

    act(() => {
      result.current.setSelectedVoice(voices[1].name);
    });

    expect(result.current.selectedVoice).toBe(voices[1].name);
    // loadVoicesNow must NOT be called again just because selectedVoice changed
    expect(synth.getVoices.mock.calls.length).toBe(callsBefore);
  });

  it('speak() calls speechSynthesis.speak', () => {
    const { synth } = makeSpeechSynthesisMock();
    installSynth(synth);

    const { result } = renderHook(() => useTts());
    act(() => {
      result.current.init();
    });
    act(() => {
      result.current.speak('にほんご');
    });

    expect(synth.speak).toHaveBeenCalledOnce();
    const utter = synth.speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utter.text).toBe('にほんご');
  });

  it('speak() does nothing for empty text', () => {
    const { synth } = makeSpeechSynthesisMock();
    installSynth(synth);

    const { result } = renderHook(() => useTts());
    act(() => {
      result.current.init();
    });
    act(() => {
      result.current.speak('');
    });

    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('speak() uses the selected voice', () => {
    const { synth, voices } = makeSpeechSynthesisMock();
    installSynth(synth);

    const { result } = renderHook(() => useTts());
    act(() => {
      result.current.init();
    });
    act(() => {
      result.current.setSelectedVoice(voices[1].name);
    });
    act(() => {
      result.current.speak('テスト');
    });

    const utter = synth.speak.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utter.voice).toBe(voices[1]);
  });
});
