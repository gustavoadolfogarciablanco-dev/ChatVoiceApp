<template>
  <div ref="scroller" class="relative overflow-auto h-full" @scroll="onScroll">
    <div :style="{ height: totalHeight + 'px', position: 'relative' }">
      <div
        v-for="item in visibleItems"
        :key="item.id"
        class="absolute left-0 right-0 px-0 will-change-transform"
        :ref="
          (el: any) => registerEl(item.id, el as unknown as HTMLElement | null)
        "
        :style="{
          transform: `translateY(${item.top}px)`,
          height: item.height + 'px',
          padding: gap / 2 + 'px 0',
        }"
      >
        <slot :message="item.msg" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from "vue";

interface MessageLike {
  id: string;
}
const props = defineProps<{
  messages: MessageLike[];
  itemHeight?: number;
  gap?: number;
}>();

const defaultItemHeight = computed(() => props.itemHeight || 110);
const scroller = ref<HTMLElement | null>(null);
const gap = computed(() => props.gap ?? 12);
const scrollTop = ref(0);
const height = ref(0);

function onScroll() {
  if (!scroller.value) return;
  scrollTop.value = scroller.value.scrollTop;
}

onMounted(() => {
  if (scroller.value) height.value = scroller.value.clientHeight;
  window.addEventListener("resize", updateHeight);
});
function updateHeight() {
  if (scroller.value) height.value = scroller.value.clientHeight;
}

// Dynamic heights map
const heights = ref<Record<string, number>>({});
const orderedIds = computed(() => props.messages.map((m) => m.id));
const prefixSums = computed(() => {
  const arr: number[] = [];
  let acc = 0;
  for (const id of orderedIds.value) {
    const h = heights.value[id] || defaultItemHeight.value + gap.value;
    arr.push(acc);
    acc += h + gap.value;
  }
  return { offsets: arr, total: acc };
});
const totalHeight = computed(() => prefixSums.value.total);

const overscan = 5;
function findIndex(offset: number) {
  const { offsets } = prefixSums.value;
  let lo = 0,
    hi = offsets.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] <= offset) lo = mid + 1;
    else hi = mid - 1;
  }
  return Math.max(0, lo - 1);
}
const startIndex = computed(() =>
  Math.max(0, findIndex(scrollTop.value) - overscan),
);
const endIndex = computed(() => {
  const viewEnd = scrollTop.value + height.value;
  let idx = startIndex.value;
  const ids = orderedIds.value;
  while (idx < ids.length) {
    const top = prefixSums.value.offsets[idx];
    if (top > viewEnd) break;
    idx++;
  }
  return Math.min(ids.length, idx + overscan);
});

const visibleItems = computed(() => {
  const out: { id: string; top: number; msg: MessageLike; height: number }[] =
    [];
  for (let i = startIndex.value; i < endIndex.value; i++) {
    const msg = props.messages[i];
    const top = prefixSums.value.offsets[i];
    const h = heights.value[msg.id] || defaultItemHeight.value;
    out.push({ id: msg.id, top, msg, height: h });
  }
  return out;
});

function registerEl(id: string, el: HTMLElement | null) {
  if (!el) return;
  nextTick(() => {
    const rect = el.getBoundingClientRect();
    if (rect.height && Math.abs((heights.value[id] || 0) - rect.height) > 2) {
      heights.value = { ...heights.value, [id]: rect.height };
    }
  });
}

watch(
  () => props.messages.length,
  () => {
    if (scroller.value) {
      scroller.value.scrollTop = scroller.value.scrollHeight;
    }
  },
);
</script>
<style scoped></style>
