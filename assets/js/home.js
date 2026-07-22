/* home.js — cursor-following project preview + hero flourish */
(() => {
  "use strict";
  const canHover = window.matchMedia("(hover: hover)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const preview = document.querySelector(".work-preview");
  const img = preview && preview.querySelector("img");
  const rows = Array.from(document.querySelectorAll(".work-row[data-preview]"));

  if (preview && img && rows.length && canHover) {
    let tx = 0, ty = 0, x = 0, y = 0;
    let active = false;
    let raf = null;

    const loop = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      preview.style.transform =
        `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${active ? 1 : 0.85}) rotate(${active ? (tx - x) * 0.05 : -4}deg)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!raf && active) loop();
    }, { passive: true });

    rows.forEach((row) => {
      row.addEventListener("pointerenter", () => {
        const src = row.dataset.preview;
        if (img.getAttribute("src") !== src) img.setAttribute("src", src);
        active = true;
        preview.classList.add("show");
        if (!raf) loop();
      });
      row.addEventListener("pointerleave", () => {
        active = false;
        preview.classList.remove("show");
      });
    });
    // stop the rAF when nothing is active to save cycles
    preview.addEventListener("transitionend", () => {
      if (!active && raf) { cancelAnimationFrame(raf); raf = null; }
    });
  }

  /* hero: split the accent word into letters for a tiny stagger-in */
  if (!reduced) {
    const em = document.querySelector(".hero .em[data-split]");
    if (em) {
      const text = em.textContent;
      em.textContent = "";
      em.setAttribute("aria-label", text);
      [...text].forEach((ch, i) => {
        const s = document.createElement("span");
        s.textContent = ch;
        s.setAttribute("aria-hidden", "true");
        s.style.display = "inline-block";
        s.style.opacity = "0";
        s.style.transform = "translateY(0.5em)";
        s.style.transition = `opacity .6s ${480 + i * 45}ms var(--ease-out), transform .6s ${480 + i * 45}ms var(--ease-out)`;
        em.appendChild(s);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          s.style.opacity = "1"; s.style.transform = "none";
        }));
      });
    }
  }
})();
