import { parse, RegexError } from "./parser.js";
import { build } from "./build.js";
import { renderDiagram } from "./diagram.js";

const input = document.querySelector<HTMLInputElement>("#rx")!;
const stage = document.querySelector<HTMLDivElement>("#diagram")!;
const errBox = document.querySelector<HTMLDivElement>("#rx-error")!;
const chips = document.querySelector<HTMLDivElement>("#examples")!;

const EXAMPLES: Array<[string, string]> = [
  ["날짜", "\\d{4}-\\d{2}-\\d{2}"],
  ["이메일", "[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}"],
  ["HEX 색상", "#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})"],
  ["URL", "https?://(www\\.)?[\\w-]+\\.[a-z]{2,}(/\\S*)?"],
  ["24시간", "(0[0-9]|1[0-9]|2[0-3]):[0-5]\\d"],
  ["한국 휴대폰", "01[016-9]-\\d{3,4}-\\d{4}"],
];

/** allow pasting a full literal like /foo/gi — strip the slashes + flags */
function normalize(raw: string): string {
  const m = raw.match(/^\/(.*)\/[a-z]*$/i);
  return m ? m[1]! : raw;
}

function renderError(err: RegexError, pattern: string) {
  const pos = Math.min(err.pos, pattern.length);
  const caret = " ".repeat(pos) + "▲";
  errBox.hidden = false;
  errBox.innerHTML =
    `<div class="rr-err-msg">${err.message}</div>` +
    `<pre class="rr-err-ptr">${escapeHtml(pattern)}\n<span>${caret}</span></pre>`;
  stage.classList.add("dim");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function run() {
  const pattern = normalize(input.value.trim());
  if (!pattern) {
    stage.innerHTML = `<p class="rr-hint">정규식을 입력하면 여기 철길이 놓입니다.</p>`;
    errBox.hidden = true;
    stage.classList.remove("dim");
    return;
  }
  try {
    const ast = parse(pattern);
    stage.innerHTML = renderDiagram(build(ast));
    errBox.hidden = true;
    stage.classList.remove("dim");
  } catch (e) {
    if (e instanceof RegexError) renderError(e, pattern);
    else throw e;
  }
}

let timer = 0;
input.addEventListener("input", () => {
  clearTimeout(timer);
  timer = window.setTimeout(run, 120);
});

// example chips
EXAMPLES.forEach(([label, pattern]) => {
  const b = document.createElement("button");
  b.className = "rr-chip";
  b.type = "button";
  b.textContent = label;
  b.addEventListener("click", () => {
    input.value = pattern;
    run();
    input.focus();
  });
  chips.appendChild(b);
});

// boot with the email example — an instantly-legible diagram
input.value = EXAMPLES[1]![1];
run();
