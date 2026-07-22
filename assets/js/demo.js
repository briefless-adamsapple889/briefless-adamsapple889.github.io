/* demo.js — self-contained interactive "partial demos" embedded in case studies.
   Each init() is a no-op unless its root element exists on the page.
   Everything runs client-side; no backend. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = "http://www.w3.org/2000/svg";
  const el = (t, a = {}) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); return n; };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const won = (n) => n.toLocaleString("ko-KR") + "원";

  /* ============ 1. SafeIn multilingual notice translation ============ */
  function initTranslate(root) {
    const NOTICES = [
      { tag: "안전모 착용", ko: "안전모를 반드시 착용하세요.", t: {
        en: "Always wear your safety helmet.", zh: "请务必佩戴安全帽。",
        ja: "必ずヘルメットを着用してください。", vi: "Luôn đội mũ bảo hộ.",
        id: "Selalu kenakan helm pengaman.", ru: "Обязательно надевайте защитную каску." } },
      { tag: "크레인 작업", ko: "오늘 크레인 작업 중 — 하부 출입을 금지합니다.", t: {
        en: "Crane operation today — do not enter the area below.", zh: "今日起重机作业中——禁止进入下方区域。",
        ja: "本日クレーン作業中——下部への立ち入りを禁止します。", vi: "Hôm nay đang vận hành cần cẩu — cấm vào khu vực bên dưới.",
        id: "Hari ini ada pengoperasian derek — dilarang masuk ke area bawah.", ru: "Сегодня работает кран — вход в зону под ним запрещён." } },
      { tag: "미세먼지", ko: "미세먼지 ‘나쁨’ — 마스크를 착용하세요.", t: {
        en: "Fine dust level is high — please wear a mask.", zh: "雾霾严重——请佩戴口罩。",
        ja: "微小粒子状物質の濃度が高い——マスクを着用してください。", vi: "Bụi mịn ở mức xấu — hãy đeo khẩu trang.",
        id: "Tingkat debu halus buruk — harap kenakan masker.", ru: "Высокий уровень мелкой пыли — наденьте маску." } },
    ];
    const LANGS = [
      { k: "en", name: "English" }, { k: "zh", name: "中文" }, { k: "ja", name: "日本語" },
      { k: "vi", name: "Tiếng Việt" }, { k: "id", name: "Bahasa" }, { k: "ru", name: "Русский" },
    ];
    let cur = 0, activeLang = "en";
    const presetsEl = $(".tl-presets", root), srcEl = $(".tl-src .txt", root);
    const runBtn = $(".tl-run", root), outEl = $(".tl-out", root);

    NOTICES.forEach((n, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "tl-chip" + (i === 0 ? " active" : ""); b.textContent = n.tag;
      b.addEventListener("click", () => { cur = i; setPreset(); });
      presetsEl.appendChild(b);
    });
    function setPreset() {
      $$(".tl-chip", presetsEl).forEach((c, i) => c.classList.toggle("active", i === cur));
      srcEl.textContent = NOTICES[cur].ko; outEl.innerHTML = ""; runBtn.disabled = false;
    }
    runBtn.addEventListener("click", () => {
      runBtn.disabled = true;
      outEl.innerHTML = `<div class="tl-shimmer"><i></i><i></i><i></i></div><div class="tl-lat">온프레미스 vLLM 추론 중…</div>`;
      const t0 = performance.now();
      setTimeout(() => { render((performance.now() - t0) / 1000); runBtn.disabled = false; },
        reduced ? 60 : 560 + Math.random() * 420);
    });
    function render(latency) {
      activeLang = "en";
      outEl.innerHTML =
        `<div class="tl-tabs">${LANGS.map((l) => `<button class="tl-tab" data-l="${l.k}">${l.name}</button>`).join("")}</div>` +
        `<div class="tl-panel"></div>` +
        `<div class="tl-lat">Gemma · vLLM 응답 ${latency.toFixed(2)}s · 6개 언어 표시 · 외 9개 언어 지원</div>`;
      $$(".tl-tab", outEl).forEach((t) => t.addEventListener("click", () => { activeLang = t.dataset.l; showLang(); }));
      showLang();
    }
    function showLang() {
      $$(".tl-tab", outEl).forEach((t) => t.classList.toggle("active", t.dataset.l === activeLang));
      const p = $(".tl-panel", outEl);
      p.style.animation = "none"; void p.offsetWidth; p.style.animation = "";
      p.textContent = NOTICES[cur].t[activeLang];
    }
    setPreset();
  }

  /* ============ 2. Live parking detection (YOLO) ============ */
  function initDetect(root) {
    const svg = $("[data-spots]", root).ownerSVGElement;
    const spotsG = $("[data-spots]", root);
    const occEl = $("[data-occ]", root), fpsEl = $("[data-fps]", root),
      totalEl = $("[data-total]", root), clockEl = $("[data-clock]", svg), logEl = $("[data-log]", root);
    const runBtn = $("[data-run]", root);
    const N = 8, cols = 4;
    const spots = [];
    for (let i = 0; i < N; i++) {
      const c = i % cols, r = (i / cols) | 0;
      const x = 24 + c * 168, y = 56 + r * 88;
      spotsG.appendChild(el("rect", { class: "v-spot", x: x + 6, y: y + 6, width: 156, height: 74, rx: 4 }));
      const g = el("g", { opacity: 0 });
      const cx = x + 30, cy = y + 12;
      g.appendChild(el("rect", { class: "v-car", x: cx, y: cy, width: 100, height: 52, rx: 10 }));
      g.appendChild(el("rect", { class: "v-carroof", x: cx + 16, y: cy + 10, width: 68, height: 32, rx: 6 }));
      g.appendChild(el("rect", { class: "v-bbox", x: cx - 6, y: cy - 6, width: 112, height: 64 }));
      g.appendChild(el("rect", { class: "v-blabel-bg", x: cx - 6, y: cy - 20, width: 64, height: 15, rx: 2 }));
      const lab = el("text", { class: "v-blabel", x: cx - 1, y: cy - 9 }); g.appendChild(lab);
      spotsG.appendChild(g);
      spots.push({ occ: false, g, lab });
    }
    let total = 0, playing = true, timer = 0, t = 0;
    const pad = (n) => String(n).padStart(2, "0");
    function refresh() {
      const occ = spots.filter((s) => s.occ).length;
      occEl.textContent = occ;
      fpsEl.textContent = 28 + ((Math.random() * 4) | 0);
      totalEl.textContent = total;
      t += 1; clockEl.textContent = `${pad((t / 3600) | 0)}:${pad(((t / 60) | 0) % 60)}:${pad(t % 60)}`;
    }
    function log(html, cls) {
      const d = document.createElement("div");
      d.innerHTML = html; if (cls) d.className = cls;
      logEl.prepend(d);
      while (logEl.children.length > 6) logEl.lastChild.remove();
    }
    // seed a few occupied
    [0, 2, 5].forEach((i) => flip(i, true, true));
    function flip(i, toOcc, silent) {
      const s = spots[i];
      s.occ = toOcc;
      if (toOcc) {
        const conf = (0.86 + Math.random() * 0.12).toFixed(2);
        s.lab.textContent = `car ${conf}`;
        s.g.setAttribute("opacity", "1");
        if (!silent) log(`구역 ${i + 1} · <b>차량 감지</b> ${conf}`);
      } else {
        s.g.setAttribute("opacity", "0");
        if (!silent) log(`구역 ${i + 1} · <span class="out">빈자리</span>`, "");
      }
    }
    function tick() {
      const i = (Math.random() * N) | 0;
      flip(i, !spots[i].occ, false);
      refresh();
      timer = setTimeout(tick, reduced ? 2600 : 1100 + Math.random() * 1200);
    }
    refresh();
    function play() { if (!playing) return; clearTimeout(timer); timer = setTimeout(tick, 1400); }
    runBtn.addEventListener("click", () => {
      playing = !playing;
      runBtn.textContent = playing ? "❚❚ 일시정지" : "▶ 재생";
      if (playing) play(); else clearTimeout(timer);
    });
    // pause offscreen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { if (playing) play(); }
        else clearTimeout(timer);
      }), { threshold: 0.15 }).observe(root);
    } else play();
  }

  /* ============ 3. Fare calculator (before/after refactor) ============ */
  function initFare(root) {
    const METHODS = ["웹", "키오스크", "카카오페이", "월정액", "관리자"];
    const DISC = { "웹": 0, "키오스크": 0, "카카오페이": 0.05, "월정액": 0.2, "관리자": 0 };
    let mode = "before", dur = 90;
    const durEl = $("[data-dur]", root), rangeEl = $("[data-range]", root),
      resEl = $("[data-res]", root), flagEl = $("[data-flag]", root);
    $$("[data-mode]", root).forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.mode; $$("[data-mode]", root).forEach((x) => x.classList.toggle("active", x === b)); render();
    }));
    rangeEl.addEventListener("input", () => { dur = +rangeEl.value; render(); });

    const base = (d) => 1000 + Math.ceil(Math.max(0, d - 30) / 10) * 500;
    function fareAfter(m, b) { return Math.round(b * (1 - DISC[m])); }
    function fareBefore(m, b) {
      const disc = Math.round(b * (1 - DISC[m]));
      if (m === "키오스크") return disc + 100;                 // 결제 수수료 중복
      if (m === "관리자") return disc - 100;                   // 레거시 반올림 오차
      if (m === "카카오페이") return Math.round(b);            // 할인 누락
      if (m === "월정액") return Math.round(b * 0.8 * 0.9);    // 할인 이중 적용
      return disc;
    }
    function render() {
      const h = (dur / 60) | 0, mm = dur % 60;
      durEl.textContent = (h ? h + "시간 " : "") + (mm ? mm + "분" : (h ? "" : "0분"));
      const b = base(dur);
      const fn = mode === "before" ? fareBefore : fareAfter;
      const rows = METHODS.map((m) => ({ m, v: fn(m, b) }));
      resEl.innerHTML = rows.map((r) =>
        `<div class="fc-row"><span>${r.m}${DISC[r.m] ? ` <span style="color:var(--ink-3);font-size:.85em">-${DISC[r.m] * 100}%</span>` : ""}</span><span class="amt">${won(r.v)}</span></div>`
      ).join("");
      // consistency check on the three no-discount methods
      const flat = ["웹", "키오스크", "관리자"].map((m) => fn(m, b));
      const spread = Math.max(...flat) - Math.min(...flat);
      if (mode === "before") {
        flagEl.className = "fc-flag bad";
        flagEl.textContent = `⚠ 할인 없는 3개 수단(웹·키오스크·관리자)인데 금액이 ${won(Math.min(...flat))}~${won(Math.max(...flat))} — 최대 ${won(spread)} 불일치`;
      } else {
        flagEl.className = "fc-flag good";
        flagEl.textContent = `✓ 같은 정책은 항상 같은 금액. 차이는 오직 명시된 할인(카카오페이 −5%, 월정액 −20%)뿐`;
      }
    }
    render();
  }

  /* ============ 4. Heap usage timeline (leak vs fixed) ============ */
  function initHeap(root) {
    const canvas = $("canvas", root); if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const gcEl = $("[data-gc]", root), useEl = $("[data-use]", root);
    let mode = "before", W = 0, H = 0, dpr = 1;
    let heap = 30, samples = [], gcCount = 0, evstack = [], raf = 0, acc = 0, last = 0;
    $$("[data-mode]", root).forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.mode; $$("[data-mode]", root).forEach((x) => x.classList.toggle("active", x === b));
      heap = 30; samples = []; gcCount = 0; evstack = [];
    }));
    function resize() {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const leakBase = () => 30; // after: recovers to ~30
    function stepModel() {
      // allocations climb; GC fires near threshold
      heap += mode === "before" ? 1.1 + Math.random() * 0.6 : 1.4 + Math.random() * 0.7;
      const thresh = 88;
      if (heap >= thresh) {
        gcCount++;
        const floor = mode === "before"
          ? Math.min(78, 34 + gcCount * 3.2)   // leak: GC recovers less each time → creeps up
          : 30 + Math.random() * 4;            // fixed: back to baseline
        heap = floor;
        evstack.push({ x: samples.length, crash: mode === "before" && floor >= 74 });
        if (mode === "before" && floor >= 74) { gcCount = 0; heap = 30; } // OOM → restart
      }
      samples.push(heap);
      if (samples.length > 200) { samples.shift(); evstack.forEach((e) => e.x--); evstack = evstack.filter((e) => e.x >= 0); }
    }
    function draw() {
      ctx.fillStyle = "#141210"; ctx.fillRect(0, 0, W, H);
      const pad = 8, plotH = H - pad * 2;
      // threshold line
      ctx.strokeStyle = "rgba(219,67,34,.35)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      const ty = pad + plotH * (1 - 0.88); ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(W, ty); ctx.stroke();
      ctx.setLineDash([]);
      const n = samples.length; if (!n) return;
      const dx = W / 200;
      // area + line
      ctx.beginPath(); ctx.moveTo(0, H);
      samples.forEach((v, i) => ctx.lineTo(i * dx, pad + plotH * (1 - v / 100)));
      ctx.lineTo((n - 1) * dx, H); ctx.closePath();
      ctx.fillStyle = "rgba(219,67,34,.12)"; ctx.fill();
      ctx.beginPath();
      samples.forEach((v, i) => { const x = i * dx, y = pad + plotH * (1 - v / 100); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = mode === "before" ? "#ff6038" : "#4ec6a7"; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
      // crash markers
      evstack.forEach((e) => { if (e.crash) { ctx.fillStyle = "#f1ece2"; ctx.font = "10px monospace"; ctx.fillText("OOM·재기동", e.x * dx + 2, 14); } });
    }
    function loop(ts) {
      if (!last) last = ts; acc += ts - last; last = ts;
      const stepMs = 90;
      while (acc >= stepMs) { stepModel(); acc -= stepMs; }
      draw();
      if (useEl) useEl.textContent = Math.round(heap) + "%";
      if (gcEl) gcEl.textContent = mode === "before" ? "누수 있음" : "안정";
      raf = requestAnimationFrame(loop);
    }
    resize(); addEventListener("resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
        else { cancelAnimationFrame(raf); raf = 0; }
      }), { threshold: 0.1 }).observe(root);
    } else { raf = requestAnimationFrame(loop); }
  }

  /* ============ boot ============ */
  const boot = () => {
    const map = { "demo-translate": initTranslate, "demo-detect": initDetect, "demo-fare": initFare, "demo-heap": initHeap };
    for (const id in map) { const r = document.getElementById(id); if (r) try { map[id](r); } catch (e) { console.error(id, e); } }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
