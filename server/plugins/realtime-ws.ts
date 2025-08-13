// Integrated WebSocket server (presence + voice relay) for Nuxt/Nitro
// Runs on the same HTTP server/port so the client can connect using location.port
// Using Nuxt auto import for defineNitroPlugin
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { defineNitroPlugin } from "#imports";
import type { NitroApp } from "nitropack";
// @ts-ignore - using ws direct dependency
import { WebSocketServer } from "ws";

interface ClientMeta {
  id: string;
  nickname: string;
  lastSeen: number;
}

let wss: any; // WebSocketServer instance
const clients = new Map<any, ClientMeta>();

function broadcast(obj: any, except?: any) {
  const data = JSON.stringify(obj);
  for (const client of wss?.clients || []) {
    if ((client as any).readyState === 1 && client !== except) {
      try {
        (client as any).send(data);
      } catch {}
    }
  }
}

function prune(ttlMs = 60000) {
  const now = Date.now();
  for (const [ws, meta] of clients) {
    if (now - meta.lastSeen > ttlMs) clients.delete(ws);
  }
}

export default defineNitroPlugin((nitro: NitroApp) => {
  if (wss) return; // avoid double init
  const server: any = (nitro as any).httpServer;
  if (!server) return;
  // Use dedicated path so we don't steal Vite/Nuxt HMR websocket upgrades (/ _nuxt /)
  wss = new WebSocketServer({ server, path: "/rt" });
  setInterval(() => prune(), 20000).unref?.();

  wss.on("connection", (ws: any, req: any) => {
    // eslint-disable-next-line no-console
    console.log("[realtime] connection from", req?.socket?.remoteAddress);
    // Send current roster
    for (const meta of clients.values()) {
      try {
        ws.send(
          JSON.stringify({
            type: "presence",
            user: { id: meta.id, nickname: meta.nickname },
          }),
        );
      } catch {}
    }
    ws.on("message", (raw: any) => {
      const text = raw.toString();
      if (text === "ping") {
        try {
          ws.send("pong");
        } catch {}
        return;
      }
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        // ignore
      }
      if (parsed && parsed.type === "presence" && parsed.user) {
        const { id, nickname } = parsed.user;
        clients.set(ws, { id, nickname, lastSeen: Date.now() });
        // eslint-disable-next-line no-console
        console.log(
          "[realtime] presence",
          id,
          nickname,
          "total:",
          clients.size,
        );
        broadcast({ type: "presence", user: { id, nickname } });
        return;
      }
      if (parsed && parsed.type === "voice") {
        // eslint-disable-next-line no-console
        console.log(
          "[realtime] voice msg from",
          parsed.sender,
          "recipients:",
          parsed.recipients?.length || 0,
        );
        broadcast(parsed, ws);
        return;
      }
    });
    ws.on("close", () => {
      clients.delete(ws);
      console.log("[realtime] disconnect. total:", clients.size);
    });
    ws.on("error", () => {
      clients.delete(ws);
    });
  });
  // eslint-disable-next-line no-console
  console.log("[realtime] Integrated WS server attached to same port");
});
