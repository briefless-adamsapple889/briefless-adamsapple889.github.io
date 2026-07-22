import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import type { ClientToServer, ServerToClient } from "./types.js";
import { attachGateway } from "./gateway.js";

const PORT = Number(process.env.PORT ?? 4000);
const ORIGIN = process.env.CORS_ORIGIN ?? "*";

const app = express();
app.use(cors({ origin: ORIGIN }));

const http = createServer(app);
const io = new Server<ClientToServer, ServerToClient>(http, {
  cors: { origin: ORIGIN },
  // small polls, chatty updates — websocket first keeps latency low
  transports: ["websocket", "polling"],
});

const store = attachGateway(io);

app.get("/health", (_req, res) => {
  res.json({ ok: true, polls: store.size, uptime: process.uptime() });
});

http.listen(PORT, () => {
  console.log(`livepoll server → http://localhost:${PORT}  (origin: ${ORIGIN})`);
});

// keep the process honest under a supervisor
process.on("SIGTERM", () => http.close(() => process.exit(0)));
process.on("SIGINT", () => http.close(() => process.exit(0)));
