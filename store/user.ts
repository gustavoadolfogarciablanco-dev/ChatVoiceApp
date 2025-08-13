import { defineStore } from "pinia";
import { usePresenceStore } from "@/store/presence";

interface UserState {
  nickname: string;
}

export const useUserStore = defineStore("user", {
  state: (): UserState => ({ nickname: "" }),
  actions: {
    load() {
      if (process.client) {
        const v = localStorage.getItem("nickname");
        if (v) this.nickname = v;
      }
    },
    setNickname(n: string) {
      this.nickname = n.trim();
      if (process.client) localStorage.setItem("nickname", this.nickname);
    },
    trySetNickname(n: string): boolean {
      const name = n.trim();
      if (!name) return false;
      const presence = usePresenceStore();
      const duplicate = presence.list.some(
        (u) => u.nickname.toLowerCase() === name.toLowerCase(),
      );
      if (duplicate) return false;
      this.setNickname(name);
      return true;
    },
    clear() {
      this.nickname = "";
      if (process.client) localStorage.removeItem("nickname");
    },
  },
});
