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
  const EYE_COL = { K: "#14182b", W: "#ffffff", B: "#7fd3ff", Y: "#ffd23f" };
  // 눈 모양 (2x3 픽셀). 오른쪽을 보는 기준
  const EYES = {
    open:   ["KW", "KK", "KK"],
    blink:  ["..", "KK", ".."],
    squint: ["K.", ".K", "K."], // >
    cry:    ["KK", "BB", ".B"], // ㅠ
    happy:  [".K.", "K.K", "..."], // ^ (눈웃음)
    giant:  ["YKY", "YKY", "YKY"], // 거대 생물: 노란 눈에 세로 동공
  };
  const HEART = [".X.X.", "XWXXX", "XXXXX", ".XXX.", "..X.."];

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

    // ===== 거대 생물 (가끔 나타나는 보스) — 크라켄은 따로 그때그때 그림 =====
    const mosaDef = {
      w: 150, h: 52, eyes: [[118, 15]],
      draw: (g, f) => {
        const s = f ? 1 : -1, m = 22, c = "#3d5a4a", d = "#2b4236", open = f ? 5 : 1;
        g.poly([[16, m], [2, m - 8 + s * 2], [9, m]], d);            // 꼬리지느러미 위
        g.poly([[16, m + 1], [0, m + 14 + s * 2], [10, m + 2]], d);  // 꼬리지느러미 아래
        g.poly([[44, m - 8], [12, m - 1.5], [12, m + 2], [44, m + 10]], c); // 꼬리
        g.poly([[50, m + 9], [40, m + 22 - s], [48, m + 23 - s], [60, m + 11]], d); // 뒷지느러미
        g.ell(72, m + 1, 36, 12.5, c); // 몸통
        g.ell(110, m - 1, 16, 9, c);   // 머리
        g.poly([[106, m + 2], [138, m + 3], [148, m + 4 + open], [146, m + 6 + open], [106, m + 9]], "#5a1020"); // 입속
        g.poly([[104, m - 8], [130, m - 6], [149, m - 2], [149, m + 1], [104, m + 1]], c); // 위턱
        g.poly([[104, m + 3], [144, m + 4 + open], [145, m + 7 + open], [104, m + 9]], c); // 아래턱
        g.atop(() => {
          g.ell(80, m + 11, 46, 5.5, "#c9d6c0");
          for (let x = 30; x < 100; x += 6) g.rect(x, m - 9 + Math.round(Math.abs(x - 72) / 12), 3, 1, d); // 등 비늘
        });
        for (let x = 112; x < 146; x += 3) { // 이빨
          g.rect(x, m + 1, 1, 2, "#fffbe8");
          const ly = m + 3 + ((x - 104) / 40) * (1 + open);
          g.rect(x + 1, ly - 2, 1, 2, "#fffbe8");
        }
        g.poly([[84, m + 9], [72, m + 24 + s], [81, m + 25 + s], [94, m + 11]], d); // 앞지느러미
        g.rect(114, 12, 3, 1, "#14182b"); g.rect(117, 13, 3, 1, "#14182b"); // 찡그린 눈썹
      },
    };
    const megaR = 16;
    const megaDef = shark({
      L: 150, r: megaR, dorsal: 16, pec: 12, back: "#4a5562", fin: "#363f4a", belly: "#d9dde2",
      mouth: "#3a0d18", mouthW: 22,
      pattern: (g, f, m) => { // 상처 자국
        g.rect(70, m - 10, 6, 1, "#6b7682"); g.rect(76, m - 9, 4, 1, "#6b7682");
        g.rect(95, m - 6, 5, 1, "#6b7682");
      },
      extra: (g, f, m) => {
        const y = Math.round(m + megaR * .4);
        for (let x = 127; x < 146; x += 3) { // 이빨
          g.rect(x, y - 1, 1, 2, "#fffbe8");
          g.rect(x + 1, y + 1, 1, 2, "#fffbe8");
        }
        const ey = Math.round(m - megaR * .55); // 찡그린 눈썹
        g.rect(119, ey - 2, 3, 1, "#14182b"); g.rect(122, ey - 1, 2, 1, "#14182b");
      },
    });
    const giants = {
      mosa: { name: "모사사우루스", banner: "모사사우루스가 나타났다!", frames: pair(mosaDef), eyes: mosaDef.eyes },
      mega: { name: "메갈로돈", banner: "메갈로돈이 나타났다!", frames: pair(megaDef), eyes: megaDef.eyes },
    };

    return { list, giants };
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
    plop: () => tone({ f0: 700, f1: 250, dur: .12, vol: .12 }),
    munch: () => {
      tone({ type: "square", f0: 300, f1: 220, dur: .06, vol: .06 });
      setTimeout(() => tone({ type: "square", f0: 340, f1: 240, dur: .06, vol: .06 }), 110);
    },
    giggle: () => [700, 880, 1050].forEach((f, i) =>
      setTimeout(() => tone({ f0: f, f1: f * 1.2, dur: .07, vol: .1 }), i * 80)),
    rumble: () => { // 우르르르
      tone({ type: "sawtooth", f0: 120, f1: 55, dur: 2.2, vol: .16, vib: 5 });
      tone({ type: "triangle", f0: 90, f1: 45, dur: 2.2, vol: .2 });
    },
    heartbeat: () => [0, 260, 900, 1160].forEach((ms) => // 쿵쿵… 쿵쿵
      setTimeout(() => tone({ type: "triangle", f0: 150, f1: 60, dur: .16, vol: .3 }), ms)),
    burp: () => { // 꺼억~
      tone({ type: "sawtooth", f0: 150, f1: 85, dur: .55, vol: .16, vib: 22 });
      tone({ type: "square", f0: 110, f1: 70, dur: .45, vol: .05, vib: 16 });
    },
    roar: () => { // 크아아앙
      tone({ type: "sawtooth", f0: 260, f1: 70, dur: 1.3, vol: .18, vib: 14 });
      tone({ type: "square", f0: 180, f1: 55, dur: 1.1, vol: .07, vib: 9 });
    },
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
  let SPECIES = null, GIANTS = null, DECOR = null;
  let foods = [], giantT = 30, giant = null, dark = 0, shake = 0, lastTouch = null;
  const pointers = new Map();
  let canvas, ctx, hintEl;
  const low = document.createElement("canvas");
  const lctx = low.getContext("2d");
  let bg, W = 0, H = 0, P = 4, dpr = 1, sandH = 14, sandTop = [], seaFloor = 0, target = 8;
  let weeds = [], rays = [];
  let creatures = [], particles = [], respawns = [];
  let time = 0, last = 0, raf = 0, running = false, bubbleT = 0;
  let lastCssW = 0, lastCssH = 0;

  // ---------- 미션: 배고픈 친구에게 밥 주기 ----------
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const FEED_NEED = 5; // 한 번 톡 = 먹이 3알 → 두어 번 줘야 배부름
  const ICON = { shark: "🦈", fish: "🐠", octo: "🐙", turtle: "🐢", crab: "🦀" };
  let hungry = null, missionT = 6, bar = null, screenEl = null, missions = 0;
  const askFeed = () => {
    if (!hungry) return;
    say(`배고픈 ${hungry.c.sp.name}에게 밥을 주자!` + (missions < 2 ? " 빈 곳을 톡 누르면 밥이 나와요." : ""));
    hungry.nagT = 14;
  };
  function startHungry() {
    const ok = creatures.filter((c) => c.state === "swim" && !c.scared && c.sp.kind !== "jelly" &&
      c.x > 0 && c.x < W - c.sp.frames[0].w);
    if (!ok.length) { missionT = 2; return; }
    const sharks = ok.filter((c) => c.sp.kind === "shark");
    const c = sharks.length && Math.random() < .6 ? pick(sharks) : pick(ok);
    hungry = { c, got: 0, nagT: 14, beg: 1.5 };
    const icon = c.sp.id === "puffer" ? "🐡" : ICON[c.sp.kind] || "🐟";
    bar.show(icon, `${c.sp.name} 밥 주기`, FEED_NEED);
    askFeed();
  }
  function fedHungry(c, mx, my) {
    hungry.got++;
    c.fat = hungry.got;
    bar.progress(hungry.got);
    if (hungry.got < FEED_NEED) {
      c.bubble = { text: "냠냠! 더 줘~", t: 1.3 };
      return;
    }
    // 배불러서 꺼억~
    hungry = null;
    missions++;
    missionT = rand(10, 16);
    bar.hide();
    c.fullT = 7;
    c.eatCD = 7;
    setTimeout(() => {
      if (!running) return;
      c.bubble = { text: "꺼억~ 배불러! 💕", t: 2.4 };
      sfx.burp();
      for (let i = 0; i < 8; i++) heart(mx + rand(-6, 6), my - rand(0, 6));
      setTimeout(() => running && Kids.celebrate(screenEl, "배부르대요! 잘했어요!"), 900);
    }, 500);
  }
  function updateHungry(dt) {
    if (!hungry) {
      if (!giant && (missionT -= dt) <= 0) startHungry();
      return;
    }
    const c = hungry.c;
    if (!creatures.includes(c) || c.state !== "swim") { // 도망가 버렸으면 다른 친구가 배고파함
      hungry = null; missionT = 1.5;
      return;
    }
    if (giant || c.scared) return;
    if ((hungry.beg -= dt) <= 0) {
      hungry.beg = 5;
      if (!c.bubble) c.bubble = { text: "배고파~ 😋", t: 1.6 };
    }
    if ((hungry.nagT -= dt) <= 0) askFeed();
  }

  // ---------- 화면 크기 맞추기 ----------
  function layout() {
    const cssW = canvas.clientWidth || window.innerWidth;
    const cssH = canvas.clientHeight || window.innerHeight;
    lastCssW = cssW; lastCssH = cssH;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // 픽셀 하나의 크기 (작을수록 생물이 작게 보임)
    // 화면을 돌려도 생물 크기는 그대로, 바다만 넓어지도록 '기기 화면의 짧은 변' 기준으로 정함
    const deviceShort = Math.min(screen.width || cssW, screen.height || cssH);
    P = clamp(Math.floor(Math.min(deviceShort, Math.max(cssW, cssH) * .6) / 190), 2, 6);
    W = Math.ceil(cssW / P); H = Math.ceil(cssH / P);
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    low.width = W; low.height = H;
    lctx.imageSmoothingEnabled = false;

    sandH = Math.max(12, Math.round(H * .13));
    sandTop = [];
    for (let x = 0; x < W; x++)
      sandTop[x] = H - sandH + Math.round(Math.sin(x * .07) * 2 + Math.sin(x * .19 + 1) * 1);
    seaFloor = H - sandH - 3;
    target = clamp(Math.round((W * H) / 5500), 6, 14);

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
      happy: 0, petT: 0, petAcc: 0, lastGiggle: -9, eatCD: 0,
      scared: false,
    };
    if (sp.kind === "crab") c.y = crabY(c);
    // 큰 생물이 뒤에 오도록 정렬해서 넣기
    const idx = creatures.findIndex((o) => o.sp.layer < sp.layer);
    if (idx < 0) creatures.push(c); else creatures.splice(idx, 0, c);
  }

  function populate() {
    creatures = []; particles = []; respawns = []; foods = [];
    giantT = rand(20, 35);
    giant = null; dark = 0; shake = 0;
    for (let i = 0; i < target; i++) spawn(pickSpecies(), false);
  }

  // =====================================================
  //  거대 생물 이벤트: 크라켄 / 모사사우루스 / 메갈로돈
  //  경고(어두워짐·쿵쿵) → 등장(포효·흔들림) → 퇴장 → 작은 친구들 복귀
  // =====================================================
  const ease = (t) => t * t * (3 - 2 * t);
  const GIANT_ORDER = ["kraken", "mosa", "mega"]; // 이 순서대로 돌아가며 등장
  let giantIdx = 0; // 바다 체험을 나갔다 들어와도 순서가 이어짐

  function startGiant(kind) {
    if (giant) return;
    if (!kind) kind = GIANT_ORDER[giantIdx++ % GIANT_ORDER.length];
    // 작은 친구들은 화면 밖으로 숨기
    for (const c of creatures) {
      if (c.state !== "swim") continue;
      const b = c.sp.frames[0];
      c.scared = true;
      c.dir = c.x + b.w / 2 < W / 2 ? -1 : 1;
      if (Math.random() < .4) c.bubble = { text: "히익!", t: 1.2 };
    }
    const common = { kind, t: 0, hitT: 0, roarCD: 0, roarBubble: 0, named: false, darkTarget: .55, shake: 0, bannerT: 3 };
    if (kind === "kraken") {
      giant = { ...common, name: "크라켄", banner: "크라켄이 나타났다!", cx: W * rand(.35, .65), rise: 0, roared: false, shape: null };
      sfx.rumble();
    } else {
      const sp = GIANTS[kind], b = sp.frames[0];
      const gs = clamp(Math.floor((W * .8) / b.w), 1, 2); // 넓은 화면에선 2배로 (가까이 지나가는 느낌)
      const gw = b.w * gs, gh = b.h * gs;
      const dir = Math.random() < .5 ? 1 : -1;
      const baseY = clamp(H * .45 - gh / 2, 2, Math.max(2, seaFloor - gh * .8));
      giant = {
        ...common, sp, gs, gw, name: sp.name, banner: sp.banner, dir, x: dir > 0 ? -gw : W, y: baseY, baseY,
        speed: (W + gw) / 6.5, started: false, leaveT: 0, pose: null,
      };
      sfx.heartbeat();
    }
  }

  function endGiant() {
    giant = null;
    for (const c of creatures) c.scared = false;
  }

  function updateGiant(dt) {
    const g = giant;
    g.t += dt;
    g.hitT = Math.max(0, g.hitT - dt);
    g.roarCD = Math.max(0, g.roarCD - dt);
    g.roarBubble = Math.max(0, g.roarBubble - dt);
    g.bannerT = Math.max(0, g.bannerT - dt);
    if (g.kind === "kraken") {
      const T = g.t;
      g.rise = T < 2 ? 0 : T < 4 ? (T - 2) / 2 : T < 10 ? 1 : T < 12 ? 1 - (T - 10) / 2 : 0;
      if (T >= 2 && !g.roared) { g.roared = true; sfx.roar(); }
      g.darkTarget = T < 12 ? .55 : 0;
      g.shake = (T < 2 ? .5 : T < 4 ? 1.5 : 0) + g.hitT * 3;
      if (T > 13) endGiant();
    } else {
      if (g.t < 1.8) { g.shake = .3; return; } // 경고 중
      if (!g.started) { g.started = true; sfx.roar(); }
      g.x += g.dir * g.speed * (g.hitT > 0 ? .3 : 1) * dt;
      g.y = g.baseY + Math.sin(g.t * .9) * 3;
      g.shake = (g.t < 2.8 ? 1 : 0) + g.hitT * 3;
      const out = g.dir > 0 ? g.x > W + 4 : g.x < -g.gw - 4;
      if (out) {
        g.darkTarget = 0;
        g.leaveT += dt;
        if (g.leaveT > 1.5) endGiant();
      }
    }
  }

  // 픽셀로 채운 타원 (크라켄은 매 프레임 직접 그림)
  function pxEllipse(cx, cy, rx, ry, col) {
    lctx.fillStyle = col;
    const R = Math.ceil(ry);
    for (let dy = -R; dy <= R; dy++) {
      const v = 1 - (dy / ry) ** 2;
      if (v < 0) continue;
      const w = rx * Math.sqrt(v);
      lctx.fillRect(Math.round(cx - w), Math.round(cy) + dy, Math.round(w * 2) + 1, 1);
    }
  }

  function krakenShape(g) {
    const rx = Math.min(W * .17, 52), ry = rx * 1.1;
    const r = ease(clamp(g.rise, 0, 1));
    const startY = H + ry + 6, endY = H * .6;
    const cy = startY + (endY - startY) * r, cx = g.cx;
    const n = 8, segs = 26, len = H * .95 * r;
    const amp = .5 + g.hitT * 1.6; // 맞으면 촉수를 마구 휘두름
    const tents = [];
    for (let i = 0; i < n; i++) {
      const u = (i - (n - 1) / 2) / ((n - 1) / 2); // -1..1
      const a0 = -Math.PI / 2 + u * 1.1;
      let x = cx + u * rx * .75, y = cy + ry * .25;
      const pts = [];
      for (let k = 0; k <= segs; k++) {
        const t = k / segs;
        pts.push([x, y, Math.max(1, rx * .2 * (1 - t * .85))]);
        const ang = a0 + Math.sin(time * 1.6 + i * 1.7 + t * 5) * amp * t + u * t * t * 1.3;
        x += (Math.cos(ang) * len) / segs;
        y += (Math.sin(ang) * len) / segs;
      }
      tents.push(pts);
    }
    return { cx, cy, rx, ry, tents };
  }

  function drawKraken(g) {
    const s = krakenShape(g);
    g.shape = s;
    if (s.cy - s.ry > H && g.rise <= 0) return;
    const OUT = "#1b0a14", BODY = "#7a2040", LIGHT = "#a8385a", SUCK = "#f2b5c4";
    for (const pts of s.tents) for (const [x, y, r] of pts) pxEllipse(x, y, r + 1, r + 1, OUT);
    for (const pts of s.tents) for (const [x, y, r] of pts) pxEllipse(x, y, r, r, BODY);
    for (const pts of s.tents) {
      for (let k = 4; k < pts.length; k += 3) {
        const [x, y, r] = pts[k];
        if (r >= 2) pxEllipse(x + r * .4, y, r * .35, r * .35, SUCK); // 빨판
      }
    }
    pxEllipse(s.cx, s.cy, s.rx + 1, s.ry + 1, OUT);
    pxEllipse(s.cx, s.cy, s.rx, s.ry, BODY);
    pxEllipse(s.cx - s.rx * .35, s.cy - s.ry * .5, s.rx * .25, s.ry * .15, LIGHT);

    // 노려보는 눈 (손가락을 따라봄)
    const er = Math.max(3, Math.round(s.rx * .2));
    const look = lastTouch && time - lastTouch.t < 3 ? lastTouch : { x: s.cx + Math.sin(time * .7) * W * .3, y: H * .4 };
    for (const side of [-1, 1]) {
      const ex = Math.round(s.cx + side * s.rx * .42), ey = Math.round(s.cy - s.ry * .2);
      pxEllipse(ex, ey, er + 1, er + 1, OUT);
      if (g.hitT > 0 || Math.sin(time * 1.3) > .97) { // 찡그림 / 깜빡임: 눈꺼풀 닫힘
        pxEllipse(ex, ey, er, er, BODY);
        lctx.fillStyle = OUT;
        lctx.fillRect(ex - er, ey, er * 2 + 1, 2);
      } else {
        pxEllipse(ex, ey, er, er, "#ffd23f");
        const dx = clamp((look.x - ex) / 40, -1, 1) * er * .35;
        const dy = clamp((look.y - ey) / 40, -1, 1) * er * .35;
        lctx.fillStyle = "#14182b";
        lctx.fillRect(Math.round(ex + dx - er * .7), Math.round(ey + dy) - 1, Math.round(er * 1.4) + 1, 2);
      }
      lctx.fillStyle = OUT; // 화난 눈썹 (바깥쪽이 높고 안쪽이 낮게)
      for (let k = 0; k <= er * 1.6; k++) {
        lctx.fillRect(Math.round(ex + side * (er + 1) - side * k), Math.round(ey - er - 3 + k * .45), 2, 2);
      }
    }
  }

  function drawSwimmer(g) {
    g.pose = null;
    if (g.t < 1.8) return;
    const spr = g.sp.frames[Math.floor(time * (g.hitT > 0 ? 8 : 2)) % 2]; // 턱 딱딱
    const dx = Math.round(g.x), dy = Math.round(g.y), gs = g.gs;
    const flip = g.dir < 0;
    lctx.save();
    if (flip) { lctx.translate(dx + spr.w * gs, dy); lctx.scale(-gs, gs); }
    else { lctx.translate(dx, dy); lctx.scale(gs, gs); }
    lctx.drawImage(spr.canvas, 0, 0);
    for (const [ex, ey] of g.sp.eyes) drawEye(g.hitT > 0 ? EYES.squint : EYES.giant, ex + 1, ey + 1, false);
    lctx.restore();
    g.pose = { spr, dx, dy, flip, gs };
  }

  function hitGiant(ax, ay) {
    const g = giant;
    if (!g) return false;
    if (g.kind === "kraken") {
      const s = g.shape;
      if (!s || g.rise <= .2) return false;
      if (((ax - s.cx) / s.rx) ** 2 + ((ay - s.cy) / s.ry) ** 2 <= 1) return true;
      for (const pts of s.tents) {
        for (let k = 0; k < pts.length; k += 2) {
          const [x, y, r] = pts[k];
          if (Math.hypot(ax - x, ay - y) < r + 3) return true;
        }
      }
      return false;
    }
    if (!g.pose) return false;
    const { spr, dx, dy, flip, gs } = g.pose;
    let lx = Math.floor((ax - dx) / gs);
    const ly = Math.floor((ay - dy) / gs);
    if (flip) lx = spr.w - 1 - lx;
    const R = 2;
    for (let oy = -R; oy <= R; oy++) {
      for (let ox = -R; ox <= R; ox++) {
        const x = lx + ox, y = ly + oy;
        if (x >= 0 && y >= 0 && x < spr.w && y < spr.h && spr.mask[y * spr.w + x]) return true;
      }
    }
    return false;
  }

  function pokeGiant() {
    const g = giant;
    g.hitT = .7;
    g.roarBubble = 1.2;
    if (g.roarCD <= 0) { sfx.roar(); g.roarCD = .9; }
    if (!g.named) { g.named = true; say(g.name); }
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

  // ---------- 터치: 톡(누르기) / 문지르기·꾹(쓰다듬기) / 빈 곳(먹이) ----------
  const MOVE_CSS = 14; // 손가락이 이만큼(css px) 넘게 움직이면 '문지르기'
  const HOLD_PET = .45; // 생물 위에서 이만큼(초) 누르고 있으면 쓰다듬기

  // 실제로 화면에 그려진 크기 기준으로 좌표 계산 (화면 회전 중이어도 정확하게)
  function toArt(e) {
    const rect = canvas.getBoundingClientRect();
    return [
      (e.clientX - rect.left) * (canvas.width / rect.width) / (P * dpr),
      (e.clientY - rect.top) * (canvas.height / rect.height) / (P * dpr),
    ];
  }

  function creatureAt(ax, ay) {
    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i];
      if (c.state === "swim" && hit(c, ax, ay)) return c;
    }
    return null;
  }

  function onDown(e) {
    e.preventDefault();
    if (hintEl) hintEl.classList.add("hide");
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const [ax, ay] = toArt(e);
    lastTouch = { x: ax, y: ay, t: time };
    pointers.set(e.pointerId, { x: ax, y: ay, t: time, moved: 0, c: creatureAt(ax, ay), petted: false });
  }

  function onMove(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const [ax, ay] = toArt(e);
    const d = Math.hypot(ax - p.x, ay - p.y);
    p.moved += d; p.x = ax; p.y = ay;
    if (p.moved * P >= MOVE_CSS) {
      const c = creatureAt(ax, ay);
      if (c) pet(c, d, p);
    }
  }

  function onUp(e) {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (!p || e.type === "pointercancel" || p.petted || p.moved * P >= MOVE_CSS) return;
    if (giant && hitGiant(p.x, p.y)) return pokeGiant(); // 거대 생물이 맨 앞
    const c = creatureAt(p.x, p.y);
    if (c) poke(c, p.x);
    else dropFood(p.x, p.y);
  }

  const heart = (x, y) =>
    particles.push({ t: "heart", x, y, vx: rand(-4, 4), vy: -rand(10, 16), life: 1.2, max: 1.2 });

  function pet(c, amount, p) {
    p.petted = true;
    const b = c.sp.frames[0];
    c.petT = .5;            // 쓰다듬는 동안 천천히 (손가락에서 도망가지 않게)
    c.happy = Math.max(c.happy, .8);
    c.taps = 0;             // 쓰다듬으면 진정
    c.boost = 1;
    c.petAcc += amount;
    while (c.petAcc > 6) {
      c.petAcc -= 6;
      heart(c.x + b.w / 2 + rand(-b.w * .3, b.w * .3), c.y + rand(0, b.h * .3));
    }
    if (time - c.lastGiggle > 1.6) {
      c.lastGiggle = time;
      c.bubble = { text: "히히 좋아~ 💕", t: 1.3 };
      sfx.giggle();
    }
  }

  // ---------- 먹이 ----------
  function dropFood(ax, ay) {
    sfx.plop();
    for (let i = 0; i < 3; i++) {
      foods.push({ x: ax + rand(-4, 4), y: ay + rand(-3, 2), vy: rand(7, 11), ph: rand(0, 6), life: 14, eaten: false });
    }
    while (foods.length > 36) foods.shift();
    for (let i = 0; i < 3; i++) {
      particles.push({ t: "bubble", x: ax + rand(-3, 3), y: ay, vx: 0, vy: -rand(14, 24), s: 1 + Math.floor(rand(0, 2)), ph: rand(0, 6), life: 9 });
    }
  }

  const floorAt = (x) => sandTop[clamp(Math.round(x), 0, W - 1)] - 1;

  function mouth(c) {
    const b = c.sp.frames[0];
    if (c.sp.noFlip) return [c.x + b.w / 2, c.y + b.h * .6];
    return [c.x + (c.dir > 0 ? b.w * .88 : b.w * .12), c.y + b.h * .55];
  }

  function nearestFood(c) {
    const b = c.sp.frames[0];
    const cx = c.x + b.w / 2, cy = c.y + b.h / 2;
    // 미션 중이면 배고픈 친구는 멀리서도 먹이를 찾고, 다른 친구들은 가까운 것만
    const reach = !hungry ? 90 : hungry.c === c ? 260 : 40;
    let best = null, bd = reach * reach;
    for (const fd of foods) {
      if (fd.eaten) continue;
      if (c.sp.kind === "crab" && fd.y < floorAt(fd.x) - 1) continue; // 꽃게는 바닥에 떨어진 것만
      const d = (fd.x - cx) ** 2 + (fd.y - cy) ** 2;
      if (d < bd) { bd = d; best = fd; }
    }
    return best;
  }

  function eat(c, fd, mx, my) {
    fd.eaten = true;
    c.eatCD = 1.6;
    c.happy = 1.2;
    c.taps = 0;
    c.bubble = { text: "냠냠!", t: 1 };
    heart(mx, my - 3);
    sfx.munch();
    if (hungry && hungry.c === c) { c.eatCD = .6; fedHungry(c, mx, my); }
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
    c.happy = Math.max(0, c.happy - dt);
    c.petT = Math.max(0, c.petT - dt);
    c.eatCD = Math.max(0, c.eatCD - dt);
    if (c.fat && !(hungry && hungry.c === c)) { // 배부른 뒤 천천히 홀쭉해짐
      c.fullT = (c.fullT || 0) - dt;
      if (c.fullT <= 0) c.fat = Math.max(0, c.fat - dt * .8);
    }
    const [top, bottom] = bounds(sp);

    // 거대 생물이 나타나면 화면 밖으로 쌩~ 숨었다가, 사라지면 다시 들어옴
    if (c.state === "swim" && c.scared) {
      c.x = clamp(c.x + c.dir * c.speed * 3.5 * dt, -b.w * 1.6, W + b.w * .6);
      if (sp.kind === "crab") c.y = crabY(c);
      else c.y = c.baseY + Math.sin(time * sp.bobF * 3 + c.phase) * sp.bobA;
      return;
    }

    if (c.state === "swim") {
      if (c.taps && time - c.lastTap > 4) c.taps = 0; // 한참 지나면 다시 진정
      c.boost += (1 - c.boost) * Math.min(1, dt * 1.2);
      const food = c.petT <= 0 && c.eatCD <= 0 && sp.kind !== "jelly" ? nearestFood(c) : null;

      if (food) {
        // 먹이 쪽으로 헤엄쳐 가기
        const cx = c.x + b.w / 2;
        if (Math.abs(food.x - cx) > 2) c.dir = food.x > cx ? 1 : -1;
        const [mx, my] = mouth(c);
        const step = c.speed * (hungry && hungry.c === c ? 3 : 1.8) * dt;
        c.x += clamp(food.x - mx, -step, step);
        if (sp.kind === "crab") c.y = crabY(c);
        else {
          // 바닥에 떨어진 먹이도 먹을 수 있게, 먹이 쫓을 때는 바닥 가까이까지 내려감
          const low = Math.max(bottom, floorAt(cx) - b.h * .55 + 1);
          c.targetY = clamp(c.baseY + (food.y - my), top, low);
          c.baseY += (c.targetY - c.baseY) * Math.min(1, dt * 3);
          c.y = c.baseY + Math.sin(time * sp.bobF + c.phase) * sp.bobA * .3;
        }
        const [mx2, my2] = mouth(c);
        if (Math.hypot(food.x - mx2, food.y - my2) < Math.max(3, b.h * .3)) eat(c, food, mx2, my2);
      } else {
        const mul = c.petT > 0 ? .12 : c.boost; // 쓰다듬는 중엔 거의 멈춤
        c.x += c.dir * c.speed * mul * dt;
        if (sp.kind === "crab") c.y = crabY(c);
        else {
          if (Math.random() < dt * .15) c.targetY = rand(top, bottom);
          c.baseY += (c.targetY - c.baseY) * Math.min(1, dt * .5);
          c.y = c.baseY + Math.sin(time * sp.bobF + c.phase) * sp.bobA;
        }
        if (c.petT <= 0) {
          if (c.dir > 0 && c.x > W - b.w * .6) c.dir = -1;
          else if (c.dir < 0 && c.x < -b.w * .4) c.dir = 1;
          else if (Math.random() < dt * .03) c.dir *= -1;
        }
      }
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

    // 생물 위에 손가락을 꾹 대고 있으면 쓰다듬기
    for (const p of pointers.values()) {
      if (p.c && p.c.state === "swim" && time - p.t > HOLD_PET && hit(p.c, p.x, p.y)) pet(p.c, dt * 25, p);
    }

    for (const c of creatures) updateCreature(c, dt);
    const gone = creatures.filter((c) => c.state === "gone");
    if (gone.length) {
      creatures = creatures.filter((c) => c.state !== "gone");
      for (let i = 0; i < gone.length; i++) respawns.push(rand(2, 4.5));
    }

    updateHungry(dt);

    // 가끔 거대 생물 등장
    if (giant) updateGiant(dt);
    else if ((giantT -= dt) <= 0) { giantT = rand(40, 70); startGiant(); }
    dark += ((giant ? giant.darkTarget : 0) - dark) * Math.min(1, dt * 2);
    shake = giant ? giant.shake : 0;

    // 먹이는 천천히 가라앉아 바닥에 멈춤
    for (const fd of foods) {
      fd.life -= dt;
      const floor = floorAt(fd.x);
      if (fd.y < floor) {
        fd.y = Math.min(floor, fd.y + fd.vy * dt);
        fd.x += Math.sin(time * 2 + fd.ph) * dt * 3;
      }
    }
    foods = foods.filter((fd) => !fd.eaten && fd.life > 0);

    for (let i = respawns.length - 1; i >= 0; i--) {
      if (!giant && (respawns[i] -= dt) <= 0) { // 거대 생물이 있는 동안엔 새 친구 안 나옴
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
      } else if (p.t === "heart" || p.t === "spark") {
        p.x += p.vx * dt; p.y += p.vy * dt;
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
    if (c.fat > 0) { // 밥 먹을수록 배가 빵빵
      const k = c.fat * .07;
      lctx.translate(spr.w / 2, spr.h / 2);
      lctx.scale(1 + k * .4, 1 + k);
      lctx.translate(-spr.w / 2, -spr.h / 2);
    }
    lctx.globalAlpha = c.sp.alpha || 1;
    lctx.drawImage(spr.canvas, 0, 0);
    lctx.globalAlpha = 1;

    const mood = c.state !== "swim" ? "cry" : (c.flinch > 0 || c.scared) ? "squint" : c.happy > 0 ? "happy" : c.blinkT > 0 ? "blink" : "open";
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
      } else if (p.t === "heart") {
        lctx.globalAlpha = Math.min(1, (p.life / p.max) * 2);
        for (let r = 0; r < HEART.length; r++) {
          for (let k = 0; k < HEART[r].length; k++) {
            const ch = HEART[r][k];
            if (ch === ".") continue;
            lctx.fillStyle = ch === "W" ? "#ffd0de" : "#ff5c8a";
            lctx.fillRect(x - 2 + k, y - 2 + r, 1, 1);
          }
        }
        lctx.globalAlpha = 1;
      } else if (p.t === "spark") {
        lctx.globalAlpha = Math.min(1, (p.life / p.max) * 2);
        lctx.fillStyle = "#fff6a8";
        lctx.fillRect(x, y - 1, 1, 3); lctx.fillRect(x - 1, y, 3, 1);
        lctx.globalAlpha = 1;
      }
    }
  }

  function drawFoods() {
    for (const fd of foods) {
      const x = Math.round(fd.x), y = Math.round(fd.y);
      lctx.globalAlpha = Math.min(1, fd.life / 2);
      lctx.fillStyle = "#5a2a12"; lctx.fillRect(x - 1, y - 1, 4, 4);
      lctx.fillStyle = "#c8743a"; lctx.fillRect(x, y, 2, 2);
      lctx.fillStyle = "#f2b071"; lctx.fillRect(x, y, 1, 1);
    }
    lctx.globalAlpha = 1;
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
    const small = canvas.height / dpr < 500 ? .8 : 1; // 낮은 화면(가로 모드 휴대폰)은 글씨도 조금 작게
    const fs = Math.round((style === "bubble" ? 20 : 17) * small * dpr);
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
    if (dark > .01) { // 거대 생물 등장: 바다가 어두워짐
      lctx.fillStyle = `rgba(4,8,28,${dark})`;
      lctx.fillRect(0, 0, W, H);
    }
    if (giant) (giant.kind === "kraken" ? drawKraken : drawSwimmer)(giant);
    drawFoods();
    drawParticles();
    if (hungry && hungry.c.pose && !hungry.c.scared) { // 배고픈 친구 머리 위 콩콩 화살표
      const { spr, dx, dy } = hungry.c.pose;
      const ax = Math.round(dx + spr.w / 2), ay = Math.round(dy - 7 + Math.abs(Math.sin(time * 5)) * -3);
      lctx.fillStyle = OUTLINE;
      lctx.fillRect(ax - 4, ay - 1, 9, 4); lctx.fillRect(ax - 3, ay + 3, 7, 1);
      lctx.fillRect(ax - 2, ay + 4, 5, 1); lctx.fillRect(ax - 1, ay + 5, 3, 1); lctx.fillRect(ax, ay + 6, 1, 1);
      lctx.fillStyle = "#ffd23f";
      lctx.fillRect(ax - 3, ay, 7, 3); lctx.fillRect(ax - 2, ay + 3, 5, 1); lctx.fillRect(ax - 1, ay + 4, 3, 1); lctx.fillRect(ax, ay + 5, 1, 1);
    }

    // 픽셀 그대로 확대 (+ 화면 흔들림)
    ctx.imageSmoothingEnabled = false;
    const sx = shake > 0 ? Math.round(rand(-1, 1) * shake * P * dpr) : 0;
    const sy = shake > 0 ? Math.round(rand(-1, 1) * shake * P * dpr) : 0;
    if (sx || sy) { ctx.fillStyle = "#04081c"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(low, sx, sy, W * P * dpr, H * P * dpr);

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
    if (giant) {
      const g = giant;
      if (g.bannerT > 0) label(`⚠️ ${g.banner}`, canvas.width / 2, 64 * dpr, "tag", Math.min(1, g.bannerT));
      if (g.roarBubble > 0) {
        let bx = null, by = null;
        if (g.kind === "kraken" && g.shape) { bx = g.shape.cx * S; by = (g.shape.cy - g.shape.ry) * S; }
        else if (g.pose) { bx = (g.pose.dx + g.gw * (g.pose.flip ? .2 : .8)) * S; by = g.pose.dy * S; }
        if (bx !== null) label("크아아앙!", bx, by, "bubble", Math.min(1, g.roarBubble * 3));
      }
    }
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(.05, (ts - last) / 1000);
    last = ts;
    // 화면 회전 등으로 실제 크기가 바뀌었으면 다시 맞추기 (아이폰 홈 화면 앱은 resize 신호가 늦거나 빠름)
    if (canvas.clientWidth && (canvas.clientWidth !== lastCssW || canvas.clientHeight !== lastCssH)) onResize();
    update(dt);
    render();
    raf = requestAnimationFrame(loop);
  }

  function onResize() {
    if (!running) return;
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
    // 테스트용: 콘솔에서 SeaGame.giant("kraken" | "mosa" | "mega")
    giant: (kind) => { if (running) startGiant(kind); },
    // 테스트용: 시뮬레이션을 sec초만큼 빨리 돌리기
    advance: (sec) => { if (!running) return; for (let t = 0; t < sec; t += 1 / 30) update(1 / 30); render(); },
    // 테스트용: 배고픈 친구 입 앞에 먹이 떨어뜨리기 / 미션 상태 보기
    feedHungry: () => { if (hungry) { const [mx, my] = mouth(hungry.c); dropFood(mx, my); } },
    mission: () => hungry && { name: hungry.c.sp.name, got: hungry.got },
    start(cv, hint) {
      if (running) return;
      canvas = cv; ctx = cv.getContext("2d"); hintEl = hint;
      if (!SPECIES) {
        const built = buildSpecies();
        SPECIES = built.list; GIANTS = built.giants; DECOR = buildDecor();
      }
      screenEl = cv.parentElement;
      bar = Kids.missionBar(screenEl, askFeed);
      hungry = null; missionT = 6;
      layout();
      populate();
      pointers.clear();
      if (hintEl) hintEl.classList.remove("hide");
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      window.addEventListener("resize", onResize);
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
    stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      pointers.clear();
      window.removeEventListener("resize", onResize);
      hungry = null; bar.hide();
      try { speechSynthesis.cancel(); } catch { /* ignore */ }
    },
  };
})();
