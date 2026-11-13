// =====================================================
//  까꿍 놀이 — 덤불을 톡 누르면 동물이 "까꿍!"
//  미션: "고양이는 어디 숨었을까?" → 찾으면 축하
//  가끔 덤불이 부스럭거리며 귀가 살짝 보임 (못 찾으면 정답 덤불이 더 자주 부스럭)
// =====================================================
(() => {
  "use strict";
  const { tone, say, pick, josa, missionBar, celebrate } = window.Kids;

  const ANIMALS = [
    ["🐶", "강아지", "멍멍"], ["🐱", "고양이", "야옹"], ["🐷", "돼지", "꿀꿀"], ["🐮", "소", "음메"],
    ["🦆", "오리", "꽥꽥"], ["🐥", "병아리", "삐약삐약"], ["🐑", "양", "매에"], ["🦁", "사자", "어흥"],
    ["🐸", "개구리", "개굴개굴"], ["🐔", "닭", "꼬끼오"], ["🐴", "말", "히히힝"], ["🐭", "쥐", "찍찍"],
    ["🐰", "토끼", "깡충깡충"], ["🐘", "코끼리", "뿌우"], ["🐵", "원숭이", "우끼끼"],
  ];
  const SPOTS = 6;
  const OPEN_MS = 2600;

  let screen, grid, bar, running = false, built = false, rustleTimer = 0, missionTimer = 0, nagTimer = 0;
  let mission = null; // { spot, animal, missStreak }
  let lastMissionName = "";
  const spots = [];

  function setAnimal(spot, a) {
    spot.animal = a;
    spot.el.querySelector(".peek-animal").textContent = a[0];
    spot.el.setAttribute("aria-label", "덤불 " + (spots.indexOf(spot) + 1));
  }

  function newAnimal(spot) {
    if (mission && mission.spot === spot) return; // 정답 친구는 그대로 숨어 있음
    const used = new Set(spots.map((s) => s.animal && s.animal[1]));
    if (mission) used.add(mission.animal[1]);
    let a;
    do { a = pick(ANIMALS); } while (used.has(a[1]) && used.size < ANIMALS.length);
    setAnimal(spot, a);
  }

  // ---------- 미션 ----------
  const ask = () => {
    if (!mission) return;
    say(`${josa(mission.animal[1], "는", "은")} 어디 숨었을까?`);
    clearTimeout(nagTimer);
    nagTimer = setTimeout(ask, 14000);
  };

  function startMission() {
    if (!running) return;
    const closed = spots.filter((s) => !s.open);
    if (!closed.length) { missionTimer = setTimeout(startMission, 1000); return; }
    const spot = pick(closed);
    let a;
    do { a = pick(ANIMALS); } while (a[1] === lastMissionName);
    lastMissionName = a[1];
    // 같은 동물이 다른 덤불에 있으면 바꿔 줌 (정답은 하나뿐)
    const dup = spots.find((s) => s !== spot && s.animal && s.animal[1] === a[1]);
    setAnimal(spot, a);
    mission = { spot, animal: a, misses: 0 };
    if (dup && !dup.open) newAnimal(dup);
    bar.show(a[0], `${a[1]} 찾기`);
    ask();
  }

  function found() {
    const [, name, sound] = mission.animal;
    const spot = mission.spot;
    mission = null;
    clearTimeout(nagTimer);
    bar.hide();
    say(`찾았다! ${name}! ${sound}!`);
    tone({ f0: 400, f1: 1100, dur: .16, vol: .18 });
    setTimeout(() => { if (running) celebrate(screen); }, 1300);
    clearTimeout(spot.timer);
    spot.timer = setTimeout(() => close(spot), 4200);
    missionTimer = setTimeout(startMission, 7000);
  }

  // ---------- 덤불 열고 닫기 ----------
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
    if (mission && mission.spot === spot) return found();
    tone({ f0: 400, f1: 1100, dur: .16, vol: .18 });
    if (mission) {
      mission.misses++;
      // 틀려도 괜찮아요: 이름 알려주고 다시 찾기
      say(`까꿍! ${name}! ${josa(mission.animal[1], "는", "은")} 어디 있지?`);
      if (mission.misses >= 2) setTimeout(() => hint(), 1800); // 두 번 틀리면 정답 덤불이 부스럭
    } else {
      say(`까꿍! ${name}! ${sound}!`);
    }
    spot.timer = setTimeout(() => close(spot), OPEN_MS);
  }

  function close(spot) {
    spot.open = false;
    spot.el.classList.remove("open", "wiggle");
    tone({ type: "triangle", f0: 700, f1: 300, dur: .12, vol: .08 });
    setTimeout(() => { if (!spot.open) newAnimal(spot); }, 400); // 숨은 뒤 다른 친구로 바뀜
  }

  function rustleSpot(s) {
    s.el.classList.remove("rustle"); void s.el.offsetWidth; s.el.classList.add("rustle");
    tone({ type: "triangle", f0: 1200, f1: 900, dur: .05, vol: .05 });
  }
  function hint() {
    if (running && mission && !mission.spot.open) rustleSpot(mission.spot);
  }

  // 닫힌 덤불 하나가 가끔 부스럭 (귀가 살짝) — 미션 중엔 정답 덤불이 자주
  function rustle() {
    if (!running) return;
    if (mission && !mission.spot.open && Math.random() < .6) rustleSpot(mission.spot);
    else {
      const closed = spots.filter((s) => !s.open);
      if (closed.length) rustleSpot(pick(closed));
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
      screen = el;
      grid = el.querySelector(".peek-grid");
      bar = missionBar(el, ask);
      if (!built) { build(); built = true; }
      running = true;
      mission = null;
      rustleTimer = setTimeout(rustle, 1500);
      missionTimer = setTimeout(startMission, 2000);
    },
    stop() {
      if (!running) return;
      running = false;
      clearTimeout(rustleTimer);
      clearTimeout(missionTimer);
      clearTimeout(nagTimer);
      mission = null;
      bar.hide();
      for (const s of spots) {
        clearTimeout(s.timer);
        s.open = false;
        s.el.classList.remove("open", "wiggle", "rustle");
      }
      try { speechSynthesis.cancel(); } catch { /* ignore */ }
    },
  };
})();
