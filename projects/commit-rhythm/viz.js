/* viz.js — "새벽의 커밋" data story. Uses d3 (v7, UMD global) for scales,
   arcs and stacks; the rest is hand-rolled SVG so the geometry stays legible.
   Everything is wrapped so one bad chart can't blank the whole story. */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const el = (t, a = {}) => {
    const n = document.createElementNS(NS, t);
    for (const k in a) n.setAttribute(k, a[k]);
    return n;
  };
  const $ = (s) => document.querySelector(s);
  const nf = new Intl.NumberFormat("ko-KR");
  const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
  const LANGS = [
    { key: "ts", label: "TypeScript", c: "#db4322" },
    { key: "py", label: "Python", c: "#1c8f79" },
    { key: "js", label: "JavaScript", c: "#e0a021" },
    { key: "css", label: "CSS", c: "#3f7cac" },
    { key: "sql", label: "SQL", c: "#8a5cc0" },
    { key: "other", label: "기타", c: "#9a9086" },
  ];
  const safe = (name, fn) => { try { fn(); } catch (e) { console.error(name, e); } };

  fetch("./data.json")
    .then((r) => r.json())
    .then((data) => {
      safe("stats", () => stats(data));
      safe("calendar", () => calendar(data));
      safe("punch", () => punch(data));
      safe("months", () => months(data));
      safe("langs", () => langs(data));
      const n = $("#cr-note");
      if (n) n.textContent = data.note;
    })
    .catch((e) => {
      const s = $("#cr-stage");
      if (s) s.innerHTML = '<p class="cr-hint">데이터를 불러오지 못했습니다.</p>';
      console.error(e);
    });

  /* ---- summary stat tiles ---- */
  function stats(d) {
    const s = d.summary;
    const tiles = [
      [nf.format(s.total), "커밋", "지난 " + s.span],
      [s.longestStreak + "일", "최장 연속", "쉬지 않고"],
      [s.nightShare + "%", "밤에 (22–02시)", "역시 야행성"],
      [`${String(s.peakHour).padStart(2, "0")}시 · ${DAYS[s.peakDay]}`, "가장 뜨거운 시각", "peak"],
      [nf.format(s.activeDays), "코딩한 날", "총 1,096일 중"],
    ];
    const wrap = $("#cr-stats");
    tiles.forEach(([big, label, sub]) => {
      const t = document.createElement("div");
      t.className = "cr-tile";
      t.innerHTML = `<b>${big}</b><span class="lab">${label}</span><span class="sub">${sub}</span>`;
      wrap.appendChild(t);
    });
  }

  /* ---- GitHub-style contribution calendar (last ~53 weeks) ---- */
  function calendar(d) {
    const cell = 13, gap = 3, step = cell + gap;
    const start = new Date(d.start + "T00:00:00Z");
    const daily = d.daily;
    // align the window start to a Monday
    const WEEKS = 53;
    let sliceStart = daily.length - WEEKS * 7;
    // move back to Monday
    const dowAt = (i) => (new Date(start.getTime() + i * 86400000).getUTCDay() + 6) % 7;
    while (sliceStart > 0 && dowAt(sliceStart) !== 0) sliceStart--;
    const cols = Math.ceil((daily.length - sliceStart) / 7);

    const nz = daily.filter((v) => v > 0).sort((a, b) => a - b);
    const q = (p) => nz[Math.floor(p * (nz.length - 1))] || 1;
    const th = [q(0.25), q(0.5), q(0.75), q(0.9)];
    const bucket = (v) => (v === 0 ? 0 : v <= th[0] ? 1 : v <= th[1] ? 2 : v <= th[2] ? 3 : 4);
    const OP = [0, 0.22, 0.45, 0.7, 1];

    const W = 40 + cols * step, H = 22 + 7 * step;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "cr-svg cal" });
    // day labels
    [0, 2, 4, 6].forEach((r) => {
      const t = el("text", { x: 4, y: 26 + r * step, class: "cr-axis" });
      t.textContent = DAYS[r];
      svg.appendChild(t);
    });
    let lastMonth = -1;
    for (let i = sliceStart, idx = 0; i < daily.length; i++, idx++) {
      const col = Math.floor(idx / 7), row = idx % 7;
      const date = new Date(start.getTime() + i * 86400000);
      const b = bucket(daily[i]);
      const rect = el("rect", {
        x: 34 + col * step, y: 18 + row * step, width: cell, height: cell, rx: 3,
        class: b === 0 ? "cal-cell empty" : "cal-cell",
        "fill-opacity": b === 0 ? 1 : OP[b],
      });
      const title = el("title");
      title.textContent = `${date.toISOString().slice(0, 10)} · ${daily[i]} commits`;
      rect.appendChild(title);
      svg.appendChild(rect);
      // month labels on top
      const m = date.getUTCMonth();
      if (row === 0 && m !== lastMonth) {
        lastMonth = m;
        const t = el("text", { x: 34 + col * step, y: 12, class: "cr-axis" });
        t.textContent = `${m + 1}월`;
        svg.appendChild(t);
      }
    }
    mount("#cr-calendar", svg);
    // legend
    const lg = document.createElement("div");
    lg.className = "cr-scale";
    lg.innerHTML = "적음 " + OP.map((o) =>
      `<span class="sw" style="background:var(--accent);opacity:${o || 0.12}"></span>`).join("") + " 많음";
    $("#cr-calendar").appendChild(lg);
  }

  /* ---- punchcard: hour × weekday ---- */
  function punch(d) {
    const P = d.punch; // [7][24]
    const R = 13, padL = 34, padT = 12, padB = 22;
    const W = padL + 24 * R + 10, H = padT + 7 * R + padB;
    const max = Math.max(...P.flat());
    const rScale = d3.scaleSqrt().domain([0, max]).range([0, R / 2 - 1]);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "cr-svg" });
    for (let day = 0; day < 7; day++) {
      const t = el("text", { x: 4, y: padT + day * R + R / 2 + 3, class: "cr-axis" });
      t.textContent = DAYS[day];
      svg.appendChild(t);
      for (let h = 0; h < 24; h++) {
        const v = P[day][h];
        if (v > 0) {
          const c = el("circle", {
            cx: padL + h * R + R / 2, cy: padT + day * R + R / 2,
            r: rScale(v), class: "cr-dot",
          });
          const ti = el("title"); ti.textContent = `${DAYS[day]} ${h}시 · ${v} commits`;
          c.appendChild(ti); svg.appendChild(c);
        }
      }
    }
    [0, 6, 12, 18, 23].forEach((h) => {
      const t = el("text", { x: padL + h * R + R / 2, y: H - 6, class: "cr-axis mid" });
      t.textContent = h + "시";
      svg.appendChild(t);
    });
    mount("#cr-punch", svg);
  }

  /* ---- monthly commits, stacked by language ---- */
  function months(d) {
    const M = d.monthly;
    const W = Math.max(680, M.length * 20), H = 260, padL = 40, padB = 30, padT = 14;
    const max = Math.max(...M.map((m) => m.total));
    const y = d3.scaleLinear().domain([0, max]).range([H - padB, padT]).nice();
    const bw = (W - padL - 12) / M.length;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "cr-svg" });
    // y grid
    y.ticks(4).forEach((tv) => {
      svg.appendChild(el("line", { x1: padL, x2: W - 6, y1: y(tv), y2: y(tv), class: "cr-grid" }));
      const t = el("text", { x: padL - 6, y: y(tv) + 3, class: "cr-axis end" });
      t.textContent = tv; svg.appendChild(t);
    });
    M.forEach((m, i) => {
      let acc = 0;
      const x = padL + i * bw;
      LANGS.forEach((L) => {
        const v = m.langs[L.key] || 0;
        if (v <= 0) return;
        const y0 = y(acc), y1 = y(acc + v);
        acc += v;
        svg.appendChild(el("rect", {
          x: x + 1, y: y1, width: Math.max(1, bw - 2), height: Math.max(0, y0 - y1),
          fill: L.c, class: "cr-mbar",
        }));
      });
      if (i % 6 === 0) {
        const t = el("text", { x: x + bw / 2, y: H - 8, class: "cr-axis mid" });
        t.textContent = m.ym.slice(2).replace("-", "/");
        svg.appendChild(t);
      }
    });
    mount("#cr-months", svg);
  }

  /* ---- language donut ---- */
  function langs(d) {
    const total = Object.values(d.langs).reduce((a, b) => a + b, 0);
    const data = LANGS.map((L) => ({ ...L, v: d.langs[L.key] || 0 })).filter((x) => x.v > 0);
    const size = 220, r = 100, r0 = 62;
    const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: "cr-svg" });
    const g = el("g", { transform: `translate(${size / 2},${size / 2})` });
    const pie = d3.pie().sort(null).value((x) => x.v)(data);
    const arc = d3.arc().innerRadius(r0).outerRadius(r).padAngle(0.015).cornerRadius(3);
    pie.forEach((p) => {
      const path = el("path", { d: arc(p), fill: p.data.c, class: "cr-arc" });
      const ti = el("title");
      ti.textContent = `${p.data.label} · ${Math.round((p.data.v / total) * 100)}%`;
      path.appendChild(ti); g.appendChild(path);
    });
    const c = el("text", { x: 0, y: -4, class: "cr-donut-num", "text-anchor": "middle" });
    c.textContent = nf.format(total);
    const c2 = el("text", { x: 0, y: 14, class: "cr-donut-lab", "text-anchor": "middle" });
    c2.textContent = "commits";
    g.append(c, c2);
    svg.appendChild(g);
    mount("#cr-donut", svg);
    // legend
    const lg = $("#cr-legend");
    data.sort((a, b) => b.v - a.v).forEach((x) => {
      const row = document.createElement("div");
      row.className = "cr-leg-row";
      row.innerHTML = `<span class="sw" style="background:${x.c}"></span>
        <span class="nm">${x.label}</span>
        <span class="pc">${Math.round((x.v / total) * 100)}%</span>`;
      lg.appendChild(row);
    });
  }

  function mount(sel, svg) {
    const host = $(sel);
    if (host) host.prepend(svg);
  }
})();
