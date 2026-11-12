// =====================================================
//  놀이들이 같이 쓰는 도구: 효과음, 이름 읽어주기
// =====================================================
window.Kids = (() => {
  "use strict";

  let audio;
  function tone({ type = "sine", f0, f1 = f0, dur = .15, vol = .15, delay = 0 }) {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const t = audio.currentTime + delay;
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(.0001, audio.currentTime);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(g); g.connect(audio.destination);
      o.start(t); o.stop(t + dur);
    } catch { /* 소리 없이 진행 */ }
  }

  function say(text) {
    try {
      if (!("speechSynthesis" in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR"; u.rate = .95; u.pitch = 1.2;
      speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  return { tone, say, rand, pick };
})();
