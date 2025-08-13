<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <div
    class="toast-container pointer-events-none fixed z-[999] top-4 right-4 flex flex-col gap-2"
  >
    <button
      v-if="toasts.length"
      @click="clearAll"
      class="self-end mb-1 text-[10px] tracking-wide px-2 py-1 rounded bg-[var(--c-surface)]/80 border border-[var(--c-border)] pointer-events-auto hover:bg-[var(--c-surface)]"
    >
      CLEAR
    </button>
    <transition-group name="toast-fade">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="min-w-[220px] max-w-xs rounded-md border px-3 py-2 shadow backdrop-blur text-sm flex items-start gap-2 pointer-events-auto toast-item"
        :class="['border-[var(--c-border)]', t.type ? `toast-${t.type}` : '']"
      >
        <span class="flex-1"
          >{{ t.message
          }}<sup v-if="t.count && t.count > 1" class="ml-1 text-[10px] text-dim"
            >×{{ t.count }}</sup
          ></span
        >
        <button
          class="text-xs opacity-60 hover:opacity-100"
          @click="dismiss(t.id)"
        >
          ×
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToasts } from "@/composables/useToasts";
const { toasts, dismissToast, clearAllToasts } = useToasts();
function dismiss(id: number) {
  dismissToast(id);
}
function clearAll() {
  clearAllToasts();
}
</script>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.25s;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.toast-item {
  background: var(--c-surface) / 90%;
}
.toast-info {
  background: var(--c-surface) !important;
}
.toast-success {
  background: rgba(16, 185, 129, 0.15) !important;
  border-color: rgba(16, 185, 129, 0.4);
}
.toast-error {
  background: rgba(239, 68, 68, 0.15) !important;
  border-color: rgba(239, 68, 68, 0.4);
}
</style>
