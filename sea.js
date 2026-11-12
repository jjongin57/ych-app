// =====================================================
//  바다 체험 — 픽셀아트 바다 친구들
//  터치 1번: 움찔 + 이름 / 2번: 아야! / 3번: 울면서 도망
// =====================================================
(() => {
  "use strict";

  // ---------- 유틸 ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hexToRgb = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  const OUTLINE = "#1b2440";
  const EYE_COL = { K: "#14182b", W: "#ffffff", B: "#7fd3ff" };
  // 눈 모양 (2x3 픽셀). 오른쪽을 보는 기준
  const EYES = {
    open:   ["KW", "KK", "KK"],
    blink:  ["..", "KK", ".."],
    squint: ["K.", ".K", "K."], // >
    cry:    ["KK", "BB", ".B"], // ㅠ
  };

  // ---------- 픽셀 스프라이트 만들기 ----------
  // 도형으로 그린 뒤 → 색을 팔레트로 딱 맞추고 → 진한 외곽선을 둘러서 픽셀아트 느낌을 냄
  function makeSprite(w, h, draw, outline = OUTLINE) {
    const W = w + 2, H = h + 2;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const cols = new Set();
    const fill = (col) => { cols.add(col); g.fillStyle = col; };
    const api = {
      ell(cx, cy, rx, ry, col) {
        if (rx <= 0 || ry <= 0) return;
        fill(col); g.beginPath();
        g.ellipse(cx + 1, cy + 1, rx, ry, 0, 0, Math.PI * 2); g.fill();
      },
      poly(pts, col) {
        fill(col); g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x + 1, y + 1) : g.moveTo(x + 1, y + 1)));
        g.closePath(); g.fill();
      },
      rect(x, y, rw, rh, col) {
        fill(col); g.fillRect(Math.round(x) + 1, Math.round(y) + 1, rw, rh);
      },
      clear(x, y, rw, rh) { g.clearRect(Math.round(x) + 1, Math.round(y) + 1, rw, rh); },
      atop(fn) { // 이미 그려진 곳 위에만 칠하기 (무늬, 배 색)
        g.globalCompositeOperation = "source-atop"; fn();
        g.globalCompositeOperation = "source-over";
      },
    };
    draw(api);

    const img = g.getImageData(0, 0, W, H), d = img.data;
    const pal = [...cols].map(hexToRgb);
    const solid = new Uint8Array(W * H);
    for (let p = 0, i = 0; p < W * H; p++, i += 4) {
      if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
      let best = pal[0], bd = Infinity;
      for (const q of pal) {
        const dr = d[i] - q[0], dg = d[i + 1] - q[1], db = d[i + 2] - q[2];
        const dd = dr * dr + dg * dg + db * db;
        if (dd < bd) { bd = dd; best = q; }
      }
      d[i] = best[0]; d[i + 1] = best[1]; d[i + 2] = best[2]; d[i + 3] = 255;
      solid[p] = 1;
    }
    const o = hexToRgb(outline);
    const mask = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (solid[p]) { mask[p] = 1; continue; }
        if ((x > 0 && solid[p - 1]) || (x < W - 1 && solid[p + 1]) ||
            (y > 0 && solid[p - W]) || (y < H - 1 && solid[p + W])) {
          const i = p * 4;
          d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; d[i + 3] = 255;
          mask[p] = 1;
        }
      }
    }
    g.putImageData(img, 0, 0);
    return { canvas: c, w: W, h: H, mask };
  }
  const pair = (def) => [0, 1].map((f) => makeSprite(def.w, def.h, (g) => def.draw(g, f)));

  // ---------- 상어 공통 설계도 ----------
  function shark(o) {
    const { L, r, dorsal, pec } = o;
    const m = Math.ceil(Math.max(r + dorsal + 1, r * 1.7 + 2)); // 몸 중심선
    const w = o.width || L;
    const h = Math.ceil(m + r + pec + 2);
    const draw = (g, f) => {
      const s = f ? 1 : -1; // 꼬리 흔들기
      g.poly([[L * .15, m - 1], [1, m - r * 1.7 + s], [L * .08, m]], o.fin);
      g.poly([[L * .15, m + 1], [3, m + r * 1.1 + s], [L * .08, m]], o.fin);
      g.poly([[L * .36, m - r * .8], [L * .12, m - 1.5], [L * .12, m + 1.5], [L * .36, m + r * .8]], o.back);
      g.poly([[L * .40, m - r + 1.5], [L * .47, m - r - dorsal], [L * .57, m - r + 1.5]], o.back);
      g.poly([[L * .21, m - r * .45], [L * .24, m - r * .45 - 2.5], [L * .28, m - r * .45]], o.back);
      g.ell(L * .53, m, L * .36, r, o.back);
      if (o.head) o.head(g, f, m);
      else g.ell(L * .82, m + .5, L * .16, r * .72, o.back);
      g.atop(() => {
        g.ell(L * .58, m + r * .95, L * .46, r * .62, o.belly);
        if (o.pattern) o.pattern(g, f, m);
        for (let i = 0; i < 3; i++) g.rect(L * .68 + i * 2, m - 1, 1, 3, o.fin); // 아가미
        g.rect(L * .84, m + r * .4, o.mouthW || 3, 1, o.mouth || "#5b2a3a");
      });
      g.poly([[L * .6, m + r * .3], [L * .5 - pec * .6, m + r + pec], [L * .67, m + r * .55]], o.fin);
      if (o.extra) o.extra(g, f, m);
    };
    const eyes = o.eyes ? o.eyes(m) : [[Math.round(L * .8), Math.round(m - r * .55)]];
    return { w, h, draw, eyes };
  }

  // ---------- 바다 친구들 ----------
  function buildSpecies() {
    const list = [];
    const add = (id, name, kind, def, opts = {}) => {
      const sp = {
        id, name, kind,
        frames: pair(def), eyes: def.eyes,
        speed: [10, 16], weight: 1, max: 2, fps: 4, bobA: 2, bobF: 1.2,
        ...opts,
      };
      sp.layer = sp.frames[0].w * sp.frames[0].h;
      list.push(sp);
      return sp;
    };

    // ===== 상어들 =====
    add("gw", "백상아리", "shark",
      shark({ L: 60, r: 7, dorsal: 8, pec: 5, back: "#7d91a6", fin: "#5f7389", belly: "#f5f6f2" }),
      { speed: [12, 18], weight: 2, max: 1, fps: 3 });

    add("blue", "청상어", "shark",
      shark({ L: 64, r: 5, dorsal: 5, pec: 7, back: "#2d6fd9", fin: "#2156ad", belly: "#eaf3ff" }),
      { speed: [14, 22], weight: 2, max: 1, fps: 3 });

    const hL = 56, hr = 6, hc = "#8796a6";
    add("hammer", "귀상어", "shark",
      shark({
        L: hL, r: hr, dorsal: 7, pec: 4, back: hc, fin: "#68778a", belly: "#eef0f2",
        head: (g, f, m) => {
          g.ell(hL * .8, m + .5, hL * .1, hr * .7, hc);
          g.ell(hL * .9, m, 2.5, hr + 4, hc); // 망치 머리
        },
        eyes: (m) => [[Math.round(hL * .9) - 1, m - hr - 3], [Math.round(hL * .9) - 1, m + hr + 1]],
      }),
      { speed: [11, 17], weight: 2, max: 1, fps: 3 });

    add("saw", "톱상어", "shark",
      shark({
        L: 46, width: 64, r: 5, dorsal: 4, pec: 3, back: "#b89a68", fin: "#977b4f", belly: "#f4e8cb",
        extra: (g, f, m) => { // 톱 주둥이 + 수염
          const x0 = 42;
          g.rect(x0, m, 64 - x0, 2, "#c9ab73");
          for (let x = x0 + 2; x < 63; x += 3) {
            g.rect(x, m - 1, 1, 1, "#f3e7c9");
            g.rect(x, m + 2, 1, 1, "#f3e7c9");
          }
          g.rect(x0 + 8, m + 2, 1, 4 + f, "#c9ab73");
        },
      }),
      { speed: [9, 14], weight: 2, max: 1, fps: 3 });

    add("whale", "고래상어", "shark",
      shark({
        L: 84, r: 11, dorsal: 6, pec: 5, back: "#3a5c86", fin: "#2b4870", belly: "#e3ecf4",
        mouth: "#22324a", mouthW: 9,
        head: (g, f, m) => g.ell(84 * .8, m + 1, 84 * .17, 11 * .85, "#3a5c86"),
        pattern: (g, f, m) => { // 하얀 점무늬
          let row = 0;
          for (let y = m - 11; y < m + 2; y += 3, row++)
            for (let x = 18 + (row % 2) * 2; x < 76; x += 4) g.rect(x, y, 1, 1, "#d4e6f7");
        },
        eyes: (m) => [[71, Math.round(m - 4)]],
      }),
      { speed: [6, 9], weight: 1, max: 1, fps: 2, bobA: 1.5 });

    add("tiger", "뱀상어", "shark",
      shark({
        L: 60, r: 7, dorsal: 6, pec: 5, back: "#8a9a8c", fin: "#6a7a6c", belly: "#f0f1ea",
        pattern: (g, f, m) => { for (let x = 18; x < 44; x += 4) g.rect(x, m - 7, 2, 5, "#647566"); },
      }),
      { speed: [11, 16], weight: 2, max: 1, fps: 3 });

    // ===== 물고기와 친구들 =====
    add("clown", "흰동가리", "fish", {
      w: 20, h: 13, eyes: [[16, 4]],
      draw: (g, f) => {
        const s = f ? 1 : -1, o = "#ff8a1f";
        g.poly([[5, 6.5], [0, 1.5 + s], [0, 11.5 + s]], o);
        g.poly([[6, 2.5], [10, 0], [15, 2.5]], o);
        g.poly([[8, 10.5], [11, 13], [14, 10.5]], o);
        g.ell(11, 6.5, 8, 5, o);
        g.atop(() => {
          g.rect(5, 0, 4, 13, OUTLINE); g.rect(6, 0, 2, 13, "#ffffff");
          g.rect(11, 0, 4, 13, OUTLINE); g.rect(12, 0, 2, 13, "#ffffff");
          g.rect(0, 0, 1, 13, OUTLINE);
        });
        g.poly([[15, 8], [13, 10.5], [17, 9.5]], "#f06f0c");
      },
    }, { speed: [14, 22], weight: 2, fps: 6, bobA: 3 });

    add("tang", "블루탱", "fish", {
      w: 22, h: 14, eyes: [[17, 4]],
      draw: (g, f) => {
        const s = f ? 1 : -1, b = "#2f63d6", y = "#ffd23f";
        g.poly([[5, 7], [0, 2 + s], [0, 12 + s]], y);
        g.poly([[5, 3], [12, 0], [18, 3]], b);
        g.poly([[6, 11], [12, 14], [17, 11]], b);
        g.ell(12, 7, 9, 5.5, b);
        g.atop(() => {
          g.ell(10, 4.5, 7, 1.4, OUTLINE);
          g.ell(6, 7.5, 2.6, 2.6, OUTLINE);
          g.ell(14, 9.5, 5, 1.2, "#5d8bff");
        });
        g.poly([[15, 8], [13, 10], [17, 9.5]], y);
      },
    }, { speed: [14, 20], weight: 2, fps: 6, bobA: 3 });

    const puffer = add("puffer", "복어", "fish", {
      w: 18, h: 14, eyes: [[12, 4]],
      draw: (g, f) => {
        const s = f ? 1 : -1;
        g.poly([[4, 7], [0, 4 + s], [0, 10 + s]], "#e0b34a");
        g.ell(10, 7, 7.5, 6.2, "#f2cf63");
        g.atop(() => {
          g.ell(10, 12, 8, 3.5, "#fff3d1");
          for (const [x, y] of [[6, 3], [9, 2], [5, 6], [8, 5]]) g.rect(x, y, 1, 1, "#b07d34");
          g.rect(16, 8, 1, 1, "#c0504a");
        });
        g.poly([[10, 8], [7, 10.5 + s * .5], [10, 10]], "#e0b34a");
      },
    }, { speed: [6, 10], weight: 2, fps: 4, bobA: 2 });
    // 복어는 놀라면 빵빵해짐
    puffer.puffFrames = pair({
      w: 27, h: 27,
      draw: (g, f) => {
        const cx = 13.5, cy = 13.5;
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2 + f * .1;
          g.poly([
            [cx + Math.cos(a - .13) * 10, cy + Math.sin(a - .13) * 10],
            [cx + Math.cos(a) * 13, cy + Math.sin(a) * 13],
            [cx + Math.cos(a + .13) * 10, cy + Math.sin(a + .13) * 10],
          ], "#e0b34a");
        }
        g.ell(cx, cy, 10.5, 10.5, "#f2cf63");
        g.atop(() => {
          g.ell(cx, cy + 8, 12, 6, "#fff3d1");
          for (const [x, y] of [[8, 6], [12, 4], [6, 10], [10, 9]]) g.rect(x, y, 1, 1, "#b07d34");
          g.rect(21, 14, 2, 2, "#c0504a");
        });
      },
    });
    puffer.puffEyes = [[17, 8]];

    add("octo", "문어", "octo", {
      w: 22, h: 23, eyes: [[7, 6], [13, 6, true]],
      draw: (g, f) => {
        const c = "#e45a4c";
        for (let i = 0; i < 5; i++) {
          const x0 = 3 + i * 4;
          for (let k = 0; k < 11; k++) {
            g.ell(x0 + Math.sin(k * .55 + f * Math.PI + i * 1.3) * 1.6, 12 + k * .9,
              Math.max(.8, 1.9 - k * .1), 1.2, c);
          }
        }
        g.ell(11, 7.5, 7.5, 7, c);
        g.atop(() => {
          g.ell(8, 3.5, 2.2, 1.5, "#ff9a8a");
          g.rect(5, 10, 2, 1, "#ff9aa6"); g.rect(16, 10, 2, 1, "#ff9aa6");
          g.rect(10, 11, 2, 1, "#8a2a2a");
        });
      },
    }, { speed: [5, 8], weight: 1.5, fps: 3, bobA: 5, noFlip: true });

    add("jelly", "해파리", "jelly", {
      w: 16, h: 22, eyes: [[4, 4], [10, 4, true]],
      draw: (g, f) => {
        g.ell(8, 8, 7 - f * .6, 7 + f * .5, "#f7a8d8");
        g.clear(0, 9, 16, 14);
        g.atop(() => {
          g.ell(5, 3, 2, 1.2, "#ffe0f2");
          g.rect(7, 7, 2, 1, "#c0508f");
        });
        for (let t = 0; t < 4; t++)
          for (let k = 0; k < 12; k++)
            g.rect(3 + t * 3 + Math.round(Math.sin(k * .6 + f * 2 + t)), 9 + k, 1, 1, "#f2b3e0");
      },
    }, { speed: [2, 4], weight: 1.5, fps: 2, bobA: 8, bobF: .7, noFlip: true, alpha: .9 });

    add("turtle", "바다거북", "turtle", {
      w: 32, h: 18, eyes: [[28, 6]],
      draw: (g, f) => {
        const s = "#8cc265";
        g.poly([[6, 11], [1, 14 + f], [5, 15 + f], [9, 12]], s);
        g.ell(14, 7.5, 11.5, 6.5, "#6c8b3e");
        g.atop(() => {
          g.rect(2, 11.5, 25, 4, "#d8c278");
          for (const [x, y, rx] of [[9, 4.5, 3], [15, 4, 3], [21, 5, 2.5], [12, 8.5, 3], [18, 8.5, 2.5]])
            g.ell(x, y, rx, 1.8, "#89a84f");
        });
        g.rect(22, 7, 4, 3, s);
        g.ell(27.5, 8, 4, 3.2, s);
        g.atop(() => g.rect(30, 9.5, 2, 1, "#3d5a2a"));
        g.poly(f ? [[19, 10], [24, 17], [27, 15], [22, 10]] : [[19, 10], [15, 17], [19, 17], [23, 11]], s);
      },
    }, { speed: [7, 11], weight: 1.5, max: 1, fps: 2.5, bobA: 3 });

    add("crab", "꽃게", "crab", {
      w: 27, h: 18, eyes: [[9, 0], [16, 0, true]],
      draw: (g, f) => {
        const c = "#e8553f";
        for (const sd of [-1, 1]) {
          for (let k = 0; k < 3; k++) {
            const lift = (f + k) % 2;
            const x1 = 13 + sd * 5, x2 = 13 + sd * (11 + k);
            g.poly([[x1, 9 + k * 2], [x2, 11 + k * 2 - lift], [x2, 13 + k * 2 - lift], [x1, 11 + k * 2]], c);
          }
          g.poly([[13 + sd * 5, 8], [13 + sd * 9, 5], [13 + sd * 10, 7], [13 + sd * 6, 10]], c);
          g.ell(13 + sd * 10, 4, 3, 3, c);
        }
        g.clear(3, 1, 1, 3); g.clear(23, 1, 1, 3); // 집게 홈
        g.rect(10, 2, 1, 5, c); g.rect(16, 2, 1, 5, c); // 눈자루
        g.ell(13, 9.5, 8, 4.5, c);
        g.atop(() => {
          g.ell(11, 7, 3, 1.2, "#ff8a70");
          g.rect(12, 11, 3, 1, "#7a2020");
        });
      },
    }, { speed: [6, 10], weight: 1.5, fps: 5, bobA: 0, noFlip: true });

    return list;
  }

  // ---------- 바닥 장식 ----------
  function buildDecor() {
    const coral = makeSprite(14, 16, (g) => {
      const c = "#ff6f91", l = "#ffa3b8";
      g.rect(6, 6, 2, 10, c); g.rect(2, 4, 2, 8, c); g.rect(10, 2, 2, 9, c);
      g.rect(2, 10, 5, 2, c); g.rect(7, 9, 4, 2, c);
      g.ell(3, 4, 1.6, 1.6, l); g.ell(11, 2, 1.6, 1.6, l); g.ell(7, 6, 1.6, 1.6, l);
    });
    const dome = makeSprite(16, 8, (g) => {
      g.ell(8, 9, 8, 8.5, "#ffa94d");
      g.atop(() => {
        for (let y = 1; y < 8; y += 2)
          for (let x = (y % 4 === 1 ? 0 : 2); x < 16; x += 4) g.rect(x, y, 2, 1, "#e0812a");
      });
    });
    const rock = makeSprite(18, 10, (g) => {
      g.ell(8, 7, 8, 6, "#66768a"); g.ell(13, 8, 5, 4, "#55657a");
      g.atop(() => g.ell(6, 4, 3, 1.5, "#8a9bb0"));
    });
    const star = makeSprite(9, 9, (g) => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 1.8 : 4.4;
        pts.push([4.5 + Math.cos(a) * rr, 4.5 + Math.sin(a) * rr]);
      }
      g.poly(pts, "#ff7a59");
      g.atop(() => g.rect(4, 4, 1, 1, "#ffc0a8"));
    });
    return [coral, dome, rock, star, coral, rock];
  }

  // ---------- 소리 ----------
  let audio;
  function tone({ type = "sine", f0, f1, dur, vol = .15, vib = 0 }) {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const t = audio.currentTime;
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      if (vib) {
        const l = audio.createOscillator(), lg = audio.createGain();
        l.frequency.value = vib; lg.gain.value = f0 * .06;
        l.connect(lg); lg.connect(o.frequency);
        l.start(t); l.stop(t + dur);
      }
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(g); g.connect(audio.destination);
      o.start(t); o.stop(t + dur);
    } catch { /* 소리 없이 */ }
  }
  const sfx = {
    boing: () => tone({ f0: 520, f1: 980, dur: .14, vol: .18 }),
    ouch:  () => tone({ type: "triangle", f0: 880, f1: 420, dur: .2, vol: .18 }),
    cry: () => {
      tone({ type: "triangle", f0: 760, f1: 520, dur: .35, vol: .14, vib: 9 });
      setTimeout(() => tone({ type: "triangle", f0: 700, f1: 300, dur: .7, vol: .14, vib: 9 }), 330);
    },
    pop: () => tone({ f0: 300, f1: 900, dur: .08, vol: .1 }),
  };
  function say(text) {
    try {
      if (!("speechSynthesis" in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR"; u.rate = .95; u.pitch = 1.2;
      speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }

  // ---------- 상태 ----------
  let SPECIES = null, DECOR = null;
  let canvas, ctx, hintEl;
  const low = document.createElement("canvas");
  const lctx = low.getContext("2d");
  let bg, W = 0, H = 0, P = 4, dpr = 1, sandH = 14, sandTop = [], seaFloor = 0, target = 8;
  let weeds = [], rays = [];
  let creatures = [], particles = [], respawns = [];
  let time = 0, last = 0, raf = 0, running = false, bubbleT = 0;

  // ---------- 화면 크기 맞추기 ----------
  function layout() {
    const cssW = canvas.clientWidth || window.innerWidth;
    const cssH = canvas.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    P = clamp(Math.floor(Math.min(cssW, cssH) / 130), 2, 8); // 픽셀 하나의 크기
    W = Math.ceil(cssW / P); H = Math.ceil(cssH / P);
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    low.width = W; low.height = H;
    lctx.imageSmoothingEnabled = false;

    sandH = Math.max(12, Math.round(H * .13));
    sandTop = [];
    for (let x = 0; x < W; x++)
      sandTop[x] = H - sandH + Math.round(Math.sin(x * .07) * 2 + Math.sin(x * .19 + 1) * 1);
    seaFloor = H - sandH - 3;
    target = clamp(Math.round((W * H) / 3800), 6, 11);

    let s = 7919;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    weeds = [];
    const wn = Math.max(4, Math.round(W / 26));
    for (let i = 0; i < wn; i++) {
      weeds.push({
        x: Math.floor(rnd() * W), h: Math.round(H * (.12 + rnd() * .22)), ph: rnd() * 6,
        c: rnd() < .5 ? ["#2f9e57", "#17643a"] : ["#5cbf5f", "#2b7a3a"],
      });
    }
    rays = [{ x: W * .1, w: 10 }, { x: W * .42, w: 16 }, { x: W * .74, w: 8 }];
    buildBg(rnd);
  }

  function buildBg(rnd) {
    bg = document.createElement("canvas");
    bg.width = W; bg.height = H;
    const g = bg.getContext("2d");
    const img = g.createImageData(W, H), d = img.data;
    const water = ["#7fe3f5", "#4cc6ea", "#2fa2da", "#2280c2", "#1b63a3", "#154c85"].map(hexToRgb);
    const n = water.length - 1;
    const sandLight = hexToRgb("#fbe9be"), sand = hexToRgb("#efd29a"),
      sandDeep = hexToRgb("#e3c182"), speck = hexToRgb("#d6b072");
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let col;
        const st = sandTop[x];
        if (y >= st) {
          const k = y - st;
          if (k < 2) col = sandLight;
          else if (y > H - sandH * .3 || (y > H - sandH * .45 && (x + y) & 1)) col = sandDeep;
          else col = sand;
          if ((x * 7 + y * 13) % 29 === 0) col = speck;
        } else {
          const t = clamp(y / seaFloor, 0, 1) * n;
          const i = Math.floor(t), fr = t - i;
          const up = fr < .6 ? 0 : fr < .8 ? (x + y) & 1 : 1; // 픽셀 디더링
          col = water[Math.min(n, i + up)];
        }
        const p = (y * W + x) * 4;
        d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; d[p + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const count = Math.max(3, Math.round(W / 35));
    for (let i = 0; i < count; i++) {
      const spr = DECOR[Math.floor(rnd() * DECOR.length)];
      const x = Math.floor(rnd() * Math.max(1, W - spr.w));
      const y = sandTop[clamp(x + (spr.w >> 1), 0, W - 1)] - spr.h + 3;
      g.drawImage(spr.canvas, x, y);
    }
  }

  // ---------- 생물 만들기 ----------
  const crabY = (c) => {
    const b = c.sp.frames[0];
    return sandTop[clamp(Math.round(c.x + b.w / 2), 0, W - 1)] - b.h + 3;
  };
  const bounds = (sp) => {
    const top = 8;
    return [top, Math.max(top, seaFloor - sp.frames[0].h)];
  };

  function pickSpecies() {
    const counts = {};
    let sharks = 0;
    for (const c of creatures) {
      counts[c.sp.id] = (counts[c.sp.id] || 0) + 1;
      if (c.sp.kind === "shark") sharks++;
    }
    const wantShark = sharks < Math.ceil(target * .45); // 상어가 늘 넉넉히 보이도록
    let pool = SPECIES.filter((s) => (counts[s.id] || 0) < s.max && W >= s.frames[0].w * 1.3);
    const prefer = pool.filter((s) => (s.kind === "shark") === wantShark);
    if (prefer.length) pool = prefer;
    if (!pool.length) pool = SPECIES.filter((s) => s.kind !== "shark");
    let total = 0;
    const ws = pool.map((s) => (total += s.weight * (counts[s.id] ? .25 : 1)));
    const r = Math.random() * total;
    return pool[ws.findIndex((v) => r < v)] || pool[0];
  }

  function spawn(sp, fromEdge) {
    const b = sp.frames[0];
    const [top, bottom] = bounds(sp);
    const dir = Math.random() < .5 ? 1 : -1;
    const x = fromEdge ? (dir > 0 ? -b.w : W) : rand(0, Math.max(1, W - b.w));
    const y = rand(top, bottom);
    const c = {
      sp, x, y, baseY: y, targetY: y, dir,
      speed: rand(sp.speed[0], sp.speed[1]), phase: rand(0, 10),
      taps: 0, lastTap: 0, flinch: 0, puff: 0, boost: 1,
      bubble: null, nameT: 0, blink: rand(1, 5), blinkT: 0, tearT: 0,
      state: "swim", cryT: 0, fvx: 0, fvy: 0, fleeDir: 1, pose: null,
    };
    if (sp.kind === "crab") c.y = crabY(c);
    // 큰 생물이 뒤에 오도록 정렬해서 넣기
    const idx = creatures.findIndex((o) => o.sp.layer < sp.layer);
    if (idx < 0) creatures.push(c); else creatures.splice(idx, 0, c);
  }

  function populate() {
    creatures = []; particles = []; respawns = [];
    for (let i = 0; i < target; i++) spawn(pickSpecies(), false);
  }

  // ---------- 현재 모습(프레임/위치) ----------
  function pose(c) {
    const sp = c.sp;
    const puffed = sp.puffFrames && c.puff > 0;
    const set = puffed ? sp.puffFrames : sp.frames;
    const fps = c.state === "swim" ? sp.fps * Math.min(3, c.boost) : sp.fps * 3;
    const spr = set[Math.floor(time * fps + c.phase) % 2];
    const base = sp.frames[0];
    return {
      spr,
      dx: Math.round(c.x - (spr.w - base.w) / 2),
      dy: Math.round(c.y - (spr.h - base.h) / 2),
      flip: !sp.noFlip && c.dir < 0,
      eyes: puffed ? sp.puffEyes : sp.eyes,
    };
  }

  // ---------- 터치 ----------
  function hit(c, ax, ay) {
    const { spr, dx, dy, flip } = pose(c);
    let lx = Math.floor(ax - dx);
    const ly = Math.floor(ay - dy);
    if (flip) lx = spr.w - 1 - lx;
    const R = Math.max(2, Math.ceil(12 / P)); // 손가락 여유
    if (lx < -R || ly < -R || lx >= spr.w + R || ly >= spr.h + R) return false;
    for (let oy = -R; oy <= R; oy++) {
      for (let ox = -R; ox <= R; ox++) {
        const x = lx + ox, y = ly + oy;
        if (x >= 0 && y >= 0 && x < spr.w && y < spr.h && spr.mask[y * spr.w + x]) return true;
      }
    }
    return false;
  }

  function poke(c, ax) {
    const b = c.sp.frames[0];
    c.taps++;
    c.lastTap = time;
    c.flinch = .35;
    c.boost = 1 + c.taps * .9;
    if (c.sp.puffFrames) c.puff = 2.5;

    if (c.taps === 1) {
      c.nameT = 2.6;
      c.bubble = { text: "앗!", t: 1 };
      sfx.boing();
      say(c.sp.name);
    } else if (c.taps === 2) {
      c.bubble = { text: "아야!", t: 1 };
      sfx.ouch();
      particles.push({ t: "sweat", x: c.x + b.w * .7, y: c.y - 2, vx: 0, vy: 4, life: .9 });
    } else {
      c.state = "cry";
      c.cryT = .8;
      c.bubble = { text: "으앙~ 😭", t: 2 };
      c.fleeDir = ax < c.x + b.w / 2 ? 1 : -1; // 손가락 반대쪽으로 도망
      sfx.cry();
    }
  }

  function startFlee(c) {
    const sp = c.sp;
    c.state = "flee";
    c.dir = c.fleeDir;
    c.fvx = c.fleeDir * rand(75, 100);
    c.fvy = sp.kind === "crab" ? 0 : -rand(5, 18);
    if (sp.kind === "octo") { // 문어는 먹물 뿜기
      c.fvy = -30;
      const b = sp.frames[0];
      for (let i = 0; i < 10; i++) {
        particles.push({
          t: "ink", x: c.x + b.w / 2 + rand(-3, 3), y: c.y + b.h * .7 + rand(-2, 3),
          vx: rand(-12, 12), vy: rand(-4, 8), r: rand(1.5, 3), life: 1.4, max: 1.4,
        });
      }
    }
  }

  function onPointer(e) {
    e.preventDefault();
    if (hintEl) hintEl.classList.add("hide");
    const rect = canvas.getBoundingClientRect();
    const ax = (e.clientX - rect.left) / P, ay = (e.clientY - rect.top) / P;
    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i];
      if (c.state === "swim" && hit(c, ax, ay)) return poke(c, ax);
    }
    // 빈 곳을 누르면 보글보글
    sfx.pop();
    for (let i = 0; i < 6; i++) {
      particles.push({ t: "bubble", x: ax + rand(-3, 3), y: ay + rand(-3, 3), vx: 0, vy: -rand(14, 28), s: 1 + Math.floor(rand(0, 3)), ph: rand(0, 6), life: 9 });
    }
  }

  // ---------- 움직임 ----------
  function spawnTears(c, dt) {
    c.tearT -= dt;
    if (c.tearT > 0 || !c.eyeWorld) return;
    c.tearT = .07;
    for (const [ex, ey] of c.eyeWorld) {
      particles.push({ t: "tear", x: ex, y: ey + 2, vx: rand(-25, 25), vy: -rand(8, 22), life: .7 });
    }
  }

  function updateCreature(c, dt) {
    const sp = c.sp, b = sp.frames[0];
    c.flinch = Math.max(0, c.flinch - dt);
    c.puff = Math.max(0, c.puff - dt);
    c.nameT = Math.max(0, c.nameT - dt);
    if (c.bubble && (c.bubble.t -= dt) <= 0) c.bubble = null;
    c.blink -= dt;
    if (c.blink <= 0) { c.blinkT = .14; c.blink = rand(2.5, 6); }
    c.blinkT -= dt;
    const [top, bottom] = bounds(sp);

    if (c.state === "swim") {
      if (c.taps && time - c.lastTap > 4) c.taps = 0; // 한참 지나면 다시 진정
      c.boost += (1 - c.boost) * Math.min(1, dt * 1.2);
      c.x += c.dir * c.speed * c.boost * dt;
      if (sp.kind === "crab") c.y = crabY(c);
      else {
        if (Math.random() < dt * .15) c.targetY = rand(top, bottom);
        c.baseY += (c.targetY - c.baseY) * Math.min(1, dt * .5);
        c.y = c.baseY + Math.sin(time * sp.bobF + c.phase) * sp.bobA;
      }
      if (c.dir > 0 && c.x > W - b.w * .6) c.dir = -1;
      else if (c.dir < 0 && c.x < -b.w * .4) c.dir = 1;
      else if (Math.random() < dt * .03) c.dir *= -1;
    } else if (c.state === "cry") {
      c.cryT -= dt;
      spawnTears(c, dt);
      if (c.cryT <= 0) startFlee(c);
    } else if (c.state === "flee") {
      c.x += c.fvx * dt;
      if (sp.kind === "crab") c.y = crabY(c);
      else c.y = clamp(c.y + c.fvy * dt, -b.h, bottom);
      spawnTears(c, dt);
      if (Math.random() < dt * 8) {
        particles.push({ t: "bubble", x: c.x + (c.dir > 0 ? 0 : b.w), y: c.y + b.h / 2, vx: 0, vy: -rand(10, 20), s: 1, ph: rand(0, 6), life: 9 });
      }
      if (c.x > W + 4 || c.x < -b.w - 4) c.state = "gone";
    }
  }

  function update(dt) {
    time += dt;

    bubbleT -= dt;
    if (bubbleT <= 0) {
      bubbleT = rand(.25, .7);
      particles.push({ t: "bubble", x: rand(0, W), y: seaFloor + 4, vx: 0, vy: -rand(10, 20), s: Math.random() < .3 ? 3 : Math.random() < .6 ? 2 : 1, ph: rand(0, 6), life: 99 });
    }

    for (const c of creatures) updateCreature(c, dt);
    const before = creatures.length;
    creatures = creatures.filter((c) => c.state !== "gone");
    for (let i = creatures.length; i < before; i++) respawns.push(rand(2, 4.5));

    for (let i = respawns.length - 1; i >= 0; i--) {
      if ((respawns[i] -= dt) <= 0) {
        respawns.splice(i, 1);
        if (creatures.length < target) spawn(pickSpecies(), true);
      }
    }

    for (const p of particles) {
      p.life -= dt;
      if (p.t === "bubble") {
        p.y += p.vy * dt;
        p.x += Math.sin(time * 3 + p.ph) * dt * 4;
        if (p.y < 3) p.life = 0;
      } else if (p.t === "ink") {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 1 - dt * 2; p.vy *= 1 - dt * 2;
        p.r += dt * 5;
      } else {
        p.vy += 60 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }
    particles = particles.filter((p) => p.life > 0);
  }

  // ---------- 그리기 ----------
  function drawEye(pat, x, y, mirror) {
    for (let r = 0; r < pat.length; r++) {
      const row = pat[r];
      for (let k = 0; k < row.length; k++) {
        const ch = row[mirror ? row.length - 1 - k : k];
        if (ch === ".") continue;
        lctx.fillStyle = EYE_COL[ch];
        lctx.fillRect(x + k, y + r, 1, 1);
      }
    }
  }

  function drawCreature(c) {
    const ps = pose(c);
    c.pose = ps;
    const { spr, flip, eyes } = ps;
    let { dx, dy } = ps;
    if (c.flinch > 0 || c.state === "cry") dx += Math.floor(time * 30) % 2 ? 1 : -1; // 움찔!

    lctx.save();
    if (flip) { lctx.translate(dx + spr.w, dy); lctx.scale(-1, 1); }
    else lctx.translate(dx, dy);
    lctx.globalAlpha = c.sp.alpha || 1;
    lctx.drawImage(spr.canvas, 0, 0);
    lctx.globalAlpha = 1;

    const mood = c.state !== "swim" ? "cry" : c.flinch > 0 ? "squint" : c.blinkT > 0 ? "blink" : "open";
    for (const [ex, ey, mir] of eyes) drawEye(EYES[mood], ex + 1, ey + 1, !!mir);
    lctx.restore();

    c.eyeWorld = eyes.slice(0, 2).map(([ex, ey]) => [flip ? dx + spr.w - 2 - ex : dx + ex + 1, dy + ey + 1]);
  }

  function drawParticles() {
    for (const p of particles) {
      const x = Math.round(p.x), y = Math.round(p.y);
      if (p.t === "bubble") {
        lctx.fillStyle = "rgba(255,255,255,.75)";
        if (p.s < 3) lctx.fillRect(x, y, p.s, p.s);
        else {
          lctx.fillRect(x + 1, y, 1, 1); lctx.fillRect(x, y + 1, 1, 1);
          lctx.fillRect(x + 2, y + 1, 1, 1); lctx.fillRect(x + 1, y + 2, 1, 1);
        }
      } else if (p.t === "tear") {
        lctx.fillStyle = "#8fdcff";
        lctx.fillRect(x, y, 1, 2);
      } else if (p.t === "sweat") {
        lctx.fillStyle = "#bdeeff";
        lctx.fillRect(x, y + 1, 2, 2); lctx.fillRect(x, y, 1, 1);
      } else if (p.t === "ink") {
        lctx.fillStyle = `rgba(45,25,70,${(.75 * p.life) / p.max})`;
        lctx.beginPath(); lctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); lctx.fill();
      }
    }
  }

  function drawWeeds() {
    for (const w of weeds) {
      const base = sandTop[clamp(w.x, 0, W - 1)] + 1;
      const wx = (k) => w.x + Math.round(Math.sin(time * 1.3 + w.ph + k * .22) * (k / w.h) * 3);
      lctx.fillStyle = w.c[1];
      for (let k = 0; k <= w.h; k++) lctx.fillRect(wx(k) - 1, base - k, 4, 1);
      lctx.fillRect(wx(w.h), base - w.h - 1, 2, 1);
      lctx.fillStyle = w.c[0];
      for (let k = 0; k < w.h; k++) lctx.fillRect(wx(k), base - k, 2, 1);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 말풍선(bubble) / 이름표(tag) — 글자는 선명하게 큰 캔버스에 그림
  function label(text, cx, y, style, alpha = 1) {
    const fs = Math.round((style === "bubble" ? 20 : 17) * dpr);
    ctx.font = `${fs}px Jua, "Malgun Gothic", sans-serif`;
    const tw = ctx.measureText(text).width;
    const bw = tw + fs * 1.2, bh = fs * 1.6;
    const x = clamp(cx - bw / 2, 4 * dpr, canvas.width - bw - 4 * dpr);
    const top = clamp(style === "bubble" ? y - bh - fs * .6 : y, 4 * dpr, canvas.height - bh - 4 * dpr);
    ctx.globalAlpha = alpha;
    roundRect(x, top, bw, bh, bh / 2);
    if (style === "bubble") {
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.lineWidth = 3 * dpr; ctx.strokeStyle = OUTLINE; ctx.stroke();
      const tx = clamp(cx, x + bh / 2, x + bw - bh / 2);
      ctx.beginPath();
      ctx.moveTo(tx - 6 * dpr, top + bh - 1.5 * dpr);
      ctx.lineTo(tx, top + bh + 8 * dpr);
      ctx.lineTo(tx + 6 * dpr, top + bh - 1.5 * dpr);
      ctx.fill(); ctx.stroke();
      ctx.fillRect(tx - 5 * dpr, top + bh - 4 * dpr, 10 * dpr, 3 * dpr);
      ctx.fillStyle = OUTLINE;
    } else {
      ctx.fillStyle = "rgba(27,36,64,.82)"; ctx.fill();
      ctx.fillStyle = "#ffffff";
    }
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, x + bw / 2, top + bh / 2 + fs * .05);
    ctx.globalAlpha = 1;
  }

  function render() {
    lctx.drawImage(bg, 0, 0);

    // 햇빛 줄기
    lctx.fillStyle = "#ffffff";
    rays.forEach((r, i) => {
      lctx.globalAlpha = .07 + .05 * Math.sin(time * .6 + i * 2);
      lctx.beginPath();
      lctx.moveTo(r.x, 0); lctx.lineTo(r.x + r.w, 0);
      lctx.lineTo(r.x + r.w + H * .35, seaFloor); lctx.lineTo(r.x + H * .35 - r.w * .3, seaFloor);
      lctx.closePath(); lctx.fill();
    });
    lctx.globalAlpha = 1;

    // 물결 수면
    lctx.fillStyle = "rgba(255,255,255,.55)";
    for (let x = 0; x < W; x++) lctx.fillRect(x, Math.round(1.5 + Math.sin(x * .18 + time * 2) * 1.2), 1, 1);

    drawWeeds();
    for (const c of creatures) drawCreature(c);
    drawParticles();

    // 픽셀 그대로 확대
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, W * P * dpr, H * P * dpr);

    const S = P * dpr;
    for (const c of creatures) {
      if (c.nameT > 0 && c.pose) {
        const { spr, dx, dy } = c.pose;
        label(c.sp.name, (dx + spr.w / 2) * S, (dy + spr.h) * S + 4 * dpr, "tag", Math.min(1, c.nameT * 2));
      }
    }
    for (const c of creatures) {
      if (c.bubble && c.pose) {
        const { spr, dx, dy } = c.pose;
        label(c.bubble.text, (dx + spr.w / 2) * S, dy * S, "bubble", Math.min(1, c.bubble.t * 3));
      }
    }
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(.05, (ts - last) / 1000);
    last = ts;
    update(dt);
    render();
    raf = requestAnimationFrame(loop);
  }

  function onResize() {
    layout();
    for (const c of creatures) {
      const [top, bottom] = bounds(c.sp);
      c.x = clamp(c.x, -c.sp.frames[0].w, W);
      if (c.sp.kind === "crab") c.y = crabY(c);
      else { c.baseY = clamp(c.baseY, top, bottom); c.targetY = clamp(c.targetY, top, bottom); }
    }
  }

  // ---------- 공개 API ----------
  window.SeaGame = {
    start(cv, hint) {
      if (running) return;
      canvas = cv; ctx = cv.getContext("2d"); hintEl = hint;
      if (!SPECIES) { SPECIES = buildSpecies(); DECOR = buildDecor(); }
      layout();
      populate();
      if (hintEl) hintEl.classList.remove("hide");
      canvas.addEventListener("pointerdown", onPointer);
      window.addEventListener("resize", onResize);
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
    stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", onResize);
      try { speechSynthesis.cancel(); } catch { /* ignore */ }
    },
  };
})();
