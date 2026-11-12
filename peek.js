// =====================================================
//  까꿍 놀이 — 덤불을 톡 누르면 동물이 "까꿍!"
//  가끔 덤불이 부스럭거리며 귀가 살짝 보임
// =====================================================
(() => {
  "use strict";
  const { tone, say, pick } = window.Kids;

  const ANIMALS = [
    ["🐶", "강아지", "멍멍"], ["🐱", "고양이", "야옹"], ["🐷", "돼지", "꿀꿀"], ["🐮", "소", "음메"],
    ["🦆", "오리", "꽥꽥"], ["🐥", "병아리", "삐약삐약"], ["🐑", "양", "매에"], ["🦁", "사자", "어흥"],
    ["🐸", "개구리", "개굴개굴"], ["🐔", "닭", "꼬끼오"], ["🐴", "말", "히히힝"], ["🐭", "쥐", "찍찍"],
    ["🐰", "토끼", "깡충깡충"], ["🐘", "코끼리", "뿌우"], ["🐵", "원숭이", "우끼끼"],
  ];
  const SPOTS = 6;
  const OPEN_MS = 2600;

  let grid, running = false, built = false, rustleTimer = 0;
  const spots = [];

  function newAnimal(spot) {
    const used = new Set(spots.map((s) => s.animal && s.animal[1]));
    let a;
    do { a = pick(ANIMALS); } while (used.has(a[1]) && used.size < ANIMALS.length);
    spot.animal = a;
    spot.el.querySelector(".peek-animal").textContent = a[0];
    spot.el.setAttribute("aria-label", "덤불 " + (spots.indexOf(spot) + 1));
  }

  function open(spot) {
    const [, name, sound] = spot.animal;
    if (spot.open) { // 이미 나와 있으면 한 번 더 인사
      spot.el.classList.remove("wiggle"); void spot.el.offsetWidth; spot.el.classList.add("wiggle");
      say(sound + "!");
      tone({ f0: 600, f1: 900, dur: .12 });
      clearTimeout(spot.timer);
      spot.timer = setTimeout(() => close(spot), OPEN_MS);
      return;
    }
    spot.open = true;
    spot.el.classList.remove("rustle");
    spot.el.classList.add("open");
    tone({ f0: 400, f1: 1100, dur: .16, vol: .18 });
    say(`까꿍! ${name}! ${sound}!`);
    spot.timer = setTimeout(() => close(spot), OPEN_MS);
  }

  function close(spot) {
    spot.open = false;
    spot.el.classList.remove("open", "wiggle");
    tone({ type: "triangle", f0: 700, f1: 300, dur: .12, vol: .08 });
    setTimeout(() => { if (!spot.open) newAnimal(spot); }, 400); // 숨은 뒤 다른 친구로 바뀜
  }

  // 닫힌 덤불 하나가 가끔 부스럭 (귀가 살짝)
  function rustle() {
    if (!running) return;
    const closed = spots.filter((s) => !s.open);
    if (closed.length) {
      const s = pick(closed);
      s.el.classList.remove("rustle"); void s.el.offsetWidth; s.el.classList.add("rustle");
      tone({ type: "triangle", f0: 1200, f1: 900, dur: .05, vol: .05 });
    }
    rustleTimer = setTimeout(rustle, 2500 + Math.random() * 2500);
  }

  function build() {
    for (let i = 0; i < SPOTS; i++) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "spot";
      el.innerHTML = '<span class="peek-animal"></span><span class="bush"></span><span class="peek-bubble">까꿍!</span>';
      const spot = { el, open: false, animal: null, timer: 0 };
      el.addEventListener("pointerdown", (e) => { e.preventDefault(); open(spot); });
      el.addEventListener("animationend", (e) => { if (e.animationName === "rustle") el.classList.remove("rustle"); });
      grid.appendChild(el);
      spots.push(spot);
    }
    spots.forEach(newAnimal);
  }

  window.PeekGame = {
    start(el) {
      if (running) return;
      grid = el.querySelector(".peek-grid");
      if (!built) { build(); built = true; }
      running = true;
      rustleTimer = setTimeout(rustle, 1500);
    },
    stop() {
      if (!running) return;
      running = false;
      clearTimeout(rustleTimer);
      for (const s of spots) {
        clearTimeout(s.timer);
        s.open = false;
        s.el.classList.remove("open", "wiggle", "rustle");
      }
    },
  };
})();
