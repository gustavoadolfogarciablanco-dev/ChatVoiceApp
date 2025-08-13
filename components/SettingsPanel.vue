<template>
  <div class="flex items-center gap-2 text-sm">
    <v-switch
      v-model="normalize"
      inset
      density="compact"
      hide-details
      :label="t('settings.normalize')"
      :color="normalize ? 'primary' : undefined"
      class="min-w-[180px] transition-colors"
      :class="normalize ? 'text-primary' : 'opacity-70'"
    />
    <v-switch
      v-model="notifications"
      inset
      density="compact"
      hide-details
      :label="t('settings.notifications')"
      :color="notifications ? 'primary' : undefined"
      class="min-w-[200px] transition-colors"
      :class="notifications ? 'text-primary' : 'opacity-70'"
    />
    <v-switch
      v-model="hideMissing"
      inset
      density="compact"
      hide-details
      :label="t('settings.privacy.hideMissing')"
      :color="hideMissing ? 'primary' : undefined"
      class="min-w-[200px] transition-colors"
      :class="hideMissing ? 'text-primary' : 'opacity-70'"
    />
    <v-menu v-if="showGear">
      <template #activator="{ props }">
        <v-btn v-bind="props" size="x-small" variant="outlined">⚙️</v-btn>
      </template>
      <v-list density="compact" class="min-w-[220px] text-[12px]">
        <v-list-item>
          <div class="w-full px-1 py-1">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[11px] uppercase tracking-wide text-dim">{{
                t("settings.drag.threshold")
              }}</span>
              <span class="text-[11px] text-dim">{{ dragThreshold }}</span>
            </div>
            <v-slider
              v-model="dragThreshold"
              :min="40"
              :max="180"
              :step="5"
              density="compact"
              hide-details
              thumb-size="14"
            />
          </div>
        </v-list-item>
        <v-list-item
          v-if="showDeletes"
          @click="confirmDeleteCurrent"
          :disabled="!activeConversation"
        >
          <v-list-item-title>{{
            t("settings.delete.conversation")
          }}</v-list-item-title>
        </v-list-item>
        <v-list-item v-if="showDeletes" @click="confirmDeleteAll">
          <v-list-item-title class="text-red-500">{{
            t("settings.delete.all")
          }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>
<script setup lang="ts">
import { computed, watch, ref } from "vue";
import { useUiStore } from "@/store/ui";
import { useChatStore } from "@/store/chat";
import { t } from "@/i18n/i18nService";
import { pushToast } from "@/composables/useToasts";

const props = defineProps<{ showDeletes?: boolean; showGear?: boolean }>();
const showDeletes = computed(() => props.showDeletes !== false);
const showGear = computed(() => props.showGear !== false);
const ui = useUiStore();
const normalize = computed({
  get: () => ui.normalizeAudio,
  set: (v: boolean) => ui.setNormalizeAudio(v),
});
const notifications = computed({
  get: () => ui.notificationsEnabled,
  set: (v: boolean) => ui.setNotifications(v),
});
const hideMissing = computed({
  get: () => ui.hideMissingListeners,
  set: (v: boolean) => ui.setHideMissingListeners(v),
});
const chat = useChatStore();
const activeConversation = computed(() =>
  ui.activeConversation && !ui.isAll ? ui.activeConversation : null,
);
const dragThreshold = ref<number>(
  (() => {
    if (typeof window === "undefined") return 90;
    const saved = localStorage.getItem("chat.dragThreshold");
    const n = saved ? parseInt(saved, 10) : NaN;
    return !isNaN(n) && n >= 40 && n <= 180 ? n : 90;
  })(),
);
watch(dragThreshold, (v) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("chat.dragThreshold", String(v));
    window.dispatchEvent(new CustomEvent("chat-drag-threshold", { detail: v }));
  }
});

watch(normalize, (v) => {
  pushToast(t(v ? "settings.normalize.on" : "settings.normalize.off"), {
    type: "info",
  });
});
watch(notifications, (v) => {
  if (v && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
  pushToast(
    v ? t("settings.notifications.on") : t("settings.notifications.off"),
    { type: "info" },
  );
});
watch(hideMissing, (v) => {
  pushToast(
    t(
      v
        ? "settings.privacy.hideMissing.on"
        : "settings.privacy.hideMissing.off",
    ),
    { type: "info" },
  );
});

function confirmDeleteCurrent() {
  if (!activeConversation.value) return;
  if (confirm(t("settings.delete.confirm.one"))) {
    const nick = activeConversation.value;
    const msgs = chat.messages.filter(
      (m) =>
        m.convId !== "__all__" &&
        (m.sender === nick || (m.recipients || []).some((r) => r === nick)),
    );
    const convIds = new Set(msgs.map((m) => m.convId).filter(Boolean));
    convIds.forEach((id) => chat.deleteConversation(id!));
    pushToast(t("settings.delete.done.one"), { type: "info" });
  }
}
function confirmDeleteAll() {
  if (confirm(t("settings.delete.confirm.all"))) {
    chat.deleteAll();
    pushToast(t("settings.delete.done.all"), { type: "info" });
  }
}
</script>
