import type { Server, Socket } from "socket.io";
import type {
  ClientToServer, ServerToClient, CreatePayload, JoinPayload, VotePayload,
} from "./types.js";
import { PollStore } from "./pollStore.js";

type IO = Server<ClientToServer, ServerToClient>;
type Sock = Socket<ClientToServer, ServerToClient>;

/**
 * Translates socket events into store mutations and pushes fresh snapshots
 * back to the room. The socket.io room *is* the poll's presence set — we
 * never track "who is watching" ourselves, we just ask the adapter.
 */
export function attachGateway(io: IO, store = new PollStore()): PollStore {
  const viewersOf = (pollId: string) =>
    io.sockets.adapter.rooms.get(pollId)?.size ?? 0;

  const broadcast = (pollId: string) => {
    const state = store.snapshot(pollId, viewersOf(pollId));
    if (state) io.to(pollId).emit("poll:state", state);
  };

  io.on("connection", (socket: Sock) => {
    socket.on("poll:create", (p: CreatePayload, ack) => {
      try {
        const id = store.create(p?.question ?? "", p?.options ?? []);
        socket.join(id);
        ack({ ok: true, pollId: id });
        broadcast(id);
      } catch (err) {
        socket.emit("poll:error", { message: (err as Error).message });
      }
    });

    socket.on("poll:join", (p: JoinPayload, ack) => {
      const id = p?.pollId?.trim();
      if (!id || !store.has(id)) {
        ack({ ok: false, error: "존재하지 않는 투표입니다." });
        return;
      }
      socket.join(id);
      const state = store.snapshot(id, viewersOf(id))!;
      ack({ ok: true, state });
      broadcast(id); // let everyone see the viewer count tick up
    });

    socket.on("poll:vote", (p: VotePayload) => {
      if (!p?.pollId || !p?.optionId) return;
      if (store.vote(p.pollId, p.optionId, socket.id)) broadcast(p.pollId);
    });

    socket.on("poll:leave", (p: JoinPayload) => {
      if (p?.pollId) {
        socket.leave(p.pollId);
        broadcast(p.pollId);
      }
    });

    socket.on("disconnect", () => {
      // drop this voter's ballots, then refresh whatever rooms they touched
      const touched = new Set(store.forget(socket.id));
      for (const room of socket.rooms) touched.add(room);
      touched.forEach(broadcast);
    });
  });

  return store;
}
