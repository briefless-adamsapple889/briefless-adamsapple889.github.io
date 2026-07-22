/* flow.js — a flow field you can push around.
   Thousands of particles ride a vector field derived from value noise.
   No libraries; the whole thing is one canvas and a frame budget.
   Batched by colour bucket so a few thousand strokes cost a handful of draw calls. */
(() => {
  "use strict";
  const TAU = Math.PI * 2;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.getElementById("flow");
  const ctx = canvas.getContext("2d", { alpha: false });
  const stage = document.getElementById("flow-stage");
  const countLabel = document.getElementById("flow-count");

  // dark "gallery" stage regardless of site theme — this one's a picture, not a UI
  const BG = "#141210";
  const PALETTE = ["#db4322", "#e0a021", "#1c8f79", "#f1ece2"]; // vermilion, amber, teal, paper
  const BUCKETS = PALETTE.length;

  const CFG = { scale: 0.0016, speed: 1.5, fade: 0.055, push: 46, density: 1 };
  const DENSITIES = [1, 1.8, 0.5]; // cycle: 보통 / 빽빽 / 성기게

  /* ---- seedable value noise ---- */
  function makeNoise(seed) {
    const s = seed >>> 0;
    const hash = (i, j) => {
      let n = (i * 374761393 + j * 668265263 + s * 1442695040) | 0;
      n = (n ^ (n >> 13)) * 1274126177;
      return ((n ^ (n >> 16)) >>> 0) / 4294967295;
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const lerp = (a, b, t) => a + (b - a) * t;
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = smooth(xf), v = smooth(yf);
      const a = hash(xi, yi), b = hash(xi + 1, yi);
      const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      return lerp(lerp(a, b, u), lerp(c, d, u), v);
    };
  }

  let W = 0, H = 0, dpr = 1;
  let noise = makeNoise(1);
  let particles = [];
  let mouse = null;
  let playing = !reduced;
  let raf = 0;
  const drift = { x: 0, y: 0 };

  function targetCount() {
    return Math.min(6500, Math.round((W * H) / 260 * CFG.density));
  }

  function spawn(p) {
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.px = p.x; p.py = p.y;
    p.life = 60 + Math.random() * 240;
    return p;
  }

  function initParticles() {
    const n = targetCount();
    particles = Array.from({ length: n }, () => spawn({}));
    if (countLabel) countLabel.textContent = n.toLocaleString("ko-KR");
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = stage.getBoundingClientRect();
    W = Math.max(1, Math.floor(r.width));
    H = Math.max(1, Math.floor(r.height));
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    initParticles();
    if (reduced) { paintStatic(); }
  }

  function step() {
    // fade the previous frame slightly → silky trails
    ctx.fillStyle = BG;
    ctx.globalAlpha = CFG.fade;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    drift.x += 0.15; drift.y += 0.09; // let the field breathe

    const buckets = Array.from({ length: BUCKETS }, () => []);
    const R = 130, R2 = R * R;

    for (const p of particles) {
      p.px = p.x; p.py = p.y;
      const a = noise(p.x * CFG.scale + drift.x, p.y * CFG.scale + drift.y) * TAU * 2;
      let vx = Math.cos(a) * CFG.speed, vy = Math.sin(a) * CFG.speed;

      if (mouse) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (1 - d / R) * CFG.push / d;
          vx += dx * f; vy += dy * f;
        }
      }
      p.x += vx; p.y += vy;
      p.life--;

      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H || p.life <= 0) { spawn(p); continue; }
      const bi = ((a / TAU) % 1 + 1) % 1; // angle → bucket
      buckets[(bi * BUCKETS) | 0].push(p);
    }

    ctx.lineWidth = 1.15;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < BUCKETS; i++) {
      const list = buckets[i];
      if (!list.length) continue;
      ctx.strokeStyle = PALETTE[i];
      ctx.beginPath();
      for (const p of list) { ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function paintStatic() {
    // reduced-motion: advance a fixed number of steps once, then stop
    for (let i = 0; i < 90; i++) step();
  }

  function loop() {
    if (!playing) return;
    step();
    raf = requestAnimationFrame(loop);
  }
  function play() { if (!playing && !reduced) { playing = true; loop(); } }
  function pause() { playing = false; cancelAnimationFrame(raf); }

  /* ---- interaction ---- */
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  stage.addEventListener("pointermove", (e) => { mouse = toLocal(e); });
  stage.addEventListener("pointerleave", () => { mouse = null; });
  stage.addEventListener("pointerdown", (e) => { mouse = toLocal(e); CFG.push = 130; });
  window.addEventListener("pointerup", () => { CFG.push = 46; });

  /* ---- controls ---- */
  document.getElementById("flow-reseed")?.addEventListener("click", () => {
    noise = makeNoise((Math.random() * 1e9) | 0);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    initParticles();
    if (reduced) paintStatic();
  });
  let di = 0;
  document.getElementById("flow-density")?.addEventListener("click", (e) => {
    di = (di + 1) % DENSITIES.length;
    CFG.density = DENSITIES[di];
    initParticles();
    e.target.textContent = ["밀도 · 보통", "밀도 · 빽빽", "밀도 · 성기게"][di];
  });
  const playBtn = document.getElementById("flow-play");
  playBtn?.addEventListener("click", () => {
    if (playing) { pause(); playBtn.textContent = "재생"; }
    else { play(); playBtn.textContent = "정지"; }
  });
  if (reduced && playBtn) playBtn.textContent = "재생";

  let rt = 0;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 160); });

  // boot when visible (don't burn frames offscreen)
  resize();
  if (!reduced) {
    const io = new IntersectionObserver((es) => {
      es.forEach((en) => (en.isIntersecting ? play() : pause()));
    }, { threshold: 0.05 });
    io.observe(stage);
  }
})();
