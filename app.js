// ---------- 저장소 (실패해도 앱은 동작) ----------
const store = {
  get(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  },
};

// ---------- 메뉴 정보 ----------
const MENUS = {
  draw:   { icon: "🎨", title: "그림 그리기" },
  hangul: { icon: "🔤", title: "한글 놀이" },
  number: { icon: "🔢", title: "숫자 놀이" },
  story:  { icon: "📚", title: "동화 듣기" },
  music:  { icon: "🎵", title: "노래 부르기" },
};

const $ = (id) => document.getElementById(id);

// ---------- 시간대별 인사 ----------
function greetingText() {
  const h = new Date().getHours();
  if (h < 6)  return "아직 깜깜한 밤이에요 🌙";
  if (h < 12) return "좋은 아침이에요! ☀️";
  if (h < 18) return "신나는 오후예요! 🌈";
  return "포근한 저녁이에요 🌙";
}

// ---------- 이름 ----------
function renderName() {
  $("childName").textContent = store.get("childName", "친구");
}
$("nameBtn").addEventListener("click", () => {
  const current = store.get("childName", "");
  const name = prompt("이름을 알려줘!", current);
  if (name && name.trim()) {
    store.set("childName", name.trim().slice(0, 10));
    renderName();
  }
});

// ---------- 오늘의 별 (메뉴 하나 들어갈 때마다 1개, 하루 기준) ----------
function todayKey() {
  return "stars-" + new Date().toISOString().slice(0, 10);
}
function renderStars() {
  const n = Number(store.get(todayKey(), 0));
  $("stars").textContent = n > 0 ? "⭐".repeat(Math.min(n, 10)) : "아직 없어요 — 놀러 가 볼까?";
}
function addStar() {
  const n = Number(store.get(todayKey(), 0)) + 1;
  store.set(todayKey(), String(n));
}

// ---------- 효과음 ----------
let audioCtx;
function blip(freq = 660) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch { /* 소리 없이 진행 */ }
}
// ---------- 전체화면 (주소창/메뉴 숨기기) ----------
// 안드로이드 등에서 동작. 아이폰 Safari는 지원하지 않아서 버튼이 숨겨짐(홈 화면에 추가하면 전체화면)
const rootEl = document.documentElement;
const canFullscreen = !!(rootEl.requestFullscreen || rootEl.webkitRequestFullscreen);
const isAppMode = matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches ||
  navigator.standalone === true;
const isTouch = matchMedia("(pointer: coarse)").matches;

const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function enterFullscreen() {
  if (!canFullscreen || isAppMode || isFullscreen()) return;
  try {
    const req = rootEl.requestFullscreen || rootEl.webkitRequestFullscreen;
    const r = req.call(rootEl, { navigationUI: "hide" });
    if (r && r.catch) r.catch(() => {});
  } catch { /* 지원 안 함 */ }
}
function exitFullscreen() {
  try {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    const r = exit.call(document);
    if (r && r.catch) r.catch(() => {});
  } catch { /* ignore */ }
}
function updateFsBtn() {
  $("fsBtn").hidden = !canFullscreen || isAppMode;
  $("fsBtn").textContent = isFullscreen() ? "↩️ 작게 보기" : "📺 크게 보기";
}
$("fsBtn").addEventListener("click", () => (isFullscreen() ? exitFullscreen() : enterFullscreen()));
document.addEventListener("fullscreenchange", updateFsBtn);
document.addEventListener("webkitfullscreenchange", updateFsBtn);
updateFsBtn();

document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("click", () => {
    blip();
    addStar();
    // 휴대폰/태블릿에서 바다 체험에 들어가면 자동으로 전체화면
    if (card.getAttribute("href") === "#sea" && isTouch) enterFullscreen();
  });
});

// ---------- 화면 전환 (해시 라우팅) ----------
function route() {
  const key = location.hash.slice(1);
  const isSea = key === "sea";
  const menu = MENUS[key];
  $("home").hidden = !!menu || isSea;
  $("sub").hidden = !menu;
  $("seaScreen").hidden = !isSea;
  if (isSea) window.SeaGame.start($("seaCanvas"), $("seaHint"));
  else window.SeaGame.stop();
  if (menu) {
    $("subIcon").textContent = menu.icon;
    $("subTitle").textContent = menu.title;
  } else {
    renderStars();
  }
  window.scrollTo(0, 0);
}
$("backBtn").addEventListener("click", () => {
  blip(440);
  location.hash = "";
});
// '집으로'는 꾹(1초) 눌러야 나가기 — 아이가 실수로 나가지 않게
function holdToExit(btn, ms = 1000) {
  const label = btn.textContent;
  let timer = null, resetLabel = null;
  const cancel = () => { clearTimeout(timer); timer = null; btn.classList.remove("holding"); };
  const exit = () => { cancel(); btn.textContent = label; blip(440); location.hash = ""; };

  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    btn.classList.add("holding");
    timer = setTimeout(exit, ms);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((type) =>
    btn.addEventListener(type, () => {
      if (!timer) return;
      cancel();
      btn.textContent = "꾹~ 눌러야 나가요";
      clearTimeout(resetLabel);
      resetLabel = setTimeout(() => (btn.textContent = label), 1500);
    }));
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
  // 키보드(Enter/Space)로는 바로 나가기
  btn.addEventListener("click", (e) => { if (e.detail === 0) exit(); });
}
holdToExit($("seaBackBtn"));
window.addEventListener("hashchange", route);

// ---------- 시작 ----------
$("greeting").textContent = greetingText();
renderName();
route();
