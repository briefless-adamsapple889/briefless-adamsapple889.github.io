// Mirror of the server wire protocol (server/src/types.ts).
// Small enough to keep in sync by hand; the shapes rarely change.

export interface Option {
  id: string;
  label: string;
  votes: number;
}

export interface PollState {
  id: string;
  question: string;
  options: Option[];
  totalVotes: number;
  viewers: number;
  createdAt: number;
  closed: boolean;
}

export interface CreatePayload {
  question: string;
  options: string[];
}

export type JoinResult =
  | { ok: true; state: PollState }
  | { ok: false; error: string };

export type Mode = "live" | "sim";
