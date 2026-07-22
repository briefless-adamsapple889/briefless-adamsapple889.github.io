/**
 * A tiny railroad-diagram layout engine.
 *
 * Every node reports three numbers — `width`, `up`, `down` — measured against a
 * horizontal rail line. `up`/`down` are how far it reaches above / below that
 * rail. Given those, `draw(x, y)` renders the node so its rail enters at (x, y)
 * and leaves at (x + width, y). Composition falls out for free: zero-or-more is
 * just optional(oneOrMore(x)).
 *
 * Branches are drawn as smooth cubic Béziers instead of SVG arcs — no sweep-flag
 * guesswork, and the curved rails read nicely.
 */
const H = 30; // box height (single line)
const SUB = 12; // extra height when a box has a meaning sub-label
const PADX = 13; // box horizontal padding
const GAP = 20; // gap between items in a sequence
const BR = 26; // horizontal room for a branch curve on each side
const VS = 14; // vertical separation between stacked branches
const GPAD = 14; // group inner padding
const CAP = 16; // group caption height
const LOOP = 16; // loop-back / bypass clearance
// text metrics via a shared canvas (accurate, unlike guessing char widths)
const MONO = '600 14px "JBMono", ui-monospace, "SFMono-Regular", monospace';
const SANS = '400 10px "Pretendard Variable", system-ui, sans-serif';
let ctx = null;
function measure(text, font) {
    if (!ctx)
        ctx = document.createElement("canvas").getContext("2d");
    if (!ctx)
        return text.length * 8;
    ctx.font = font;
    return ctx.measureText(text).width;
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** smooth horizontal S-curve from (x1,y1) to (x2,y2) */
function link(x1, y1, x2, y2, cls = "rr-rail") {
    if (y1 === y2)
        return `<path class="${cls}" d="M${x1} ${y1} H${x2}"/>`;
    const mx = (x1 + x2) / 2;
    return `<path class="${cls}" d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}"/>`;
}
/* ---------------- terminal box ---------------- */
export class Box {
    constructor(token, sub, cls) {
        this.token = token;
        this.sub = sub;
        this.cls = cls;
        const w = Math.max(measure(token, MONO), sub ? measure(sub, SANS) : 0);
        this.width = Math.max(Math.ceil(w) + PADX * 2, 30);
        this.h = H + (sub ? SUB : 0);
        this.up = this.h / 2;
        this.down = this.h / 2;
    }
    draw(x, y) {
        const top = y - this.h / 2;
        const r = this.cls.includes("kw") ? 6 : this.h / 2; // literals = pill, groups/kw = softer
        let s = `<rect class="rr-box ${this.cls}" x="${x}" y="${top}" width="${this.width}" height="${this.h}" rx="${r}"/>`;
        const cx = x + this.width / 2;
        if (this.sub) {
            s += `<text class="rr-tok" x="${cx}" y="${y - 3}">${esc(this.token)}</text>`;
            s += `<text class="rr-sub" x="${cx}" y="${y + 11}">${esc(this.sub)}</text>`;
        }
        else {
            s += `<text class="rr-tok" x="${cx}" y="${y + 5}">${esc(this.token)}</text>`;
        }
        return s;
    }
}
/* ---------------- sequence ---------------- */
export class Seq {
    constructor(items) {
        this.items = items;
        this.width = items.reduce((s, it) => s + it.width, 0) + GAP * Math.max(0, items.length - 1);
        this.up = Math.max(...items.map((i) => i.up), H / 2);
        this.down = Math.max(...items.map((i) => i.down), H / 2);
    }
    draw(x, y) {
        let out = "";
        let cx = x;
        this.items.forEach((it, i) => {
            if (i > 0) {
                out += link(cx, y, cx + GAP, y);
                cx += GAP;
            }
            out += it.draw(cx, y);
            cx += it.width;
        });
        return out;
    }
}
/* ---------------- choice (alternation) ---------------- */
export class Choice {
    constructor(opts) {
        this.opts = opts;
        this.offsets = []; // rail-y of each option, relative to entry y
        this.innerW = Math.max(...opts.map((o) => o.width));
        this.width = this.innerW + BR * 2;
        // first option on the entry rail; rest stacked below
        this.up = opts[0].up;
        let cursor = opts[0].down;
        this.offsets.push(0);
        for (let i = 1; i < opts.length; i++) {
            const o = opts[i];
            cursor += VS + o.up;
            this.offsets.push(cursor);
            cursor += o.down;
        }
        this.down = cursor;
    }
    draw(x, y) {
        const inX = x + BR;
        const outX = x + BR + this.innerW;
        const exit = x + this.width;
        let out = "";
        this.opts.forEach((o, i) => {
            const oy = y + this.offsets[i];
            out += link(x, y, inX, oy); // entry → option
            out += o.draw(inX, oy); // the option
            if (o.width < this.innerW)
                out += link(inX + o.width, oy, outX, oy); // right filler
            out += link(outX, oy, exit, y); // option → exit
        });
        return out;
    }
}
/* ---------------- optional (bypass above) ---------------- */
export class Optional {
    constructor(node) {
        this.node = node;
        this.width = node.width + BR * 2;
        this.archY = node.up + VS + LOOP;
        this.up = this.archY + 2;
        this.down = node.down;
    }
    draw(x, y) {
        const inX = x + BR, outX = x + BR + this.node.width, exit = x + this.width;
        let out = "";
        out += link(x, y, inX, y);
        out += this.node.draw(inX, y);
        out += link(outX, y, exit, y);
        // bypass arch over the top
        const ay = y - this.archY;
        out += `<path class="rr-rail" d="M${x} ${y} C${x + BR * 0.7} ${y} ${x + BR * 0.7} ${ay} ${inX} ${ay} H${outX} C${exit - BR * 0.7} ${ay} ${exit - BR * 0.7} ${y} ${exit} ${y}"/>`;
        return out;
    }
}
/* ---------------- one-or-more (loop below) ---------------- */
export class OneOrMore {
    constructor(node, label = null) {
        this.node = node;
        this.label = label;
        this.width = node.width + BR * 2;
        this.loopY = node.down + VS + LOOP;
        this.up = node.up;
        this.down = this.loopY + (label ? 12 : 4);
    }
    draw(x, y) {
        const inX = x + BR, outX = x + BR + this.node.width, exit = x + this.width;
        let out = "";
        out += link(x, y, inX, y);
        out += this.node.draw(inX, y);
        out += link(outX, y, exit, y);
        // loop back: from just after node, down and back to just before node
        const ly = y + this.loopY;
        out += `<path class="rr-rail rr-loop" d="M${outX} ${y} C${outX + BR * 0.6} ${y} ${outX + BR * 0.6} ${ly} ${outX} ${ly} H${inX} C${inX - BR * 0.6} ${ly} ${inX - BR * 0.6} ${y} ${inX} ${y}"/>`;
        // direction arrow on the loop
        const mid = (inX + outX) / 2;
        out += `<path class="rr-arrow" d="M${mid + 5} ${ly - 4} L${mid - 3} ${ly} L${mid + 5} ${ly + 4} Z"/>`;
        if (this.label)
            out += `<text class="rr-count" x="${mid}" y="${ly + 16}">${esc(this.label)}</text>`;
        return out;
    }
}
/* ---------------- group (labeled enclosure) ---------------- */
export class Group {
    constructor(node, caption, cls) {
        this.node = node;
        this.caption = caption;
        this.cls = cls;
        this.width = node.width + GPAD * 2;
        this.up = node.up + GPAD + CAP;
        this.down = node.down + GPAD;
    }
    draw(x, y) {
        const inX = x + GPAD, outX = x + GPAD + this.node.width, exit = x + this.width;
        const top = y - this.node.up - GPAD - CAP;
        const height = this.node.up + this.node.down + GPAD * 2 + CAP;
        let out = `<rect class="rr-group ${this.cls}" x="${x}" y="${top}" width="${this.width}" height="${height}" rx="8"/>`;
        out += `<text class="rr-cap" x="${x + 8}" y="${top + 12}">${esc(this.caption)}</text>`;
        out += link(x, y, inX, y);
        out += this.node.draw(inX, y);
        out += link(outX, y, exit, y);
        return out;
    }
}
/* ---------------- the whole diagram (start ● … end ●) ---------------- */
export function renderDiagram(root) {
    const M = 22; // outer margin
    const STUB = 18; // rail stub around the terminals
    const dotR = 6;
    const bodyW = root.width;
    const y = M + root.up;
    const width = M * 2 + STUB * 2 + bodyW + dotR * 2;
    const height = root.up + root.down + M * 2;
    const startX = M + dotR;
    const bodyX = startX + STUB;
    const endX = bodyX + bodyW + STUB;
    const cw = Math.ceil(width), ch = Math.ceil(height);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}" class="rr-svg" role="img" aria-label="정규식 철도 다이어그램">`;
    s += `<circle class="rr-node" cx="${startX}" cy="${y}" r="${dotR}"/>`;
    s += link(startX, y, bodyX, y);
    s += root.draw(bodyX, y);
    s += link(bodyX + bodyW, y, endX, y);
    s += `<circle class="rr-node" cx="${endX}" cy="${y}" r="${dotR}"/>`;
    s += `</svg>`;
    return s;
}
export { H as BOX_H };
//# sourceMappingURL=diagram.js.map