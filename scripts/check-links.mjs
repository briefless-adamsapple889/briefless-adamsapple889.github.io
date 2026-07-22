#!/usr/bin/env node
/**
 * Static internal-link checker for the site.
 * Walks every .html file, resolves local href/src targets, and fails (exit 1)
 * if any point to a missing file. Skips external links, mailto/tel/#anchors,
 * and Vite dev entry files under /web/ (their /src/*.tsx are dev-only).
 *
 * Usage: node scripts/check-links.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IGNORE_DIRS = new Set(["node_modules", ".git", ".github"]);

const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name.endsWith(".html")) htmlFiles.push(p);
  }
})(ROOT);

const attrRe = /(?:href|src)\s*=\s*"([^"]+)"/g;
let checked = 0;
const missing = [];

for (const file of htmlFiles) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  // Vite source entry points reference /src/*.tsx which only exist at dev time
  if (rel.includes("/web/")) continue;
  const html = readFileSync(file, "utf8");
  let m;
  while ((m = attrRe.exec(html))) {
    let ref = m[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/|#)/i.test(ref)) continue;
    ref = ref.split("#")[0].split("?")[0];
    if (!ref) continue;
    checked++;
    const target = ref.startsWith("/") ? join(ROOT, ref) : resolve(dirname(file), ref);
    let ok = existsSync(target);
    if (ok && statSync(target).isDirectory()) ok = existsSync(join(target, "index.html"));
    if (!ok) missing.push(`${rel}  →  ${m[1]}`);
  }
}

console.log(`checked ${checked} local links across ${htmlFiles.length} html files`);
if (missing.length) {
  console.error(`\n✗ ${missing.length} broken link(s):`);
  for (const x of missing) console.error("  " + x);
  process.exit(1);
}
console.log("✓ no broken internal links");
