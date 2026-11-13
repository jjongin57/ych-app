// =====================================================
//  비눗방울 — 톡 터뜨리면 안에 있던 친구가 "짠!"
//  빈 곳을 누르면 새 비눗방울이 뽀글
// =====================================================
(() => {
  "use strict";
  const { tone, say, rand, pick, josa, missionBar, celebrate } = window.Kids;

  const FRIENDS = [
    ["🐶", "강아지"], ["🐱", "고양이"], ["🐰", "토끼"], ["🐻", "곰돌이"], ["🐷", "돼지"],
    ["🐥", "병아리"], ["🐸", "개구리"], ["🦁", "사자"], ["🐘", "코끼리"], ["🐟", "물고기"],
    ["🍎", "사과"], ["🍌", "바나나"], ["🍓", "딸기"], ["🚗", "자동차"], ["⭐", "별"], ["🎈", "풍선"],
  ];
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  let canvas, ctx, raf = 0, running = false;
  let W = 0, H = 0, dpr = 1, time = 0, last = 0, spawnT = 0;
  let bubbles = [], drops = [], shows = [];
  let screen, bar;

  // ---------- 미션: "강아지 찾아서 3번 터뜨리기" ----------
  const NEED = 3;
  const COUNT = ["하나", "둘", "셋"];
  let mission = null, nextMissionT = 0, lastProgress = 0, nagT = 0, lastName = "";
  const ask = () => mission && say(`${josa(mission.name, "가", "이")} 어디 있지? 찾아서 톡 터뜨려 보자!`);
  function startMission() {
    let f;
    do { f = pick(FRIENDS); } while (f[1] === lastName);
    lastName = f[1];
    mission = { emoji: f[0], name: f[1], got: 0 };
    lastProgress = time; nagT = 12;
    bar.show(f[0], `${f[1]} 찾기`, NEED);
    ask();
    // 지금 화면에 떠 있는 방울 두 개를 바로 찾는 친구로 (기다리지 않게)
    bubbles.filter((b) => b.y > b.r && b.y < H - b.r && b.r < 80)
      .sort(() => Math.random() - .5).slice(0, 2)
      .forEach((b) => { b.emoji = f[0]; b.name = f[1]; });
  }
  const isTarget = (b) => mission && b.name === mission.name;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (w === W && h === H)) return;
    W = w; H = h;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }

  const target = () => Math.max(6, Math.min(14, Math.round((W * H) / 45000)));

  function makeBubble(x, y, r, withFriend = Math.random() < .55) {
    // 미션 중이면 찾는 친구가 자주 나오게
    const f = withFriend ? (mission && Math.random() < .4 ? [mission.emoji, mission.name] : pick(FRIENDS)) : null;
    return {
      x, y, r, vy: rand(28, 55) * (r > 80 ? .7 : 1), ph: rand(0, 6), wob: rand(.8, 1.6),
      hue: rand(0, 360), emoji: f && f[0], name: f && f[1], born: time,
    };
  }

  function spawnFromBottom() {
    const big = Math.random() < .1;
    const r = big ? rand(85, 110) : rand(30, 62);
    bubbles.push(makeBubble(rand(r, Math.max(r + 1, W - r)), H + r + rand(0, 40), r, big ? false : undefined));
  }

  // ---------- 터뜨리기 ----------
  function pop(b) {
    bubbles.splice(bubbles.indexOf(b), 1);
    const f = Math.max(250, 950 - b.r * 6); // 작은 방울일수록 높은 소리
    tone({ f0: f, f1: f * 1.7, dur: .08, vol: .2 });
    tone({ type: "triangle", f0: f * 2, f1: f * 2.5, dur: .05, vol: .08, delay: .03 });
    for (let i = 0; i < 14; i++) { // 물방울 튀기
      const a = (i / 14) * Math.PI * 2 + rand(-.2, .2), s = rand(80, 200);
      drops.push({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .5, max: .5, hue: b.hue });
    }
    drops.push({ ring: true, x: b.x, y: b.y, r: b.r, life: .35, max: .35, hue: b.hue });
    if (b.emoji) {
      const found = isTarget(b);
      shows.push({ emoji: b.emoji, x: b.x, y: b.y, size: b.r * (found ? 1.6 : 1.15), t: 0 });
      if (found) {
        mission.got++;
        lastProgress = time; nagT = 12;
        bar.progress(mission.got);
        for (let i = 0; i < 12; i++) { // 반짝반짝 별
          const a = rand(0, Math.PI * 2), s = rand(60, 160);
          drops.push({ star: true, x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: .9, max: .9, hue: 48 });
        }
        if (mission.got >= NEED) {
          mission = null;
          bar.hide();
          celebrate(screen);
          nextMissionT = 4.5;
        } else {
          say(`${b.name} ${COUNT[mission.got - 1]}!`);
          tone({ type: "triangle", f0: 660 + mission.got * 120, f1: 1000 + mission.got * 150, dur: .2, vol: .15, delay: .05 });
        }
      } else say(b.name);
    }
    if (b.r > 80) { // 큰 방울은 작은 방울 여러 개로
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const nb = makeBubble(b.x + Math.cos(a) * b.r * .5, b.y + Math.sin(a) * b.r * .5, rand(26, 38));
        nb.vy = rand(40, 70);
        bubbles.push(nb);
      }
    }
  }

  function onDown(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (Math.hypot(x - b.x, y - b.y) < b.r + 12) return pop(b);
    }
    // 빈 곳: 새 비눗방울 뽀글
    const nb = makeBubble(x, y, rand(26, 42));
    nb.vy = rand(45, 70);
    nb.grow = 0;
    bubbles.push(nb);
    tone({ f0: 300, f1: 700, dur: .12, vol: .1 });
  }

  // ---------- 움직임 ----------
  function update(dt) {
    time += dt;
    spawnT -= dt;
    if (spawnT <= 0 && bubbles.length < target()) { spawnFromBottom(); spawnT = rand(.3, .9); }
    if (mission) {
      // 찾는 친구가 화면에 늘 2개쯤은 있게
      if (bubbles.filter(isTarget).length < 2 && Math.random() < dt * 1.5) {
        const r = rand(36, 58);
        const nb = makeBubble(rand(r, Math.max(r + 1, W - r)), H + r, r, false);
        nb.emoji = mission.emoji; nb.name = mission.name;
        bubbles.push(nb);
      }
      if ((nagT -= dt) <= 0) { nagT = 12; ask(); } // 한참 못 찾으면 다시 알려주기
    } else if ((nextMissionT -= dt) <= 0) startMission();
    for (const b of bubbles) {
      b.y -= b.vy * dt;
      b.x += Math.sin(time * b.wob + b.ph) * 18 * dt;
      if (b.grow !== undefined && b.grow < 1) b.grow = Math.min(1, b.grow + dt * 4);
    }
    bubbles = bubbles.filter((b) => b.y + b.r > -10);
    for (const d of drops) {
      d.life -= dt;
      if (!d.ring) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += (d.star ? 150 : 300) * dt; }
    }
    drops = drops.filter((d) => d.life > 0);
    for (const s of shows) { s.t += dt; s.y += 20 * dt; }
    shows = shows.filter((s) => s.t < 1.8);
  }

  // ---------- 그리기 ----------
  function drawBubble(b) {
    const k = b.grow !== undefined ? b.grow : 1;
    const wob = Math.sin(time * 3 + b.ph) * .04;
    const rx = b.r * k * (1 + wob), ry = b.r * k * (1 - wob);
    if (rx < 1) return;
    if (isTarget(b) && time - lastProgress > 5) {
      // 한참 못 찾으면 찾는 친구 방울이 반짝반짝 빛남
      ctx.save();
      ctx.globalAlpha = .45 + .35 * Math.sin(time * 6);
      ctx.fillStyle = "#fff3a0";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * k * 1.25, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (b.emoji) {
      ctx.save();
      ctx.globalAlpha = .95;
      ctx.font = `${b.r * k * 1.05}px ${EMOJI_FONT}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.emoji, b.x, b.y + b.r * .05);
      ctx.restore();
    }
    const h = (b.hue + time * 40) % 360; // 무지갯빛이 천천히 변함
    const g = ctx.createRadialGradient(b.x - rx * .3, b.y - ry * .35, rx * .1, b.x, b.y, Math.max(rx, ry));
    g.addColorStop(0, "rgba(255,255,255,0.08)");
    g.addColorStop(.72, `hsla(${h}, 90%, 85%, 0.12)`);
    g.addColorStop(.9, `hsla(${h + 70}, 90%, 72%, 0.5)`);
    g.addColorStop(1, `hsla(${h + 150}, 95%, 88%, 0.85)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(b.x, b.y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.85)"; // 반짝 하이라이트
    ctx.beginPath(); ctx.ellipse(b.x - rx * .38, b.y - ry * .42, rx * .18, ry * .1, -.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(b.x - rx * .1, b.y - ry * .6, rx * .05, 0, Math.PI * 2); ctx.fill();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#bfe6ff");
    bg.addColorStop(.6, "#e9f4ff");
    bg.addColorStop(1, "#ffe1ef");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // 풀밭
    ctx.fillStyle = "#9be08a";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H - 26 - Math.sin(x * .03) * 8);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

    for (const b of bubbles) drawBubble(b);

    for (const d of drops) {
      const a = d.life / d.max;
      if (d.star) {
        ctx.globalAlpha = a;
        ctx.font = `${Math.round(14 + a * 10)}px ${EMOJI_FONT}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("⭐", d.x, d.y);
        ctx.globalAlpha = 1;
      } else if (d.ring) {
        ctx.strokeStyle = `hsla(${d.hue}, 90%, 75%, ${a})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (1 + (1 - a) * .6), 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = `hsla(${d.hue}, 90%, 80%, ${a})`;
        ctx.beginPath(); ctx.arc(d.x, d.y, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    for (const s of shows) { // 터진 자리에서 친구가 '짠!' 커졌다가 사라짐
      const t = s.t;
      const scale = t < .25 ? .5 + (t / .25) * .9 : t < .45 ? 1.4 - ((t - .25) / .2) * .4 : 1;
      ctx.save();
      ctx.globalAlpha = t > 1.3 ? Math.max(0, 1 - (t - 1.3) / .5) : 1;
      ctx.font = `${s.size * scale}px ${EMOJI_FONT}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(s.emoji, s.x, s.y);
      ctx.restore();
    }
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(.05, (ts - last) / 1000);
    last = ts;
    resize();
    update(dt);
    render();
    raf = requestAnimationFrame(loop);
  }

  window.BubbleGame = {
    // 테스트용: 시뮬레이션을 sec초만큼 빨리 돌리기 / 찾는 친구 방울 터뜨리기
    advance: (sec) => { if (!running) return; for (let t = 0; t < sec; t += 1 / 30) update(1 / 30); render(); },
    popTarget: () => { const b = bubbles.find(isTarget); if (b) pop(b); return !!b; },
    start(el) {
      if (running) return;
      screen = el;
      canvas = el.querySelector("canvas");
      bar = missionBar(el, ask);
      mission = null; nextMissionT = 2.5;
      ctx = canvas.getContext("2d");
      W = H = 0;
      resize();
      bubbles = []; drops = []; shows = [];
      for (let i = 0; i < target(); i++) { // 처음부터 화면에 몇 개 떠 있게
        const r = rand(30, 60);
        bubbles.push(makeBubble(rand(r, Math.max(r + 1, W - r)), rand(H * .2, H - r), r));
      }
      canvas.addEventListener("pointerdown", onDown);
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
    stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      mission = null; bar.hide();
      try { speechSynthesis.cancel(); } catch { /* ignore */ }
    },
  };
})();
