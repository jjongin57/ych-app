// =====================================================
//  그림 그리기 — 손가락으로 쓱쓱, 무지개 붓, 도장 콩콩
// =====================================================
(() => {
  "use strict";
  const { tone, say, rand, pick } = window.Kids;

  const COLORS = [
    ["#ff4d4d", "빨강"], ["#ff9f1c", "주황"], ["#ffd23f", "노랑"], ["#43b649", "초록"],
    ["#2f80ed", "파랑"], ["#9b51e0", "보라"], ["#ff7eb6", "분홍"], ["#6d4c41", "갈색"], ["#222222", "검정"],
  ];
  const STAMPS = ["⭐", "❤️", "🐶", "🐱", "🐰", "🐟", "🌸", "🍎", "🚗", "🦈", "🐳", "🦋"];
  const BRUSH = 18; // 붓 굵기 (css px) — 아이 손가락에 맞게 굵게
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  let root, canvas, ctx, tools, ro;
  let dpr = 1, running = false, built = false;
  let mode = { type: "color", color: COLORS[0][0] };
  let hue = 0;
  const strokes = new Map(); // 손가락마다 따로 (여러 손가락 동시에 그리기)

  // ---------- 도구 버튼 ----------
  function buildTools() {
    const make = (cls, html, label, onPick) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tool " + cls;
      b.innerHTML = html;
      b.setAttribute("aria-label", label);
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); onPick(b); });
      tools.appendChild(b);
      return b;
    };
    const select = (b) => {
      tools.querySelectorAll(".tool").forEach((t) => t.classList.remove("active"));
      b.classList.add("active");
    };
    COLORS.forEach(([color, name], i) => {
      const b = make("swatch", "", name, (btn) => {
        mode = { type: "color", color }; select(btn); say(name);
        tone({ f0: 500 + i * 60, f1: 700 + i * 60, dur: .1 });
      });
      b.style.setProperty("--sw", color);
      if (i === 0) b.classList.add("active");
    });
    make("rainbow", "🌈", "무지개", (btn) => { mode = { type: "rainbow" }; select(btn); say("무지개!"); });
    make("stamp", "⭐", "도장", (btn) => { mode = { type: "stamp" }; select(btn); say("도장 콩콩!"); });
    make("clear", "📄", "새 종이", () => {
      say("새 종이!");
      tone({ type: "triangle", f0: 900, f1: 200, dur: .35, vol: .12 });
      canvas.classList.remove("swoosh"); void canvas.offsetWidth; canvas.classList.add("swoosh");
      setTimeout(paper, 180);
    });
  }

  // ---------- 캔버스 ----------
  function paper() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const nd = Math.min(window.devicePixelRatio || 1, 2);
    const nw = Math.round(w * nd), nh = Math.round(h * nd);
    if (nw === canvas.width && nh === canvas.height) return;
    // 그리던 그림은 그대로 유지
    const old = document.createElement("canvas");
    old.width = canvas.width; old.height = canvas.height;
    if (old.width && old.height) old.getContext("2d").drawImage(canvas, 0, 0);
    dpr = nd;
    canvas.width = nw; canvas.height = nh;
    ctx = canvas.getContext("2d");
    paper();
    if (old.width && old.height) ctx.drawImage(old, 0, 0);
  }

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height)];
  };

  function strokeColor(dist) {
    if (mode.type === "rainbow") {
      hue = (hue + dist * .35) % 360;
      return `hsl(${hue}, 90%, 55%)`;
    }
    return mode.color;
  }

  function line(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    ctx.strokeStyle = strokeColor(d);
    ctx.lineWidth = BRUSH * dpr;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  function stamp(x, y) {
    const size = rand(60, 90) * dpr;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand(-.35, .35));
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pick(STAMPS), 0, 0);
    ctx.restore();
    tone({ f0: rand(500, 800), f1: 1200, dur: .09, vol: .14 });
  }

  // ---------- 터치 ----------
  function onDown(e) {
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const [x, y] = pos(e);
    if (mode.type === "stamp") { stamp(x, y); return; }
    strokes.set(e.pointerId, { x, y });
    line(x, y, x + .1, y + .1); // 톡 찍으면 점
  }

  function onMove(e) {
    const s = strokes.get(e.pointerId);
    if (!s) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) {
      const [x, y] = pos(ev);
      line(s.x, s.y, x, y);
      s.x = x; s.y = y;
    }
  }

  function onUp(e) { strokes.delete(e.pointerId); }

  // ---------- 공개 API ----------
  window.DrawGame = {
    start(el) {
      if (running) return;
      root = el;
      canvas = root.querySelector("canvas");
      tools = root.querySelector(".tools");
      if (!built) { buildTools(); built = true; }
      ctx = canvas.getContext("2d");
      resize();
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
      running = true;
    },
    stop() {
      if (!running) return;
      running = false;
      strokes.clear();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      if (ro) ro.disconnect();
    },
  };
})();
