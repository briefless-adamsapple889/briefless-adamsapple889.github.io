import { randomBytes } from "node:crypto";
import type { Option, PollState } from "./types.js";

/**
 * In-memory poll store.
 *
 * There is no database on purpose. A live poll is ephemeral — it matters
 * for a few minutes and then it doesn't. So the entire dataset is a Map,
 * every mutation is O(1), and we sweep expired polls on an interval so the
 * process doesn't grow without bound. If a poll needed to survive a restart
 * it would be the wrong tool; that trade is the whole design.
 */

interface Poll {
  id: string;
  question: string;
  options: Map<string, Option>;
  order: string[]; // preserves option display order
  createdAt: number;
  closed: boolean;
  /** socket.id → optionId, so one connection counts once and can switch. */
  ballots: Map<string, string>;
}

const POLL_TTL_MS = 1000 * 60 * 60 * 6; // 6h
const MAX_OPTIONS = 8;
const MAX_LABEL = 80;
const MAX_QUESTION = 140;

/** url-safe base36-ish id; short enough to read over the phone. */
function makeId(bytes = 4): string {
  return randomBytes(bytes).toString("hex").slice(0, bytes * 2);
}

export class PollStore {
  private polls = new Map<string, Poll>();

  constructor() {
    setInterval(() => this.sweep(), 1000 * 60 * 10).unref?.();
  }

  create(question: string, rawOptions: string[]): string {
    const q = question.trim().slice(0, MAX_QUESTION) || "무엇을 고를까요?";
    const labels = rawOptions
      .map((o) => o.trim().slice(0, MAX_LABEL))
      .filter(Boolean)
      .slice(0, MAX_OPTIONS);
    if (labels.length < 2) throw new Error("선택지는 최소 2개가 필요합니다.");

    // human-readable, collision-checked id
    let id = makeId();
    while (this.polls.has(id)) id = makeId();

    const options = new Map<string, Option>();
    const order: string[] = [];
    labels.forEach((label) => {
      const oid = makeId(2);
      options.set(oid, { id: oid, label, votes: 0 });
      order.push(oid);
    });

    this.polls.set(id, {
      id, question: q, options, order,
      createdAt: Date.now(), closed: false, ballots: new Map(),
    });
    return id;
  }

  has(id: string): boolean {
    return this.polls.has(id);
  }

  /** Record (or switch) a vote. Returns true if state actually changed. */
  vote(pollId: string, optionId: string, voterId: string): boolean {
    const poll = this.polls.get(pollId);
    if (!poll || poll.closed) return false;
    const target = poll.options.get(optionId);
    if (!target) return false;

    const previous = poll.ballots.get(voterId);
    if (previous === optionId) return false; // no-op
    if (previous) {
      const prev = poll.options.get(previous);
      if (prev) prev.votes = Math.max(0, prev.votes - 1);
    }
    target.votes += 1;
    poll.ballots.set(voterId, optionId);
    return true;
  }

  /** Remove a voter's ballot when they disconnect from every poll. */
  forget(voterId: string): string[] {
    const touched: string[] = [];
    for (const poll of this.polls.values()) {
      const opt = poll.ballots.get(voterId);
      if (!opt) continue;
      const o = poll.options.get(opt);
      if (o) o.votes = Math.max(0, o.votes - 1);
      poll.ballots.delete(voterId);
      touched.push(poll.id);
    }
    return touched;
  }

  snapshot(pollId: string, viewers: number): PollState | null {
    const poll = this.polls.get(pollId);
    if (!poll) return null;
    const options = poll.order.map((oid) => ({ ...poll.options.get(oid)! }));
    return {
      id: poll.id,
      question: poll.question,
      options,
      totalVotes: options.reduce((s, o) => s + o.votes, 0),
      viewers,
      createdAt: poll.createdAt,
      closed: poll.closed,
    };
  }

  private sweep(): void {
    const now = Date.now();
    for (const [id, poll] of this.polls) {
      if (now - poll.createdAt > POLL_TTL_MS) this.polls.delete(id);
    }
  }

  get size(): number {
    return this.polls.size;
  }
}
