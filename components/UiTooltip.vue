<template>
  <span
    class="relative inline-block"
    @mouseenter="show = true"
    @mouseleave="show = false"
    @focusin="show = true"
    @focusout="show = false"
  >
    <slot />
    <transition name="fade">
      <div v-if="show" role="tooltip" class="tooltip-content" :id="id">
        {{ text }}
      </div>
    </transition>
  </span>
</template>
<script setup lang="ts">
import { ref } from "vue";
const props = defineProps<{ text: string; id?: string }>();
const show = ref(false);
const id = props.id || `tt-${Math.random().toString(36).slice(2, 8)}`;
</script>
<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.tooltip-content {
  position: absolute;
  z-index: 50;
  top: -2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  background: #262626;
  font-size: 10px;
  line-height: 1;
  color: #fff;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  pointer-events: none;
}
</style>
