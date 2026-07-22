/**
 * Wire protocol shared by every client and the server.
 * Kept deliberately small — the whole point of Livepoll is that a poll
 * is cheap enough to live entirely in memory.
 */

export interface Option {
  id: string;
  label: string;
  votes: number;
}

/** Full snapshot pushed to a room on every change. Clients render from this. */
export interface PollState {
  id: string;
  question: string;
  options: Option[];
  totalVotes: number;
  viewers: number;
  createdAt: number;
  closed: boolean;
}

/* ---- client → server ---- */
export interface CreatePayload {
  question: string;
  options: string[];
}
export interface JoinPayload {
  pollId: string;
}
export interface VotePayload {
  pollId: string;
  optionId: string;
}

/* ack shapes */
export interface CreateAck {
  ok: true;
  pollId: string;
}
export type JoinAck =
  | { ok: true; state: PollState }
  | { ok: false; error: string };

/** Strongly-typed event maps for socket.io generics. */
export interface ClientToServer {
  "poll:create": (p: CreatePayload, ack: (r: CreateAck) => void) => void;
  "poll:join": (p: JoinPayload, ack: (r: JoinAck) => void) => void;
  "poll:vote": (p: VotePayload) => void;
  "poll:leave": (p: JoinPayload) => void;
}
export interface ServerToClient {
  "poll:state": (s: PollState) => void;
  "poll:error": (e: { message: string }) => void;
}
