/* tts.js — robust SpeechSynthesis wiring */
(function () {
  const $ = (id) => document.getElementById(id);
  const input = $('input');
  const mode = $('mode');
  const ttsStatus = $('ttsStatus');
  const ttsInitBtn = $('ttsInit');
  const speakBtn = $('speak');
  const voiceSelect = $('voice');

  if (!('speechSynthesis' in window)) {
    if (ttsStatus) ttsStatus.textContent = 'Speech: Not available';
    if (ttsInitBtn) ttsInitBtn.textContent = 'Speech Unsupported';
    if (ttsInitBtn) ttsInitBtn.disabled = true;
    if (speakBtn) speakBtn.disabled = true;
    window.TTS = { speak: () => {} };
    return;
  }

  let voices = [];
  let unlocked = false;
  let ready = false;

  function setTtsStatus(text, state) {
    if (ttsStatus) ttsStatus.textContent = 'Speech: ' + text;
    if (!ttsInitBtn || !speakBtn) return;
    if (state === 'ready') {
      ttsInitBtn.textContent = 'Speech Ready ✓';
      ttsInitBtn.disabled = true;
      speakBtn.disabled = false;
    } else if (state === 'locked') {
      ttsInitBtn.textContent = 'Enable Speech';
      ttsInitBtn.disabled = false;
      speakBtn.disabled = true;
    } else if (state === 'unsupported') {
      ttsInitBtn.textContent = 'Speech Unsupported';
      ttsInitBtn.disabled = true;
      speakBtn.disabled = true;
    } else if (state === 'error') {
      ttsInitBtn.textContent = 'Speech Error';
      ttsInitBtn.disabled = false;
      speakBtn.disabled = true;
    }
  }

  function populateVoices() {
    if (!voiceSelect) return;
    voiceSelect.innerHTML = '';
    voices.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = v.name + (v.lang ? ` (${v.lang})` : '');
      voiceSelect.appendChild(opt);
    });
  }

  function loadVoicesNow() {
    const list = window.speechSynthesis.getVoices();
    if (list && list.length) {
      voices = list;
      populateVoices();
      return true;
    }
    return false;
  }

  function unlockAudioGesture() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
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
        } catch (e) {}
      }, 50);
    } catch (e) {}
  }

  function initTTS() {
    unlockAudioGesture();
    unlocked = true;
    // Attempt to load voices immediately
    if (!loadVoicesNow()) {
      // Some browsers populate asynchronously
      window.speechSynthesis.onvoiceschanged = () => {
        if (loadVoicesNow() && !ready) {
          ready = true;
          setTtsStatus('Ready', 'ready');
        }
      };
    } else {
      ready = true;
      setTtsStatus('Ready', 'ready');
    }
    // Even if voices list is empty (e.g., Firefox edge case), allow speak()
    if (!ready) setTtsStatus('Ready (fallback)', 'ready');
  }

  function getSelectedVoice() {
    const selName = voiceSelect && voiceSelect.value;
    const list = window.speechSynthesis.getVoices();
    if (selName) {
      const m = list.find((v) => v.name === selName);
      if (m) return m;
    }
    return list.find((v) => /ja/i.test(v.lang)) || list[0] || null;
  }

  function speak(text) {
    if (!text) return;
    if (!('speechSynthesis' in window)) {
      setTtsStatus('Not available', 'unsupported');
      return;
    }
    try {
      window.speechSynthesis.cancel();
    } catch {}
    const u = new SpeechSynthesisUtterance(text);
    const v = getSelectedVoice();
    if (v) {
      u.voice = v;
      u.lang = v.lang || 'ja-JP';
    } else {
      u.lang = 'ja-JP';
    }
    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;
    u.onerror = () => setTtsStatus('Playback error', 'error');
    try {
      window.speechSynthesis.resume();
    } catch {}
    window.speechSynthesis.speak(u);
  }

  if (ttsInitBtn) ttsInitBtn.addEventListener('click', initTTS);
  if (speakBtn) speakBtn.addEventListener('click', () => speak((input && input.value) || ''));

  setTtsStatus('Locked (tap Enable)', 'locked');
  // Try to pre-load voices (some browsers fill on first call)
  loadVoicesNow();

  window.TTS = { speak };
})();
