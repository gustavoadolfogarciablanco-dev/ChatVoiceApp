import { useChatStore } from "@/store/chat";
import { useUserStore } from "@/store/user";
import { usePresenceStore } from "@/store/presence";
import { t } from "@/i18n/i18nService";
import { useUiStore } from "@/store/ui";

let ws: WebSocket | null = null;
let heartbeat: number | null = null;
let connecting = false;
let retries = 0;
const listeners: Array<(state: RealtimeState) => void> = [];
interface RealtimeState {
  connected: boolean;
  reconnectAttempts: number;
}
let state: RealtimeState = { connected: false, reconnectAttempts: 0 };
interface OutgoingItem {
  id: string;
  blob: Blob;
  duration: number;
  sender: string;
  recipients?: string[];
  attempts: number;
  createdAt: number;
}
const queue: OutgoingItem[] = [];
const MAX_ATTEMPTS = 5;

function notify() {
  listeners.forEach((l) => l(state));
}

function setState(p: Partial<RealtimeState>) {
  state = { ...state, ...p };
  notify();
}

function url() {
  if (typeof window === "undefined") return "";
  const loc = window.location;
  const proto = loc.protocol === "https:" ? "wss" : "ws";
  if (!(window as any).FORCE_SAME_ORIGIN_WS) {
    return `${proto}://${loc.hostname}:24680`;
  }
  const port = loc.port;
  return `${proto}://${loc.hostname}${port ? ":" + port : ""}/rt`;
}

function connect() {
  if (
    typeof window === "undefined" ||
    process.server ||
    connecting ||
    state.connected
  )
    return;
  try {
    usePresenceStore().loadCache();
  } catch {}
  connecting = true;
  const chat = useChatStore();
  try {
    ws = new WebSocket(url());
  } catch {
    try {
      console.warn("[realtime] failed to construct websocket");
    } catch {}
    scheduleReconnect();
    return;
  }
  ws.onopen = () => {
    try {
      console.log("[realtime] ws open", url());
    } catch {}
    connecting = false;
    retries = 0;
    setState({ connected: true });
    startHeartbeat();
    announcePresence();
    try {
      [300, 700, 1200].forEach((delay) =>
        setTimeout(() => announcePresence(), delay),
      );
    } catch {}
    flushQueue();
  };
  ws.onerror = (e) => {
    try {
      console.warn("[realtime] ws error", e);
    } catch {}
    ws?.close();
  };
  ws.onmessage = (ev) => {
    const raw = ev.data as string;
    if (raw === "pong") return;
    let d: any;
    try {
      d = JSON.parse(raw);
    } catch {
      return;
    }
    if (!d) return;
    if (d.type === "presence" && d.user) {
      const presence = usePresenceStore();
      presence.upsert({
        id: d.user.id,
        nickname: d.user.nickname,
        lastSeen: Date.now(),
      });
      return;
    }
    if (d.type === "listened" && d.messageId && d.listenerId) {
      const chat = useChatStore();
      chat.markListened(d.messageId, d.listenerId);
      return;
    }
    if (d.type === "voice" && d.payload) {
      const presence = usePresenceStore();
      if (
        Array.isArray(d.recipients) &&
        d.recipients.length &&
        !d.recipients.includes(presence.selfId)
      )
        return;
      const { id, sender, senderId, createdAt, duration, payload, mime } = d;
      try {
        let fixedMime = mime;
        if (fixedMime !== "audio/webm" && fixedMime !== "audio/wav") {
          fixedMime = "audio/webm";
        }
        const blob = b64ToBlob(payload, fixedMime);
        chat.add({
          id,
          sender,
          senderId,
          createdAt,
          blob,
          duration,
          recipients: d.recipients || null,
        });
        maybeNotify(sender);
      } catch {
      }
    }
  };
}

function scheduleReconnect() {
  if (process.server) return;
  const delay = Math.min(1000 * 2 ** retries, 10000);
  retries++;
  try {
    console.log("[realtime] reconnect in", delay, "ms attempt", retries);
  } catch {}
  setState({ reconnectAttempts: retries });
  setTimeout(() => connect(), delay);
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeat = window.setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send("ping");
      announcePresence();
    } catch {}
  }, 15000);
}
function stopHeartbeat() {
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
}

export function useRealtime() {
  if (typeof window !== "undefined") connect();
  return {
    state: () => state,
    onState(fn: (s: RealtimeState) => void) {
      listeners.push(fn);
      fn(state);
      return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
  };
}

export function sendVoice(payload: {
  id: string;
  blob: Blob;
  duration: number;
  sender: string;
  recipients?: string[];
}) {
  const chat = useChatStore();
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    queue.push({ ...payload, attempts: 0, createdAt: Date.now() });
    chat.updateStatus(payload.id, { status: "pending", attempts: 0 });
    return;
  }
  internalSend(payload);
}

function internalSend(payload: {
  id: string;
  blob: Blob;
  duration: number;
  sender: string;
  recipients?: string[];
}) {
  const chat = useChatStore();
  chat.updateStatus(payload.id, { status: "sending" });
  blobToBase64(payload.blob)
    .then((b64) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        enqueueRetry(payload);
        return;
      }
      try {
        ws!.send(
          JSON.stringify({
            type: "voice",
            id: payload.id,
            sender: payload.sender,
            senderId: usePresenceStore().selfId,
            createdAt: Date.now(),
            duration: payload.duration,
            payload: b64,
            mime: payload.blob.type,
            recipients: payload.recipients || null,
          }),
        );
        chat.updateStatus(payload.id, { status: "sent" });
      } catch {
        enqueueRetry(payload);
      }
    })
    .catch(() => enqueueRetry(payload));
}

function enqueueRetry(payload: {
  id: string;
  blob: Blob;
  duration: number;
  sender: string;
  recipients?: string[];
}) {
  const existing = queue.find((q) => q.id === payload.id);
  const chat = useChatStore();
  if (existing) {
    existing.attempts++;
  } else {
    queue.push({ ...payload, attempts: 1, createdAt: Date.now() });
  }
  const item = queue.find((q) => q.id === payload.id)!;
  if (item.attempts >= MAX_ATTEMPTS) {
    chat.updateStatus(payload.id, {
      status: "failed",
      attempts: item.attempts,
    });
  } else {
    chat.updateStatus(payload.id, {
      status: "pending",
      attempts: item.attempts,
    });
  }
}

function flushQueue() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const pending = [...queue];
  for (const it of pending) {
    if (it.attempts >= MAX_ATTEMPTS) continue;
    internalSend(it);
    if (it.attempts >= MAX_ATTEMPTS || ws?.readyState !== WebSocket.OPEN) break;
  }
  // Limpia enviados
  for (let i = queue.length - 1; i >= 0; i--) {
    const m = queue[i];
    const chat = useChatStore();
    const local = chat.messages.find((mm) => mm.id === m.id);
    if (local?.status === "sent") queue.splice(i, 1);
  }
}

export function disconnectRealtime() {
  stopHeartbeat();
  try {
    ws?.close();
  } catch {}
  ws = null;
  setState({ connected: false });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((r) => {
    const fr = new FileReader();
    fr.onload = () => r(String(fr.result).split(",")[1]);
    fr.readAsDataURL(blob);
  });
}
function b64ToBlob(b64: string, mime = "audio/webm"): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function announcePresence() {
  const user = useUserStore();
  const presence = usePresenceStore();
  if (!user.nickname || !ws || ws.readyState !== WebSocket.OPEN) return;

  if (!presence.selfId && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("presence.selfId");
      if (stored) presence.setSelf(stored, user.nickname);
    } catch {}
  }
  const id =
    presence.selfId ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2));
  if (!presence.selfId) presence.setSelf(id, user.nickname);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("presence.selfId", id);
    } catch {}
  }
  try {
    ws.send(
      JSON.stringify({
        type: "presence",
        user: { id, nickname: user.nickname },
      }),
    );
  } catch {}
  presence.prune();
}

function ensureNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    try {
      Notification.requestPermission().catch(() => {});
    } catch {}
  }
}

function maybeNotify(sender: string) {
  if (!("Notification" in window)) return;
  const ui = useUiStore();
  if (!ui.notificationsEnabled) return;
  if (document.hasFocus()) return;
  if (Notification.permission !== "granted") {
    ensureNotificationPermission();
    return;
  }
  try {
    new Notification(t("notify.new.message"), { body: sender, silent: true });
  } catch {}
}

export function forcePresence() {
  announcePresence();
}

export function sendListened(messageId: string) {
  const presence = usePresenceStore();
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(
      JSON.stringify({
        type: "listened",
        messageId,
        listenerId: presence.selfId,
      }),
    );
  } catch {}
}
