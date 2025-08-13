import { defineStore } from "pinia";
import {
  messageRepository,
  deleteConversation as repoDeleteConversation,
} from "@/services/messageRepository";
import { STORAGE_KEYS, CHAT_LIMITS } from "@/constants/storage";

export interface VoiceMessage {
  id: string;
  sender: string;
  senderId?: string;
  createdAt: number;
  blob: Blob;
  url: string;
  duration: number;
  peaks?: number[];
  recipients?: string[] | null;
  convId?: string;
  status?: "pending" | "sending" | "sent" | "failed" | "listened";
  attempts?: number;
  listenedBy?: string[];
}

interface ChatState {
  messages: VoiceMessage[];
  playbackRate: number;
  loaded: boolean;
}

function deriveConvId(senderId?: string, recipients?: string[] | null): string {
  if (!recipients || recipients.length === 0) return "__all__";
  
  const set = new Set<string>(recipients);
  if (senderId && recipients.length > 0) set.add(senderId);
  const arr = Array.from(set).sort();
  return arr.join("|");
}

export const useChatStore = defineStore("chat", {
  state: (): ChatState => ({ messages: [], playbackRate: 1, loaded: false }),
  getters: {
    ordered: (s) => [...s.messages].sort((a, b) => a.createdAt - b.createdAt),
    
    byConversation:
      (s) => (convId: string | null, opts?: { includeBroadcast?: boolean }) => {
  const includeBroadcast = opts?.includeBroadcast !== false;
        if (!convId || convId === "__all__") {
          
          return s.messages
            .filter((m) => m.convId === "__all__")
            .sort((a, b) => a.createdAt - b.createdAt);
        }
        return s.messages
          .filter(
            (m) =>
              m.convId === convId ||
              (includeBroadcast && m.convId === "__all__"),
          )
          .sort((a, b) => a.createdAt - b.createdAt);
      },
  },
  actions: {
    async bootstrap() {
      if (this.loaded) return;
      if (process.client) {
        const pr = localStorage.getItem(STORAGE_KEYS.PLAYBACK_RATE);
        if (pr) this.playbackRate = Number(pr) || 1;
      }
      const persisted = await messageRepository.load();
      this.messages = persisted;
      this.loaded = true;
      
      void messageRepository.purgeLegacyBase64();
    },
    add(msg: Omit<VoiceMessage, "url">) {
      
      const limit = CHAT_LIMITS?.MAX_MESSAGES || 200;
      if (this.messages.length >= limit) {
        const remove = this.messages.length - limit + 1;
        if (remove > 0) {
          const trimmed = this.messages.splice(0, remove);
          trimmed.forEach((m) => URL.revokeObjectURL(m.url));
        }
      }
      const convId = deriveConvId(msg.senderId, msg.recipients);
      const url = URL.createObjectURL(msg.blob);
      const full: VoiceMessage = {
        ...msg,
        url,
        convId,
        status: msg.status || "pending",
        attempts: msg.attempts || 0,
        listenedBy: msg.listenedBy || [],
      };
      this.messages.push(full);
      void messageRepository.append(full);
    },
    markListened(id: string, listenerId: string) {
      const m = this.messages.find((m) => m.id === id);
      if (!m) return;
      if (!m.listenedBy) m.listenedBy = [];
      const already = m.listenedBy.includes(listenerId);
      if (!already) m.listenedBy.push(listenerId);
      // Solo la primera escucha (primer listener nuevo) cambia a escuchado
      if (!already && m.status !== "listened" && m.status !== "failed") {
        m.status = "listened";
      }
    },
    updateStatus(
      id: string,
      patch: Partial<Pick<VoiceMessage, "status" | "attempts">>,
    ) {
      const m = this.messages.find((m) => m.id === id);
      if (m) Object.assign(m, patch);
    },
    setPlaybackRate(r: number) {
      this.playbackRate = r;
      if (process.client)
        localStorage.setItem(STORAGE_KEYS.PLAYBACK_RATE, String(r));
    },
    clear() {
      this.messages.forEach((m) => URL.revokeObjectURL(m.url));
      this.messages = [];
      messageRepository.clearAll();
    },
    deleteConversation(convId: string) {
      const toRemove = this.messages.filter(
        (m) =>
          m.convId === convId ||
          (convId === "__all__" && m.convId === "__all__"),
      );
      toRemove.forEach((m) => URL.revokeObjectURL(m.url));
      this.messages = this.messages.filter((m) => !toRemove.includes(m));
      repoDeleteConversation(convId);
    },
    deleteAll() {
      this.clear();
    },
  },
});
