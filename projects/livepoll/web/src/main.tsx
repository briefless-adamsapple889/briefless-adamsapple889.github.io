import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// The app is embedded in an <iframe> on the project page. Accept the parent's
// theme via ?theme=… on load, and stay in sync if it posts a change later.
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const initial = params.get("theme");
if (initial === "dark" || initial === "light") root.dataset.theme = initial;

window.addEventListener("message", (e) => {
  if (e.data?.type === "theme" && (e.data.value === "dark" || e.data.value === "light")) {
    root.dataset.theme = e.data.value;
  }
});

// If the page was opened with ?poll=CODE, that's handled inside App via join;
// here we just boot.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
