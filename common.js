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

  // 받침에 따라 조사 고르기: josa("고양이","는","은") → "고양이는"
  function josa(word, noBatchim, batchim) {
    const c = word.charCodeAt(word.length - 1) - 0xac00;
    const has = c >= 0 && c <= 11171 && c % 28 !== 0;
    return word + (has ? batchim : noBatchim);
  }

  // ---------- 미션 표시줄 (화면 위 '집으로' 옆) ----------
  // show(아이콘, 글, 필요한 개수) / progress(n) / hide(), 누르면 onTap (안내 다시 듣기)
  function missionBar(screen, onTap) {
    const top = screen.querySelector(".game-top");
    const title = top.querySelector(".game-title");
    let el = top.querySelector(".mission");
    if (!el) {
      el = document.createElement("button");
      el.type = "button";
      el.className = "mission";
      el.hidden = true;
      el.innerHTML = '<span class="m-icon"></span><span class="m-text"></span><span class="m-dots"></span>';
      if (title) title.after(el); else top.appendChild(el);
    }
    el.onpointerdown = (e) => { e.preventDefault(); if (onTap) onTap(); };
    let need = 0;
    const dots = (n) => {
      el.querySelector(".m-dots").textContent = need > 1 ? "●".repeat(n) + "○".repeat(need - n) : "";
    };
    const bounce = () => { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); };
    return {
      show(icon, text, n = 1) {
        need = n;
        el.querySelector(".m-icon").textContent = icon;
        el.querySelector(".m-text").textContent = text;
        dots(0);
        el.hidden = false;
        if (title) title.hidden = true;
        bounce();
      },
      progress(n) { dots(n); bounce(); },
      hide() { el.hidden = true; if (title) title.hidden = false; },
    };
  }

  // ---------- 성공 축하: 꽃가루 + 빰빠밤 + "잘했어요!" ----------
  const CHEERS = ["참 잘했어요!", "우와, 최고!", "대단해요!", "잘했어요! 짝짝짝!"];
  const COLORS = ["#ff5c8a", "#ffd23f", "#4cc6ea", "#7ddc6a", "#b39ddb", "#ff9f43"];
  function celebrate(screen, text = pick(CHEERS)) {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ type: "triangle", f0: f, f1: f, dur: i === 3 ? .45 : .14, vol: .16, delay: i * .12 }));
    [0, .12, .24].forEach((d) => tone({ type: "square", f0: 2400, f1: 900, dur: .04, vol: .03, delay: .6 + d })); // 짝짝짝
    say(text);
    const layer = document.createElement("div");
    layer.className = "celebrate";
    const cheer = document.createElement("div");
    cheer.className = "cheer";
    cheer.textContent = text + " 🎉";
    layer.appendChild(cheer);
    for (let i = 0; i < 40; i++) {
      const s = document.createElement("i");
      s.style.cssText = `left:${rand(0, 100)}%;background:${pick(COLORS)};` +
        `--dx:${rand(-80, 80)}px;--r:${rand(-540, 540)}deg;animation-delay:${rand(0, .4)}s;animation-duration:${rand(1.6, 2.4)}s`;
      layer.appendChild(s);
    }
    screen.appendChild(layer);
    setTimeout(() => layer.remove(), 2900);
  }

  return { tone, say, rand, pick, josa, missionBar, celebrate };
})();
