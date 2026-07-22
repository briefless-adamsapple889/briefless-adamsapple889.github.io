import { io, type Socket } from "socket.io-client";
import { SimServer } from "./simServer";
import type { JoinResult, Mode, PollState } from "./types";

/**
 * One interface, two backends.
 *
 * The app never knows whether it's talking to a real Socket.IO server or the
 * in-browser SimServer — it just calls create / join / vote / subscribe. That
 * seam is what lets the same build run live in dev and as a self-contained
 * demo on GitHub Pages.
 */
export interface Transport {
  readonly mode: Mode;
  create(question: string, options: string[]): Promise<string>;
  join(pollId: string): Promise<JoinResult>;
  vote(pollId: string, optionId: string): void;
  leave(pollId: string): void;
  subscribe(pollId: string, cb: (s: PollState) => void): () => void;
  myVote(pollId: string): string | undefined;
  dispose(): void;
}

/* ---------------- live: real Socket.IO ---------------- */
class LiveTransport implements Transport {
  readonly mode = "live" as const;
  private socket: Socket;
  private mine = new Map<string, string>();

  constructor(url: string) {
    this.socket = io(url, { transports: ["websocket", "polling"] });
  }

  create(question: string, options: string[]): Promise<string> {
    return this.socket
      .timeout(5000)
      .emitWithAck("poll:create", { question, options })
      .then((r: any) => {
        if (r?.ok) return r.pollId as string;
        throw new Error(r?.error ?? "생성에 실패했습니다.");
      });
  }

  join(pollId: string): Promise<JoinResult> {
    return this.socket
      .timeout(5000)
      .emitWithAck("poll:join", { pollId })
      .catch(() => ({ ok: false, error: "서버에 연결할 수 없습니다." })) as Promise<JoinResult>;
  }

  vote(pollId: string, optionId: string) {
    this.mine.set(pollId, optionId);
    this.socket.emit("poll:vote", { pollId, optionId });
  }

  leave(pollId: string) {
    this.socket.emit("poll:leave", { pollId });
  }

  subscribe(pollId: string, cb: (s: PollState) => void): () => void {
    const handler = (s: PollState) => { if (s.id === pollId) cb(s); };
    this.socket.on("poll:state", handler);
    return () => { this.socket.off("poll:state", handler); };
  }

  myVote(pollId: string) {
    return this.mine.get(pollId);
  }

  dispose() {
    this.socket.close();
  }
}

/* ---------------- sim: SimServer wrapper ---------------- */
class SimTransport implements Transport {
  readonly mode = "sim" as const;
  private sim = new SimServer();

  create(question: string, options: string[]) {
    return Promise.resolve().then(() => this.sim.create(question, options));
  }
  join(pollId: string) {
    return new Promise<JoinResult>((res) =>
      setTimeout(() => res(this.sim.join(pollId)), 120)
    );
  }
  vote(pollId: string, optionId: string) { this.sim.vote(pollId, optionId); }
  leave(pollId: string) { this.sim.leave(pollId); }
  subscribe(pollId: string, cb: (s: PollState) => void) { return this.sim.subscribe(pollId, cb); }
  myVote(pollId: string) { return this.sim.myVote(pollId); }
  dispose() {}
}

/** Live if a server URL is configured (dev), simulated otherwise (Pages). */
export function createTransport(): Transport {
  const url = import.meta.env.VITE_SERVER_URL as string | undefined;
  return url ? new LiveTransport(url) : new SimTransport();
}
