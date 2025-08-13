<template>
  <aside
    class="w-60 max-w-full shrink-0 border-r h-full flex flex-col bg-[var(--c-bg)]/60 backdrop-blur"
  >
    <div class="p-3 flex items-center justify-between border-b">
      <h3 class="text-xs font-semibold opacity-70">{{ t("sidebar.chats") }}</h3>
      <v-btn
        size="x-small"
        variant="text"
        icon="mdi-reload"
        @click="refreshPresence"
      />
    </div>
    <div class="flex-1 overflow-y-auto custom-scroll text-sm">
      <button
        class="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-primary/10 transition"
        :class="ui.isAll ? 'bg-primary/10' : ''"
        @click="setAll"
      >
        <span class="flex-1 truncate">{{ t("sidebar.all") }}</span>
      </button>
      <button
        v-for="p in others"
        :key="p.id"
        class="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-primary/10 transition relative"
        :class="active === p.nickname ? 'bg-primary/20' : ''"
        @click="openConv(p.nickname)"
      >
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span class="flex-1 truncate">{{ p.nickname }}</span>
        <span
          v-if="unreadCount(p.nickname) > 0"
          class="ml-auto text-[10px] bg-primary text-white rounded px-1 leading-tight"
          >{{ unreadCount(p.nickname) }}</span
        >
      </button>
    </div>
  </aside>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { t } from "@/i18n/i18nService";
import { usePresenceStore } from "@/store/presence";
import { useUiStore } from "@/store/ui";
import { useChatStore } from "@/store/chat";
import { forcePresence } from "@/services/realtimeService";

const presence = usePresenceStore();
const ui = useUiStore();
const chat = useChatStore();

const active = computed(() => ui.activeConversation || "__all__");
const others = computed(() =>
  presence.list.filter((u) => u.id !== presence.selfId),
);

function setAll() {
  ui.setActive("__all__");
}
function openConv(nick: string) {
  ui.setActive(nick);
}
function refreshPresence() {
  forcePresence();
}

function unreadCount(nick: string) {
  const last = ui.lastRead[nick] ?? 0;
  return chat.messages.filter((m) => m.sender === nick && m.createdAt > last)
    .length;
}
</script>
<style scoped>
.custom-scroll {
  scrollbar-width: thin;
}
.custom-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: #3f3f46;
  border-radius: 4px;
}
</style>
