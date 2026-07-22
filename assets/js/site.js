/* site.js — theme toggle, scroll reveals, small niceties.
   The no-FOUC theme boot runs inline in <head>; this wires the rest. */
(() => {
  "use strict";

  const root = document.documentElement;
  const STORE = "theme";

  const systemDark = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const current = () =>
    root.dataset.theme || (systemDark() ? "dark" : "light");

  function apply(theme, persist) {
    root.dataset.theme = theme;
    if (persist) {
      try { localStorage.setItem(STORE, theme); } catch (_) {}
    }
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(theme === "dark"));
      const lbl = btn.querySelector("[data-theme-label]");
      if (lbl) lbl.textContent = theme === "dark" ? "Light" : "Dark";
    });
    // keep embedded demos (iframes) in the same theme
    document.querySelectorAll("iframe[data-theme-sync]").forEach((f) => {
      try { f.contentWindow.postMessage({ type: "theme", value: theme }, "*"); } catch (_) {}
    });
  }

  // toggle buttons
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      apply(current() === "dark" ? "light" : "dark", true);
    });
  });
  apply(current(), false);

  // follow the OS if the user never made an explicit choice
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let stored = null;
    try { stored = localStorage.getItem(STORE); } catch (_) {}
    if (!stored) apply(e.matches ? "dark" : "light", false);
  });

  // ---- reveal on scroll ----
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  // ---- header hide on scroll down, show on scroll up ----
  const header = document.querySelector("[data-header]");
  if (header) {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle("is-stuck", y > 8);
      if (y > last && y > 220) header.classList.add("is-hidden");
      else header.classList.remove("is-hidden");
      last = y;
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
  }

  // ---- current year in footers ----
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
