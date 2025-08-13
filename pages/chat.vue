<template>
  <div class="flex h-screen bg-[var(--c-bg)] text-[var(--c-text)]">
    <ConversationsSidebar
      v-if="isDesktop && desktopSidebarOpen"
      class="flex w-64 shrink-0 transition-all duration-200"
    />
    <v-navigation-drawer
      v-if="!isDesktop"
      v-model="drawer"
      location="left"
      temporary
      width="240"
      class="z-30"
    >
      <div
        class="flex items-center justify-between px-2 py-2 border-b border-[var(--c-border)]/40 mb-2"
      >
        <span class="text-xs font-medium text-dim">Chats</span>
        <v-btn
          size="x-small"
          variant="text"
          icon="mdi-close"
          @click="drawer = false"
        />
      </div>
      <ConversationsSidebar />
    </v-navigation-drawer>
    <div class="flex flex-col flex-1 min-w-0">
      <header
        class="app-header flex items-center justify-between px-2 sm:px-4 h-14 border-b backdrop-blur gap-2 relative z-40"
      >
        <div class="font-medium flex items-center gap-2 flex-1 min-w-0">
          <v-btn
            size="small"
            variant="text"
            :icon="
              isDesktop
                ? desktopSidebarOpen
                  ? 'mdi-menu-open'
                  : 'mdi-menu'
                : drawer
                  ? 'mdi-backburger'
                  : 'mdi-menu'
            "
            @click="toggleNav"
          />
          <span
            class="truncate text-sm leading-tight"
            :style="nicknameStyle"
            :title="user.nickname || t('no.user')"
          >
            {{ user.nickname || t("no.user") }}
          </span>
          <span
            class="w-2.5 h-2.5 rounded-full bg-green-500 sm:inline-block hidden"
          />
        </div>
        <div class="flex items-center gap-1 sm:gap-3 justify-end shrink-0">
          <template v-if="isDesktop">
            <SettingsPanel />
            <v-btn
              size="x-small"
              variant="outlined"
              class="whitespace-nowrap"
              :disabled="!canDeleteCurrent"
              :title="t('settings.delete.conversation')"
              @click="deleteCurrentMobile"
              >{{ t("settings.delete.conversation") }}</v-btn
            >
            <v-btn
              size="x-small"
              variant="outlined"
              color="red"
              class="whitespace-nowrap"
              :title="t('settings.delete.all')"
              @click="deleteAllMobile"
              >{{ t("settings.delete.all") }}</v-btn
            >
            <v-select
              class="w-[90px]"
              :items="rates"
              v-model="chat.playbackRate"
              density="compact"
              hide-details
              variant="outlined"
            />
            <LanguageToggle />
            <v-btn
              :icon="isLight ? UI_ICONS.themeLight : UI_ICONS.themeDark"
              variant="text"
              @click="handleToggle()"
            />
            <v-btn
              size="small"
              variant="text"
              icon="mdi-logout"
              :title="t('logout')"
              @click="logout()"
            />
          </template>
          <div v-if="!isDesktop" class="relative">
            <v-btn
              size="small"
              variant="text"
              icon="mdi-dots-vertical"
              @click="openMobileSheet"
            />
            <span
              v-if="hasMobileAttention"
              class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse"
            />
          </div>
          <v-dialog
            v-if="!isDesktop"
            v-model="mobileMenu"
            fullscreen
            :persistent="false"
            scrim="rgba(0,0,0,0.35)"
            transition="bottom-sheet-transition"
            @click:outside="forceCloseSheet"
            @keydown.esc="forceCloseSheet"
            @update:model-value="onMobileMenuModel"
          >
            <v-card
              ref="sheetRef"
              class="bottom-sheet-card flex flex-col h-full rounded-t-xl !rounded-b-none pt-2 pb-4 px-3 overflow-x-hidden"
              :class="{ 'light-sheet': isLight }"
              color="surface"
              @touchstart.passive="onTouchStart"
              @touchmove.passive="onTouchMove"
              @touchend.passive="onTouchEnd"
            >
              <div
                class="flex items-center justify-between mb-3 px-1 relative select-none"
              >
                <div class="absolute left-1/2 -translate-x-1/2 top-0">
                  <div
                    class="w-10 h-1.5 rounded-full bg-[var(--c-border,#555)]/60 mb-2 cursor-grab"
                  ></div>
                </div>
                <div
                  class="flex flex-1 items-center justify-center text-sm font-semibold text-dim uppercase tracking-wide"
                >
                  {{ t("menu") }}
                </div>
              </div>
              <div
                class="overflow-y-auto flex-1 custom-scroll overflow-x-hidden flex flex-col items-center space-y-5 text-center px-1"
              >
                <div class="w-full space-y-4 max-w-[340px]">
                  <div class="w-full">
                    <label
                      class="block text-[11px] mb-1 text-dim uppercase tracking-wide text-center"
                      >{{ t("settings.normalize") }}</label
                    >
                    <div class="flex justify-center">
                      <v-switch
                        density="compact"
                        inset
                        hide-details
                        v-model="uiNormalize"
                        :color="uiNormalize ? 'primary' : undefined"
                        :class="uiNormalize ? 'text-primary' : 'opacity-60'"
                      />
                    </div>
                  </div>
                  <div class="w-full">
                    <label
                      class="block text-[11px] mb-1 text-dim uppercase tracking-wide text-center"
                      >{{ t("settings.notifications") }}</label
                    >
                    <div class="flex justify-center">
                      <v-switch
                        density="compact"
                        inset
                        hide-details
                        v-model="uiNotifications"
                        :color="uiNotifications ? 'primary' : undefined"
                        :class="uiNotifications ? 'text-primary' : 'opacity-60'"
                      />
                    </div>
                  </div>
                  <div class="w-full">
                    <label
                      class="block text-[11px] mb-1 text-dim uppercase tracking-wide text-center"
                      >{{ t("settings.privacy.hideMissing") }}</label
                    >
                    <div class="flex justify-center">
                      <v-switch
                        density="compact"
                        inset
                        hide-details
                        v-model="uiHideMissing"
                        :color="uiHideMissing ? 'primary' : undefined"
                        :class="uiHideMissing ? 'text-primary' : 'opacity-60'"
                      />
                    </div>
                  </div>
                </div>
                <div class="w-full max-w-[340px]">
                  <label
                    class="block text-[11px] mb-1 text-dim uppercase tracking-wide text-center"
                    >{{ t("playback.rate") }}</label
                  >
                  <v-select
                    class="w-full text-left"
                    :items="rates"
                    v-model="chat.playbackRate"
                    density="compact"
                    hide-details
                    variant="outlined"
                  />
                </div>
                <div class="w-full max-w-[340px]">
                  <label
                    class="block text-[11px] mb-1 text-dim uppercase tracking-wide text-center"
                    >{{ t("language") }}</label
                  >
                  <div class="flex justify-center"><LanguageToggle /></div>
                </div>
                <div class="w-full max-w-[340px]">
                  <label
                    class="block text-[11px] mb-1 text-dim uppercase tracking-wide text-center"
                    >{{ t("theme") }}</label
                  >
                  <div class="flex justify-center">
                    <v-btn
                      variant="outlined"
                      class="flex items-center px-4"
                      @click="handleToggle()"
                    >
                      <v-icon
                        :icon="
                          isLight ? UI_ICONS.themeLight : UI_ICONS.themeDark
                        "
                        size="18"
                        class="mr-2"
                      />
                      {{ isLight ? t("theme.light") : t("theme.dark") }}
                    </v-btn>
                  </div>
                </div>
                <div class="w-full max-w-[340px]">
                  <label
                    class="block text-[11px] mb-1 text-dim uppercase tracking-wide text-center"
                    >{{ t("settings.delete.conversation") }} /
                    {{ t("settings.delete.all") }}</label
                  >
                  <div class="flex flex-wrap gap-2 justify-center">
                    <v-btn
                      size="x-small"
                      variant="outlined"
                      :disabled="!canDeleteCurrent"
                      @click="deleteCurrentMobile"
                      >{{ t("settings.delete.conversation") }}</v-btn
                    >
                    <v-btn
                      size="x-small"
                      variant="outlined"
                      color="red"
                      @click="deleteAllMobile"
                      >{{ t("settings.delete.all") }}</v-btn
                    >
                  </div>
                </div>
                <!-- Estado -->
                <div class="w-full max-w-[340px]">
                  <label
                    class="block text-[11px] mb-1 text-dim uppercase tracking-wide text-center"
                    >{{ t("status") }}</label
                  >
                  <div class="flex items-center gap-2 justify-center">
                    <span class="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span class="text-xs text-dim truncate">{{
                      user.nickname
                    }}</span>
                  </div>
                </div>
              </div>
              <div class="mt-4 pt-3 border-t border-[var(--c-border)]/40">
                <v-btn
                  color="primary"
                  block
                  size="large"
                  class="!h-12 text-base font-medium tracking-wide"
                  variant="elevated"
                  :aria-label="t('close')"
                  @click="forceCloseSheet()"
                  >{{ t("close") }}</v-btn
                >
                <v-btn
                  color="red"
                  block
                  size="large"
                  class="!h-12 mt-2 text-base font-medium tracking-wide"
                  variant="outlined"
                  :aria-label="t('logout')"
                  @click="
                    () => {
                      forceCloseSheet();
                      logout();
                    }
                  "
                  >{{ t("logout") }}</v-btn
                >
              </div>
            </v-card>
          </v-dialog>
        </div>
      </header>
      <div
        ref="scrollRef"
        class="app-messages flex-1 overflow-y-auto px-2 sm:px-4 py-3 custom-scroll"
      >
        <div
          v-if="!filteredMessages.length"
          class="text-center text-neutral-500 text-sm py-10"
        >
          {{ t("no.messages") }}
        </div>
        <TransitionGroup
          name="voice-bubble-wrapper"
          tag="div"
          class="space-y-8"
        >
          <div
            v-for="message in flatMessages"
            :key="message.__type !== 'separator' ? message.id : 'sep-' + message.id"
          >
            <div
              v-if="message.__type !== 'separator'"
              class="group flex items-start relative"
              :class="message.sender === user.nickname ? 'justify-start' : 'justify-end'"
            >
              <div
                class="flex max-w-full sm:max-w-[78%]"
                :class="message.sender === user.nickname ? 'flex-row' : 'flex-row-reverse'"
              >
                <Avatar :nick="message.sender" :size="28" class="mt-0.5 shrink-0" />
                <div class="ml-2 mr-2 flex-1 min-w-0 flex flex-col">
                  <div
                    class="text-[10px] tracking-wide text-dim mb-0.5 flex"
                    :class="message.sender === user.nickname ? 'justify-start' : 'justify-end'"
                    :title="formatExact(message.createdAt)"
                  >
                    <span class="truncate max-w-[140px]">{{ message.sender }}</span>
                    <span class="mx-1">•</span>
                    <span>{{ formatTimeHM(message.createdAt) }}</span>
                  </div>
                  <div
                    class="rounded-2xl px-3 py-2 shadow-sm border flex flex-col bg-[var(--c-bg-soft,#1f1f29)]/60 backdrop-blur-sm"
                    :class="message.sender === user.nickname ? 'rounded-bl-sm border-primary/30 bg-primary/15' : 'rounded-br-sm border-[var(--c-border)]/60'"
                  >
                    <VoiceMessage :msg="message" :mine="message.sender === user.nickname" />
                  </div>
                </div>
              </div>
            </div>
            <div
              v-else
              class="flex justify-center my-2"
            >
              <span class="px-3 py-1 text-[11px] rounded-full bg-[var(--c-border)]/40 text-dim">{{ message.label }}</span>
            </div>
          </div>
        </TransitionGroup>
      </div>
      <div
        class="app-footer border-t p-2 sm:p-3 pb-[calc(env(safe-area-inset-bottom,0)+0.5rem)] backdrop-blur flex justify-center"
      >
        <Recorder @sent="afterSend" />
      </div>
    </div>
  </div>
  <v-dialog v-model="showNickDialog" persistent max-width="420">
    <v-card>
      <v-card-title class="text-base font-medium">{{
        t("nickname.conflict.title")
      }}</v-card-title>
      <v-card-text class="space-y-3">
        <p class="text-sm text-dim leading-snug">
          {{ t("nickname.conflict.message") }}
        </p>
        <v-text-field
          v-model="newNick"
          :placeholder="t('nickname.conflict.placeholder')"
          density="comfortable"
          hide-details
          autofocus
          @keyup.enter="applyNick"
        />
        <div class="flex gap-2">
          <v-btn size="small" variant="tonal" @click="suggestNick">{{
            t("nickname.conflict.suggest")
          }}</v-btn>
          <v-btn
            size="small"
            color="primary"
            :disabled="!canApply"
            @click="applyNick"
            >{{ t("nickname.conflict.action") }}</v-btn
          >
          <v-spacer />
          <v-btn
            size="small"
            variant="text"
            @click="dismissNick"
            :disabled="!canDismiss"
            >{{ t("nickname.conflict.cancel") }}</v-btn
          >
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
import {
  onMounted,
  nextTick,
  ref,
  watch,
  computed,
  onBeforeUnmount,
} from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useUserStore } from "@/store/user";
import { useChatStore } from "@/store/chat";
import Recorder from "@/components/Recorder.vue";
import VoiceMessage from "@/components/VoiceMessage.vue";
import Avatar from "@/components/Avatar.vue";
import LanguageToggle from "@/components/LanguageToggle.vue";
import ConversationsSidebar from "@/components/ConversationsSidebar.vue";
import { useRealtime, forcePresence } from "@/services/realtimeService";
import SettingsPanel from "@/components/SettingsPanel.vue";
import { useThemeToggle } from "@/composables/useThemeToggle";
import { UI_ICONS } from "@/constants/ui";
import { t } from "@/i18n/i18nService";
import { formatDateDay, formatTimeHM } from "@/i18n/dateTime";
import { PLAYBACK_RATES } from "@/constants/playback";
import { useUiStore } from "@/store/ui";
import { usePresenceStore } from "@/store/presence";
const user = useUserStore();
const drawer = ref(false);
const mobileMenu = ref(false);
const sheetRef = ref<HTMLElement | null>(null);
function safeSetSheet(cb: (el: HTMLElement) => void) {
  const el = sheetRef.value;
  if (!el) return;
  try {
    cb(el);
  } catch {}
}
const desktopSidebarOpen = ref(true);
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("chat.desktopSidebarOpen");
  if (saved !== null) desktopSidebarOpen.value = saved === "1";
}
watch(desktopSidebarOpen, (v) => {
  if (typeof window !== "undefined")
    localStorage.setItem("chat.desktopSidebarOpen", v ? "1" : "0");
});
const isDesktop = ref(false);
const chat = useChatStore();
const { ordered: messages } = storeToRefs(chat);
const ui = useUiStore();
const presence = usePresenceStore();
const filteredMessages = computed(() => {
  const allMessages = chat.messages.filter(
    (m) => m.sender === user.nickname || m.convId === "__all__",
  );
  const nick = ui.activeConversation;
  if (!nick) return allMessages;
  const target = presence.list.find((p) => p.nickname === nick);
  if (!target) return allMessages;
  const meId = presence.selfId;
  const ids = [meId, target.id].filter(Boolean).sort();
  const convId = ids.join("|");
  return chat.messages.filter(
    (m) =>
      m.convId === convId ||
      m.sender === user.nickname ||
      m.convId === "__all__",
  );
});
const flatMessages = computed(() => {
  const out: any[] = [];
  let lastDay: string | null = null;
  for (const m of filteredMessages.value) {
    const key = new Date(m.createdAt).toISOString().slice(0, 10);
    if (key !== lastDay) {
      out.push({
        id: "sep-" + key,
        __type: "separator",
        label: formatDateDay(m.createdAt),
      });
      lastDay = key;
    }
    out.push(m);
  }
  return out;
});
const rates = PLAYBACK_RATES as unknown as number[];
const scrollRef = ref<HTMLElement | null>(null);
let realtimeStarted = false;
const router = useRouter();
const { isLight, toggle: handleToggle } = useThemeToggle();
const itemHeight = ref(118);
function computeMsgHeight() {
  if (typeof window === "undefined") return;
  const w = window.innerWidth;
  itemHeight.value = w < 640 ? 96 : 118;
}
computeMsgHeight();
let msgResizeListener: any;
if (typeof window !== "undefined") {
  msgResizeListener = () => computeMsgHeight();
  window.addEventListener("resize", msgResizeListener, { passive: true });
}
onBeforeUnmount(() => {
  if (msgResizeListener && typeof window !== "undefined")
    window.removeEventListener("resize", msgResizeListener);
});
onMounted(async () => {
  updateIsDesktop();
  if (typeof window !== "undefined")
    window.addEventListener("resize", updateIsDesktop, { passive: true });
  if (typeof window !== "undefined")
    window.addEventListener("chat-drag-threshold", (e: any) => {
      const v = e?.detail;
      if (typeof v === "number") dragThreshold.value = v;
    });
  user.load();
  await chat.bootstrap();
  if (!user.nickname) {
    router.push("/");
    return;
  }
  if (!realtimeStarted) {
    useRealtime();
    realtimeStarted = true;
  }
  setTimeout(() => forcePresence(), 120);
});
onBeforeUnmount(() => {
  if (typeof window !== "undefined")
    window.removeEventListener("resize", updateIsDesktop);
});
function updateIsDesktop() {
  if (typeof window === "undefined") return;
  const wasDesktop = isDesktop.value;
  isDesktop.value = window.innerWidth >= 1300;
  if (isDesktop.value) {
    drawer.value = false;
  }
  if (!isDesktop.value && wasDesktop) {
    desktopSidebarOpen.value = false;
  }
}
function toggleNav() {
  if (isDesktop.value) {
    desktopSidebarOpen.value = !desktopSidebarOpen.value;
  } else {
    drawer.value = !drawer.value;
  }
}
function logout() {
  try {
    if (typeof (user as any).clear === "function") (user as any).clear();
    else if ("nickname" in user) (user as any).nickname = "";
    try {
      const presence = usePresenceStore();
      if (typeof (presence as any).$reset === "function")
        (presence as any).$reset();
    } catch {}
    try {
      if (typeof window !== "undefined")
        localStorage.removeItem("presence.selfId");
    } catch {}
    try {
      const { disconnectRealtime } = require("@/services/realtimeService");
      disconnectRealtime();
    } catch {}
  } catch (e) {
    console.warn("Logout error", e);
  }
  router.replace("/");
}
function openMobileSheet() {
  mobileMenu.value = true;
}
const nicknameStyle = computed(() => {
  if (typeof window === "undefined") {
    return { maxWidth: "calc(42vw - 10px)" };
  }
  const w = window.innerWidth;
  const vw = w < 360 ? 0.32 : w < 400 ? 0.38 : 0.42;
  return { maxWidth: `calc(${(vw * 100).toFixed(0)}vw - 10px)` };
});
const hasMobileAttention = computed(() => {
  const normOff = !(ui as any).prefs?.normalizeAudio;
  let pending = false;
  try {
    for (const m of messages.value as any[]) {
      if (m && m.status && m.status !== "sent" && m.status !== "failed") {
        pending = true;
        break;
      }
    }
  } catch {}
  return normOff || pending;
});
function cleanupSheet() {
  safeSetSheet((el) => {
    el.style.transition = "";
    el.style.transform = "";
  });
}
function onMobileMenuModel(v: boolean) {
  if (!v) cleanupSheet();
}
function forceCloseSheet() {
  const el = sheetRef.value as HTMLElement | null;
  mobileMenu.value = false;
  if (el) {
    try {
      el.style.transition = "";
      el.style.transform = "";
    } catch {}
  }
  nextTick(() => {
    if (mobileMenu.value) mobileMenu.value = false;
  });
}
const uiNormalize = computed({
  get: () => ui.normalizeAudio,
  set: (v) => ui.setNormalizeAudio(v),
});
const uiNotifications = computed({
  get: () => ui.notificationsEnabled,
  set: (v) => ui.setNotifications(v),
});
const uiHideMissing = computed({
  get: () => ui.hideMissingListeners,
  set: (v) => ui.setHideMissingListeners(v),
});
const canDeleteCurrent = computed(() => ui.activeConversation && !ui.isAll);
function deleteCurrentMobile() {
  if (!canDeleteCurrent.value) return;
  if (confirm(t("settings.delete.confirm.one"))) {
    const nick = ui.activeConversation!;
    const msgs = chat.messages.filter(
      (m) =>
        m.convId !== "__all__" &&
        (m.sender === nick || (m.recipients || []).some((r) => r === nick)),
    );
    const convIds = new Set(msgs.map((m) => m.convId).filter(Boolean));
    convIds.forEach((id) => chat.deleteConversation(id!));
  }
}
function deleteAllMobile() {
  if (confirm(t("settings.delete.confirm.all"))) {
    chat.deleteAll();
  }
}
let touchStartY = 0;
let touchLatestY = 0;
const dragThreshold = ref<number>(90);
if (typeof window !== "undefined") {
  const savedDt = localStorage.getItem("chat.dragThreshold");
  if (savedDt) {
    const n = parseInt(savedDt, 10);
    if (!isNaN(n) && n > 30 && n < 240) dragThreshold.value = n;
  }
}
watch(dragThreshold, (v) => {
  if (typeof window !== "undefined")
    localStorage.setItem("chat.dragThreshold", String(v));
});
let dragging = false;
let startTranslate = 0;
function onTouchStart(e: TouchEvent) {
  if (!mobileMenu.value) return;
  const t = e.touches[0];
  touchStartY = t.clientY;
  touchLatestY = t.clientY;
  if (touchStartY < 160) {
    dragging = true;
    startTranslate = 0;
  }
}
function onTouchMove(e: TouchEvent) {
  if (!mobileMenu.value) return;
  touchLatestY = e.touches[0].clientY;
  if (!dragging) return;
  const rawDelta = touchLatestY - touchStartY;
  let newTranslate = startTranslate + rawDelta;
  if (newTranslate < 0) newTranslate = 0;
  const maxDrag =
    typeof window !== "undefined" ? window.innerHeight * 0.9 : 800;
  if (newTranslate > maxDrag) newTranslate = maxDrag;
  safeSetSheet((el) => {
    el.style.transform = `translateY(${newTranslate}px)`;
  });
}
function onTouchEnd() {
  if (!mobileMenu.value) return;
  const delta = touchLatestY - touchStartY;
  const el = sheetRef.value;
  if (el) el.style.transition = "transform .25s ease";
  let currentTranslate = 0;
  if (el) {
    try {
      const raw = el.style.transform || "";
      const num = parseFloat(raw.replace(/[^0-9.\-]/g, ""));
      if (!isNaN(num)) currentTranslate = num;
    } catch {}
  }
  const closeTrig = delta > dragThreshold.value && currentTranslate > 80;
  if (closeTrig) {
    if (el) el.style.transform = "translateY(100%)";
    setTimeout(() => {
      mobileMenu.value = false;
      if (el) el.style.transition = "";
    }, 200);
  } else {
    if (el) {
      el.style.transform = "translateY(0)";
      setTimeout(() => {
        if (el) el.style.transition = "";
      }, 200);
    }
  }
  touchStartY = 0;
  touchLatestY = 0;
  dragging = false;
}
watch(mobileMenu, (open) => {
  if (!open) {
    cleanupSheet();
    return;
  }
  nextTick(() =>
    safeSetSheet((el) => {
      el.style.transform = "translateY(0)";
    }),
  );
});
function afterSend() {
  nextTick(() => {
    if (scrollRef.value)
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
  });
}
const showNickDialog = ref(false);
const newNick = ref("");
const canApply = computed(() => newNick.value.trim().length > 0);
const canDismiss = computed(() => true);
function applyNick() {
  if (!canApply.value) return;
  user.nickname = newNick.value.trim();
  showNickDialog.value = false;
}
function dismissNick() {
  showNickDialog.value = false;
}
function suggestNick() {
  newNick.value = "User" + Math.floor(Math.random() * 1000);
}
function formatExact(ts: any) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
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
.voice-bubble-wrapper-enter {
  opacity: 0;
  transform: translateY(6px) scale(0.985);
}
.voice-bubble-wrapper-enter-active {
  transition: all 0.25s ease;
  opacity: 1;
  transform: translateY(0) scale(1);
}
.bubble-gradient-mine {
  background: linear-gradient(
    135deg,
    var(--c-primary, #6366f1) 0%,
    rgba(99, 102, 241, 0.75) 60%,
    rgba(99, 102, 241, 0.55) 100%
  );
  color: #fff;
}
.bubble-gradient-other {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.06) 100%
  );
}
.bubble-tail-mine,
.bubble-tail-other {
  position: relative;
}
.bubble-tail-mine:after,
.bubble-tail-other:after {
  content: "";
  position: absolute;
  bottom: 0.4rem;
  width: 10px;
  height: 14px;
  background: inherit;
  mask: radial-gradient(circle at 0 100%, black 71%, transparent 72%) left /
    100% 100% no-repeat;
}
.bubble-tail-mine:after {
  left: -6px;
  transform: scaleX(-1);
}
.bubble-tail-other:after {
  right: -6px;
}
.bottom-sheet-transition-enter-active,
.bottom-sheet-transition-leave-active {
  transition:
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.25s;
}
.bottom-sheet-transition-enter-from,
.bottom-sheet-transition-leave-to {
  transform: translateY(35px);
  opacity: 0;
}
.bottom-sheet-card {
  background: var(--c-bg-soft, #1f1f29);
}
.light-sheet.bottom-sheet-card {
  background: #ffffff;
}
</style>
