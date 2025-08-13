import { WebSocketServer, WebSocket } from "ws";
const PORT = process.env.RT_PORT || 24680;
const wss = new WebSocketServer({ port: PORT });

/** @type {Map<any,{id:string,nickname:string,lastSeen:number}>} */
const clients = new Map();

function send(ws, obj) {
  try {
    ws.send(JSON.stringify(obj));
  } catch {}
}
function broadcast(obj) {
  const msg = JSON.stringify(obj);
  const OPEN = (WebSocket && WebSocket.OPEN) || 1;
  wss.clients.forEach((c) => {
    if (c.readyState === OPEN) {
      try {
        c.send(msg);
      } catch {}
    }
  });
}
function prune(ttlMs = 60000) {
  const now = Date.now();
  for (const [ws, meta] of clients) {
    if (now - meta.lastSeen > ttlMs) clients.delete(ws);
  }
}
setInterval(prune, 20000).unref?.();

wss.on("connection", (ws) => {
  for (const meta of clients.values()) {
    send(ws, {
      type: "presence",
      user: { id: meta.id, nickname: meta.nickname },
    });
  }
  ws.on("message", (data) => {
    if (data.toString() === "ping") {
      try {
        ws.send("pong");
      } catch {}
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
    }
    if (parsed && parsed.type === "presence" && parsed.user) {
      const { id, nickname } = parsed.user;
      clients.set(ws, { id, nickname, lastSeen: Date.now() });
      broadcast({ type: "presence", user: { id, nickname } });
      return;
    }
    if (parsed && parsed.type === "voice") {
      const msg = JSON.stringify(parsed);
      const OPEN = (WebSocket && WebSocket.OPEN) || 1;
      wss.clients.forEach((c) => {
        if (c !== ws && c.readyState === OPEN) {
          try {
            c.send(msg);
          } catch {}
        }
      });
      return;
    }
  });
  ws.on("close", () => {
    clients.delete(ws);
  });
});

console.log("[realtime] websocket server listening on port", PORT);
