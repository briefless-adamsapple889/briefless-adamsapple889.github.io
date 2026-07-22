/**
 * A small recursive-descent parser for a practical subset of JavaScript regex.
 * No library — the whole point of this project was to write the parser by hand
 * and watch a grammar turn into a tree.
 *
 * grammar (roughly):
 *   alternation := sequence ('|' sequence)*
 *   sequence    := quantified*
 *   quantified  := atom quantifier?
 *   quantifier  := ('*' | '+' | '?' | '{' m (',' n?)? '}') '?'?      // trailing ? = lazy
 *   atom        := group | class | escape | anchor | dot | literal
 */
export class RegexError extends Error {
    constructor(message, pos) {
        super(message);
        this.pos = pos;
        this.name = "RegexError";
    }
}
const ESCAPE_LABELS = {
    d: "숫자", D: "숫자 아님", w: "단어문자", W: "단어문자 아님",
    s: "공백", S: "공백 아님", n: "줄바꿈", r: "캐리지리턴", t: "탭",
    f: "폼피드", v: "세로탭", "0": "널",
};
const ANCHOR_ESCAPES = { b: "단어 경계", B: "단어 경계 아님" };
export function parse(src) {
    return new Parser(src).parseTop();
}
class Parser {
    constructor(src) {
        this.src = src;
        this.pos = 0;
        this.captures = 0;
    }
    peek(o = 0) { return this.src[this.pos + o] ?? ""; }
    next() { return this.src[this.pos++] ?? ""; }
    eof() { return this.pos >= this.src.length; }
    expect(ch) {
        if (this.peek() !== ch)
            throw new RegexError(`'${ch}' 를 기대했지만 '${this.peek() || "끝"}' 를 만났습니다`, this.pos);
        this.pos++;
    }
    parseTop() {
        if (this.src === "")
            return { t: "empty" };
        const node = this.parseAlternation();
        if (!this.eof())
            throw new RegexError(`예상치 못한 '${this.peek()}'`, this.pos);
        return node;
    }
    parseAlternation() {
        const opts = [this.parseSequence()];
        while (this.peek() === "|") {
            this.next();
            opts.push(this.parseSequence());
        }
        return opts.length === 1 ? opts[0] : { t: "alt", opts };
    }
    parseSequence() {
        const items = [];
        while (!this.eof() && this.peek() !== "|" && this.peek() !== ")") {
            items.push(this.parseQuantified());
        }
        if (items.length === 0)
            return { t: "empty" };
        return items.length === 1 ? items[0] : { t: "seq", items };
    }
    parseQuantified() {
        const atom = this.parseAtom();
        const q = this.peek();
        if (q === "*" || q === "+" || q === "?") {
            this.next();
            const lazy = this.peek() === "?" ? (this.next(), true) : false;
            if (q === "*")
                return { t: "star", node: atom, lazy };
            if (q === "+")
                return { t: "plus", node: atom, lazy };
            return { t: "opt", node: atom, lazy };
        }
        if (q === "{")
            return this.parseRepeat(atom);
        return atom;
    }
    parseRepeat(atom) {
        const start = this.pos;
        this.expect("{");
        const min = this.readInt();
        if (min === null)
            throw new RegexError("{ 뒤에는 숫자가 와야 합니다", start);
        let max = min;
        if (this.peek() === ",") {
            this.next();
            max = this.readInt(); // null → 무한 (예: {2,})
        }
        this.expect("}");
        const lazy = this.peek() === "?" ? (this.next(), true) : false;
        return { t: "repeat", node: atom, min, max, lazy };
    }
    readInt() {
        let s = "";
        while (/[0-9]/.test(this.peek()))
            s += this.next();
        return s === "" ? null : parseInt(s, 10);
    }
    parseAtom() {
        const ch = this.peek();
        if (ch === "(")
            return this.parseGroup();
        if (ch === "[")
            return this.parseClass();
        if (ch === "\\")
            return this.parseEscape();
        if (ch === ".") {
            this.next();
            return { t: "dot" };
        }
        if (ch === "^") {
            this.next();
            return { t: "anchor", kind: "start", label: "줄 시작" };
        }
        if (ch === "$") {
            this.next();
            return { t: "anchor", kind: "end", label: "줄 끝" };
        }
        if (ch === "*" || ch === "+" || ch === "?")
            throw new RegexError(`'${ch}' 앞에 대상이 없습니다`, this.pos);
        if (ch === "")
            throw new RegexError("갑자기 끝났습니다", this.pos);
        this.next();
        return { t: "char", value: ch };
    }
    parseGroup() {
        this.expect("(");
        let kind = "capture";
        let name;
        let index;
        if (this.peek() === "?") {
            this.next();
            const marker = this.peek();
            if (marker === ":") {
                this.next();
                kind = "group";
            }
            else if (marker === "=") {
                this.next();
                kind = "lookahead";
            }
            else if (marker === "!") {
                this.next();
                kind = "neg-lookahead";
            }
            else if (marker === "<") {
                this.next();
                const c = this.peek();
                if (c === "=") {
                    this.next();
                    kind = "lookbehind";
                }
                else if (c === "!") {
                    this.next();
                    kind = "neg-lookbehind";
                }
                else { // named group (?<name>…)
                    kind = "capture";
                    let n = "";
                    while (this.peek() && this.peek() !== ">")
                        n += this.next();
                    this.expect(">");
                    name = n;
                    index = ++this.captures;
                }
            }
            else
                throw new RegexError(`알 수 없는 그룹 지정자 '?${marker}'`, this.pos);
        }
        else {
            index = ++this.captures;
        }
        const node = this.parseAlternation();
        this.expect(")");
        return { t: "group", node, kind, name, index };
    }
    parseClass() {
        this.expect("[");
        const negated = this.peek() === "^" ? (this.next(), true) : false;
        const parts = [];
        while (!this.eof() && this.peek() !== "]") {
            if (this.peek() === "\\") {
                const raw = this.next() + this.next();
                const key = raw[1];
                parts.push({ kind: "escape", raw, label: ESCAPE_LABELS[key] ?? raw });
                continue;
            }
            const from = this.next();
            if (this.peek() === "-" && this.peek(1) !== "]" && this.peek(1) !== "") {
                this.next(); // consume '-'
                const to = this.next();
                parts.push({ kind: "range", from, to });
            }
            else {
                parts.push({ kind: "char", value: from });
            }
        }
        this.expect("]");
        if (parts.length === 0)
            throw new RegexError("빈 문자 클래스입니다", this.pos);
        return { t: "class", negated, parts };
    }
    parseEscape() {
        this.expect("\\");
        const ch = this.next();
        if (ch === "")
            throw new RegexError("백슬래시 뒤가 비었습니다", this.pos);
        if (ANCHOR_ESCAPES[ch])
            return { t: "anchor", kind: "word-b", label: ANCHOR_ESCAPES[ch] };
        if (ESCAPE_LABELS[ch])
            return { t: "escape", raw: "\\" + ch, label: ESCAPE_LABELS[ch] };
        // escaped literal (\. \+ \\ 등)
        return { t: "char", value: ch };
    }
}
//# sourceMappingURL=parser.js.map