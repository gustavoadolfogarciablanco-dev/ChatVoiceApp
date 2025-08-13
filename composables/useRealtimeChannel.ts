import { useChatStore } from "@/store/chat";
import { useUserStore } from "@/store/user";

const CHANNEL_NAME = "voice-chat";
let channel: BroadcastChannel | null = null;

export function useRealtimeChannel() {
  const chat = useChatStore();
  const user = useUserStore();

  function ensure() {
    if (process.server) return;
    if (!channel) {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (ev) => {
        const data = ev.data as any;
        if (!data || data.sender === user.nickname) return;
        if (data.type === "voice") {
          const { id, sender, createdAt, blob, duration } = data;
          chat.add({ id, sender, createdAt, blob, duration });
        }
      };
    }
  }

  function sendVoice(payload: { id: string; blob: Blob; duration: number }) {
    ensure();
    if (!channel) return;
    channel.postMessage({
      type: "voice",
      sender: user.nickname,
      createdAt: Date.now(),
      ...payload,
    });
  }

  return { sendVoice };
}
