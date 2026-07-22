import type { Option, PollState, JoinResult } from "./types";

/**
 * A tiny poll server that runs *in the browser*.
 *
 * When Livepoll is deployed to GitHub Pages there is no backend to talk to,
 * so the client falls back to this. It mirrors the real server's semantics
 * (create / join / vote / snapshot) and, crucially, spawns a handful of
 * simulated voters so the result bars actually move — a live poll that isn't
 * live is just a bar chart. Everything here is intentionally throwaway.
 */

type Listener = (s: PollState) => void;
const rid = (n = 5) => Math.random().toString(36).slice(2, 2 + n);
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;

interface SimPoll {
  id: string;
  question: string;
  options: Map<string, Option>;
  order: string[];
  createdAt: number;
  ballots: Map<string, string>; // voterId -> optionId
  bots: string[];
  weights: number[]; // per-option bot bias, makes a trend emerge
  viewers: number;
  timer: number | null;
}

export const ME = "me";

export class SimServer {
  private polls = new Map<string, SimPoll>();
  private listeners = new Map<string, Set<Listener>>();

  constructor() {
    this.seedDemo();
  }

  /** A poll that already exists on load, so the demo has a pulse immediately. */
  private seedDemo() {
    const id = "demo";
    const labels = [
      "Spaces",
      "Tabs",
      "Tab으로 들여쓰고 Space로 정렬",
      "몰라요, Prettier가 정합니다",
    ];
    this.build(id, "탭 vs 스페이스 — 당신의 진심은?", labels, [3, 1.4, 1.1, 4.2]);
    // pre-seed some history so it doesn't start at zero
    const p = this.polls.get(id)!;
    for (let i = 0; i < 37; i++) {
      const oid = this.weightedOption(p);
      p.ballots.set("seed-" + i, oid);
      p.options.get(oid)!.votes++;
    }
    p.bots = Array.from({ length: 11 }, (_, i) => "bot-" + i);
    p.viewers = 9;
  }

  private build(id: string, question: string, labels: string[], weights?: number[]) {
    const options = new Map<string, Option>();
    const order: string[] = [];
    labels.forEach((label) => {
      const oid = "o" + rid(3);
      options.set(oid, { id: oid, label, votes: 0 });
      order.push(oid);
    });
    this.polls.set(id, {
      id, question, options, order,
      createdAt: Date.now(),
      ballots: new Map(),
      bots: [],
      weights: weights ?? labels.map(() => 1 + Math.random()),
      viewers: 1,
      timer: null,
    });
  }

  private weightedOption(p: SimPoll): string {
    const total = p.weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < p.order.length; i++) {
      r -= p.weights[i]!;
      if (r <= 0) return p.order[i]!;
    }
    return p.order[0]!;
  }

  // ---- public API (shaped like the socket gateway) ----

  create(question: string, rawOptions: string[]): string {
    const labels = rawOptions.map((s) => s.trim()).filter(Boolean).slice(0, 8);
    if (labels.length < 2) throw new Error("선택지는 최소 2개가 필요합니다.");
    const id = rid(4);
    this.build(id, question.trim() || "무엇을 고를까요?", labels);
    // give freshly-made polls a few curious onlookers too
    const p = this.polls.get(id)!;
    p.bots = Array.from({ length: 4 + Math.floor(Math.random() * 5) }, (_, i) => "bot-" + i);
    p.viewers = 2;
    return id;
  }

  join(pollId: string): JoinResult {
    const p = this.polls.get(pollId);
    if (!p) return { ok: false, error: "존재하지 않는 투표입니다." };
    p.viewers++;
    return { ok: true, state: this.snapshot(p) };
  }

  leave(pollId: string) {
    const p = this.polls.get(pollId);
    if (p) p.viewers = Math.max(1, p.viewers - 1);
  }

  vote(pollId: string, optionId: string, voter = ME) {
    const p = this.polls.get(pollId);
    if (!p) return;
    const target = p.options.get(optionId);
    if (!target) return;
    const prev = p.ballots.get(voter);
    if (prev === optionId) return;
    if (prev) p.options.get(prev)!.votes = Math.max(0, p.options.get(prev)!.votes - 1);
    target.votes++;
    p.ballots.set(voter, optionId);
    this.emit(p);
  }

  subscribe(pollId: string, cb: Listener): () => void {
    let set = this.listeners.get(pollId);
    if (!set) this.listeners.set(pollId, (set = new Set()));
    set.add(cb);
    this.ensureTicking(pollId);
    return () => {
      set!.delete(cb);
      if (set!.size === 0) this.stopTicking(pollId);
    };
  }

  // ---- simulation loop ----

  private ensureTicking(pollId: string) {
    const p = this.polls.get(pollId);
    if (!p || p.timer != null) return;
    const tick = () => {
      // a bot votes (or switches), following the option bias
      if (p.bots.length && Math.random() < 0.85) {
        const bot = pick(p.bots);
        this.vote(pollId, this.weightedOption(p), bot);
      }
      // viewer count drifts to feel like people coming and going
      const drift = Math.random() < 0.5 ? -1 : 1;
      p.viewers = Math.max(1, Math.min(60, p.viewers + (Math.random() < 0.3 ? drift : 0)));
      this.emit(p);
      p.timer = window.setTimeout(tick, 650 + Math.random() * 1600);
    };
    p.timer = window.setTimeout(tick, 900);
  }

  private stopTicking(pollId: string) {
    const p = this.polls.get(pollId);
    if (p?.timer != null) { clearTimeout(p.timer); p.timer = null; }
  }

  private snapshot(p: SimPoll): PollState {
    const options = p.order.map((oid) => ({ ...p.options.get(oid)! }));
    return {
      id: p.id,
      question: p.question,
      options,
      totalVotes: options.reduce((s, o) => s + o.votes, 0),
      viewers: p.viewers,
      createdAt: p.createdAt,
      closed: false,
    };
  }

  private emit(p: SimPoll) {
    const set = this.listeners.get(p.id);
    if (!set) return;
    const snap = this.snapshot(p);
    // a touch of latency so it feels like a network, not a function call
    setTimeout(() => set.forEach((cb) => cb(snap)), 40 + Math.random() * 60);
  }

  myVote(pollId: string): string | undefined {
    return this.polls.get(pollId)?.ballots.get(ME);
  }
}
