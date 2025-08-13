<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center px-4 py-8 transition-colors bg-[var(--c-bg)] text-[var(--c-text)]"
  >
    <div class="absolute top-4 right-4 flex items-center gap-2">
      <LanguageToggle />
      <v-btn
        :icon="isLight ? UI_ICONS.themeLight : UI_ICONS.themeDark"
        variant="text"
        size="small"
        @click="toggleUiTheme"
      />
    </div>
    <v-card
      :elevation="2"
      variant="flat"
      class="w-full max-w-sm border login-surface overflow-hidden"
    >
      <div
        class="p-6 pb-4 text-center space-y-1 border-b border-[var(--c-border)]"
      >
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ t("app.title") }}
        </h1>
        <p class="text-sm text-dim">{{ t("login.subtitle") }}</p>
      </div>
      <form class="p-6 pt-5 space-y-5" @submit.prevent="login">
        <div class="space-y-2">
          <v-text-field
            v-model="nickname"
            :label="t('login.placeholder')"
            autofocus
            density="comfortable"
            :placeholder="t('login.placeholder')"
            @keyup.enter="login"
            :error="dupError"
            :error-messages="dupError ? t('error.nickname.taken') : ''"
          />
          <div
            v-if="dupError && suggestion"
            class="text-xs mt-1 flex items-center flex-wrap gap-1"
          >
            <span>{{
              t("login.suggestion").replace("{nick}", suggestion)
            }}</span>
            <v-btn
              size="x-small"
              variant="text"
              class="px-1"
              @click="applySuggestion"
              >OK</v-btn
            >
            <v-btn
              size="x-small"
              variant="text"
              class="px-1"
              @click="regenerateSuggestion"
              >{{ t("login.suggestion.another") }}</v-btn
            >
          </div>
          <p class="text-xs text-dim leading-snug">{{ t("login.helper") }}</p>
        </div>
        <v-btn
          type="submit"
          color="primary"
          block
          :disabled="!nickname.trim() || dupError"
          variant="flat"
          >{{ t("login.button") }}</v-btn
        >
      </form>
    </v-card>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useThemeToggle } from "@/composables/useThemeToggle";
import { UI_ICONS } from "@/constants/ui";
import LanguageToggle from "@/components/LanguageToggle.vue";
import { t } from "@/i18n/i18nService";
import { useRealtime } from "@/services/realtimeService";
import { useUserStore } from "@/store/user";
import { usePresenceStore } from "@/store/presence";
const user = useUserStore();
const router = useRouter();
const nickname = ref("");
const dupError = ref(false);
const suggestion = ref("");
let debounceTimer: number | null = null;
const presence = usePresenceStore();
const { isLight, toggle: toggleUiTheme } = useThemeToggle();
onMounted(() => {
  user.load();
  try {
    presence.loadCache?.();
  } catch {}
  if (typeof window !== "undefined") {
    useRealtime();
  }
  setTimeout(() => presence.prune(), 2000);
  if (user.nickname) router.push("/chat");
});
function login() {
  if (!nickname.value.trim()) return;
  const ok = user.trySetNickname(nickname.value);
  if (!ok) {
    dupError.value = true;
    return;
  }
  router.push("/chat");
}
function normalizeInput(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}
function generateSuggestion(base: string): string {
  const clean = base.replace(/\s+/g, "").slice(0, 20) || "User";
  let attempt = 1;
  const taken = new Set(presence.list.map((u) => u.nickname.toLowerCase()));
  while (attempt < 1000) {
    const candidate = `${clean}${attempt}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
    attempt++;
  }
  return clean + crypto.randomUUID().slice(0, 4);
}
function checkDuplicate(val: string) {
  const name = normalizeInput(val);
  if (name !== nickname.value) nickname.value = name;
  const lower = name.toLowerCase();
  const active = new Set<string>();
  presence.list.forEach((u) => active.add(u.nickname.toLowerCase()));
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("presence.cache");
      if (raw) {
        const arr = JSON.parse(raw) as Array<{
          nickname: string;
          lastSeen: number;
        }>;
        const now = Date.now();
        arr.forEach((u) => {
          if (now - u.lastSeen < 25000) active.add(u.nickname.toLowerCase());
        });
      }
    } catch {}
  }
  dupError.value = !!lower && active.has(lower);
  suggestion.value = dupError.value ? generateSuggestion(name) : "";
}
watch(nickname, (v) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => checkDuplicate(v), 150);
});
watch(
  () => presence.list.map((u) => u.nickname).join("|"),
  () => {
    if (nickname.value) checkDuplicate(nickname.value);
  },
);

function applySuggestion() {
  if (suggestion.value) {
    nickname.value = suggestion.value;
    checkDuplicate(nickname.value);
  }
}
function regenerateSuggestion() {
  if (!dupError.value) return;
  suggestion.value = generateSuggestion(
    nickname.value + Math.floor(Math.random() * 10),
  );
}
</script>
<style scoped>
.login-surface {
  background: var(--c-surface) !important;
  color: var(--c-text) !important;
  border: 1px solid var(--c-border) !important;
  transition:
    background 0.3s,
    color 0.3s,
    border-color 0.3s;
}
</style>
<style scoped>
.lang-toggle {
  position: relative;
  background: var(--c-surface);
}
.lang-toggle button {
  position: relative;
  z-index: 2;
  color: var(--c-text-dim, #888);
}
.lang-toggle button.active {
  color: var(--c-text);
}
.lang-toggle .pill {
  position: absolute;
  z-index: 1;
  top: 2px;
  bottom: 2px;
  width: 50%;
  background: var(--c-primary, #6366f1);
  border-radius: 9999px;
  transition: transform 0.25s;
}
</style>
