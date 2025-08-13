import { defineStore } from "pinia";

export interface PresenceUser {
  id: string;
  nickname: string;
  lastSeen: number;
}

interface PresenceState {
  users: Record<string, PresenceUser>;
  selfId: string;
}

export const usePresenceStore = defineStore("presence", {
  state: (): PresenceState => ({ users: {}, selfId: "" }),
  getters: {
    list: (s) =>
      Object.values(s.users).sort((a, b) =>
        a.nickname.localeCompare(b.nickname),
      ),
  },
  actions: {
    loadCache() {
      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem("presence.cache");
        if (!raw) return;
        const parsed: PresenceUser[] = JSON.parse(raw);
        const now = Date.now();
        parsed.forEach((u) => {
          // descarta usuarios muy viejos (>60s)
          if (now - u.lastSeen < 60000) this.users[u.id] = u;
        });
      } catch {}
    },
    setSelf(id: string, nickname: string) {
      this.selfId = id;
      this.upsert({ id, nickname, lastSeen: Date.now() });
    },
    upsert(u: PresenceUser) {
      this.users[u.id] = { ...u, lastSeen: Date.now() };
      this.persist();
    },
    prune(ttlMs = 60000) {
      const now = Date.now();
      for (const k in this.users)
        if (now - this.users[k].lastSeen > ttlMs) delete this.users[k];
      this.persist();
    },
    persist() {
      if (typeof window === "undefined") return;
      try {
        const arr = Object.values(this.users);
        localStorage.setItem("presence.cache", JSON.stringify(arr));
      } catch {}
    },
    $reset() {
      this.users = {} as any;
      this.selfId = "";
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("presence.cache");
        } catch {}
      }
    },
  },
});
