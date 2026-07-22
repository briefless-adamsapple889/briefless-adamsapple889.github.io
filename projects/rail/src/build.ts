import type { Node } from "./parser.js";
import { Box, Choice, type Dia, Group, OneOrMore, Optional, Seq } from "./diagram.js";

/** Turn a parsed AST into a railroad diagram tree. */
export function build(node: Node): Dia {
  switch (node.t) {
    case "seq":
      return buildSeq(node.items);
    case "alt":
      return new Choice(node.opts.map(build));
    case "star":
      return new Optional(new OneOrMore(build(node.node), lazyTag(node.lazy)));
    case "plus":
      return new OneOrMore(build(node.node), lazyTag(node.lazy));
    case "opt":
      return new Optional(build(node.node));
    case "repeat":
      return buildRepeat(node);
    case "group":
      return new Group(build(node.node), groupCaption(node), groupClass(node.kind));
    case "class":
      return classBox(node);
    case "escape":
      return new Box(node.raw, node.label, "rr-esc");
    case "anchor":
      return new Box(anchorToken(node.kind), node.label, "rr-anchor");
    case "dot":
      return new Box(".", "아무 문자", "rr-dot");
    case "char":
      return charBox(node.value);
    case "empty":
      return new Box("ε", "비어 있음", "rr-empty");
  }
}

/** Merge runs of adjacent literal chars into one box: `abc` → one "abc". */
function buildSeq(items: Node[]): Dia {
  const parts: Dia[] = [];
  let run = "";
  const flush = () => {
    if (run) { parts.push(charBox(run)); run = ""; }
  };
  for (const it of items) {
    if (it.t === "char") run += it.value;
    else { flush(); parts.push(build(it)); }
  }
  flush();
  return parts.length === 1 ? parts[0]! : new Seq(parts);
}

function charBox(text: string): Dia {
  const shown = text.replace(/ /g, "␣");
  return new Box(shown, text.length > 1 ? "문자열" : null, "rr-char");
}

function lazyTag(lazy: boolean): string | null {
  return lazy ? "최소 매칭" : null;
}

function buildRepeat(node: Extract<Node, { t: "repeat" }>): Dia {
  const { min, max, lazy } = node;
  const inner = build(node.node);
  let label: string;
  if (max === null) label = `${min}회 이상`;
  else if (min === max) label = `정확히 ${min}회`;
  else label = `${min}–${max}회`;
  if (lazy) label += " · 최소";

  if (min === 0) return new Optional(new OneOrMore(inner, label));
  return new OneOrMore(inner, label);
}

function anchorToken(kind: string): string {
  if (kind === "start") return "^";
  if (kind === "end") return "$";
  if (kind === "word-b") return "\\b";
  return kind;
}

function groupClass(kind: string): string {
  if (kind === "capture") return "rr-g-cap";
  if (kind.includes("look")) return "rr-g-look";
  return "rr-g-plain";
}

function groupCaption(node: Extract<Node, { t: "group" }>): string {
  switch (node.kind) {
    case "capture":
      return node.name ? `그룹 «${node.name}»` : `그룹 #${node.index}`;
    case "group":
      return "묶음 (?:)";
    case "lookahead":
      return "뒤따름 (?=)";
    case "neg-lookahead":
      return "뒤따르지 않음 (?!)";
    case "lookbehind":
      return "앞섬 (?<=)";
    case "neg-lookbehind":
      return "앞서지 않음 (?<!)";
  }
}

function classBox(node: Extract<Node, { t: "class" }>): Dia {
  const inside = node.parts
    .map((p) =>
      p.kind === "range" ? `${p.from}-${p.to}` : p.kind === "escape" ? p.raw : p.value
    )
    .join("");
  const token = `[${node.negated ? "^" : ""}${inside}]`;
  const sub = node.negated ? "다음 중 아님" : "다음 중 하나";
  return new Box(token, sub, "rr-class");
}
