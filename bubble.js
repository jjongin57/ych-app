// =====================================================
//  비눗방울 — 톡 터뜨리면 안에 있던 친구가 "짠!"
//  빈 곳을 누르면 새 비눗방울이 뽀글
// =====================================================
(() => {
  "use strict";
  const { tone, say, rand, pick } = window.Kids;

  const FRIENDS = [
    ["🐶", "강아지"], ["🐱", "고양이"], ["🐰", "토끼"], ["🐻", "곰돌이"], ["🐷", "돼지"],
    ["🐥", "병아리"], ["🐸", "개구리"], ["🦁", "사자"], ["🐘", "코끼리"], ["🐟", "물고기"],
    ["🍎", "사과"], ["🍌", "바나나"], ["🍓", "딸기"], ["🚗", "자동차"], ["⭐", "별"], ["🎈", "풍선"],
  ];
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  let canvas, ctx, raf = 0, running = false;
  let W = 0, H = 0, dpr = 1, time = 0, last = 0, spawnT = 0;
  let bubbles = [], drops = [], shows = [];

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (w === W && h === H)) return;
    W = w; H = h;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }

  const target = () => Math.max(6, Math.min(14, Math.round((W * H) / 45000)));

  function makeBubble(x, y, r, withFriend = Math.random() < .55) {
    const f = withFriend ? pick(FRIENDS) : null;
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
      shows.push({ emoji: b.emoji, x: b.x, y: b.y, size: b.r * 1.15, t: 0 });
      say(b.name);
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
    for (const b of bubbles) {
      b.y -= b.vy * dt;
      b.x += Math.sin(time * b.wob + b.ph) * 18 * dt;
      if (b.grow !== undefined && b.grow < 1) b.grow = Math.min(1, b.grow + dt * 4);
    }
    bubbles = bubbles.filter((b) => b.y + b.r > -10);
    for (const d of drops) {
      d.life -= dt;
      if (!d.ring) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 300 * dt; }
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
      if (d.ring) {
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
    start(el) {
      if (running) return;
      canvas = el.querySelector("canvas");
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
    },
  };
})();
