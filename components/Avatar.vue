<template>
  <div
    class="avatar inline-flex items-center justify-center rounded-full text-[10px] font-semibold select-none"
    :style="styleObj"
    role="img"
    :aria-label="label"
  >
    {{ initials }}
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";

interface Props {
  nick: string;
  size?: number;
}
const props = defineProps<Props>();
const size = computed(() => props.size || 32);
const initials = computed(() =>
  (props.nick || "")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase(),
);
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
const hval = computed(() => hash(props.nick || ""));
const hueA = computed(() => hval.value % 360);
const hueB = computed(() => (hval.value >> 5) % 360);
const styleObj = computed(() => ({
  width: size.value + "px",
  height: size.value + "px",
  background: `linear-gradient(135deg,hsl(${hueA.value} 70% 45%),hsl(${hueB.value} 70% 55%))`,
  color: "white",
}));
const label = computed(() => `Avatar ${props.nick}`);
</script>
<style scoped>
.avatar {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
}
</style>
