import { defineStore } from "pinia";

interface UIState {
  activeConversation: string | null;
  lastRead: Record<string, number>;
    normalizeAudio: boolean;
    notificationsEnabled: boolean;
    hideMissingListeners: boolean;
}

export const useUiStore = defineStore("ui", {
  state: (): UIState => ({
    activeConversation: null,
    lastRead: {},
    normalizeAudio: typeof localStorage !== "undefined" && localStorage.getItem("pref.normalizeAudio") === "1",
    notificationsEnabled:
      typeof localStorage !== "undefined" &&
      localStorage.getItem("pref.notifications") === "1",
    hideMissingListeners:
      typeof localStorage !== "undefined" &&
      localStorage.getItem("pref.hideMissingListeners") === "1",
  }),
  getters: {
    isAll: (s) => !s.activeConversation || s.activeConversation === "__all__",
  },
  actions: {
    setActive(conv: string | null) {
      this.activeConversation = conv;
      if (conv) this.lastRead[conv] = Date.now();
    },
    touch(conv: string) {
      this.lastRead[conv] = Date.now();
    },
    setNormalizeAudio(v: boolean) {
      this.normalizeAudio = v;
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem("pref.normalizeAudio", v ? "1" : "0");
        } catch {}
      }
    },
    setNotifications(v: boolean) {
      this.notificationsEnabled = v;
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem("pref.notifications", v ? "1" : "0");
        } catch {}
      }
    },
    setHideMissingListeners(v: boolean) {
      this.hideMissingListeners = v;
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem("pref.hideMissingListeners", v ? "1" : "0");
        } catch {}
      }
    },
    migratePrefs() {
      if (typeof localStorage === "undefined") return;
      const keys = [
        ["pref.normalizeAudio", "normalizeAudio"],
        ["pref.notifications", "notificationsEnabled"],
        ["pref.hideMissingListeners", "hideMissingListeners"],
      ] as const;
      for (const [k, stateKey] of keys) {
        const raw = localStorage.getItem(k);
        if (raw === null) continue;
        if (raw !== "0" && raw !== "1") {
          try {
            localStorage.setItem(k, "0");
          } catch {}
          (this as any)[stateKey] = false;
        }
      }
    },
  },
});
