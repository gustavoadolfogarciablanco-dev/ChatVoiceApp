<template>
  <div
    class="lang-toggle relative flex items-center rounded-full border border-[var(--c-border)] overflow-hidden text-[11px] font-medium select-none"
  >
    <button
      class="px-2 py-1 transition-colors"
      :class="locale.value === 'es' ? 'active' : ''"
      @click="choose('es')"
      aria-label="Español"
      :aria-pressed="locale.value === 'es'"
    >
      ES
    </button>
    <button
      class="px-2 py-1 transition-colors"
      :class="locale.value === 'en' ? 'active' : ''"
      @click="choose('en')"
      aria-label="English"
      :aria-pressed="locale.value === 'en'"
    >
      EN
    </button>
    <span class="pill" :style="pillStyle"></span>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "@/i18n/i18nService";
const { locale, setLocale } = useI18n();
async function choose(l: "es" | "en") {
  if (l !== locale.value) await setLocale(l);
}
const pillStyle = computed(() => ({
  transform: locale.value === "es" ? "translateX(0%)" : "translateX(100%)",
}));
</script>
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
