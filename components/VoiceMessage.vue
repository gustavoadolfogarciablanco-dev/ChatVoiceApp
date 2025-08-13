<template>
  <div class="flex items-start w-full voice-message-item">
    <div class="flex flex-col gap-1 items-center pt-0 pr-1">
    </div>
    <div class="flex-1 min-w-0">
      <div
          class="voice-bubble px-2 py-1 sm:px-2 sm:py-1 flex flex-col gap-1 bubble-tail"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] text-primary font-semibold">
            {{ props.msg.sender || props.msg.recipients?.[0] || t('voice.me') }}
          </span>
          <span
            v-if="recipientNicks.length"
            class="text-[10px] text-emerald-600"
          >
            →
            {{
              recipientNicks.length === 1
                ? recipientNicks[0]
                : recipientNicks.join(", ")
            }}
          </span>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <v-select
            :items="rates"
            v-model="rate"
            density="compact"
            hide-details
            class="rate-select"
          />
          <v-select
            :items="waveformTypes"
            v-model="waveformStore.type"
            density="compact"
            hide-details
            class="waveform-type-select"
            style="max-width: 120px"
            :label="t('waveform.type')"
            item-title="title"
            item-value="value"
          />
        </div>
        <div class="audio-controls flex items-center gap-2 mb-2">
          <v-btn
            icon
            size="small"
            variant="text"
            @click="togglePlay"
          >
            <v-icon>{{ isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
          </v-btn>
          <span class="text-xs text-dim">
            <template v-if="isPlaying">
              {{ t('voice.listening') }}
              <span>({{ formatTime(currentTime || 0) }} / {{ prettyDuration }})</span>
            </template>
            <template v-else-if="!isPlaying && currentTime > 0 && currentTime < duration">
              {{ t('voice.pausing') }}
              <span v-if="remainingTime > 0"> ({{ remainingTime.toFixed(1) }}s {{ t('voice.left') }})</span>
              <span>({{ formatTime(currentTime || 0) }} / {{ prettyDuration }})</span>
            </template>
            <template v-else>
              {{ t('voice.play') }}
              <span>(0:00 / {{ prettyDuration }})</span>
            </template>
          </span>
        </div>
        <audio
          ref="audioRef"
          :src="props.msg.url"
          :controls="false"
          @play="audioVis.play"
          @pause="audioVis.pause"
          style="width: 0; height: 0; display: none;"
        ></audio>
        <template v-if="waveformStore.type === 'bars'">
          <div class="wave-wrapper">
            <div
              v-for="(p, i) in barsPeaks"
              :key="i"
              class="w-[3px] rounded-full bg-[var(--c-primary,#6366F1)] transition-[height] duration-150 ease-out"
              :style="{
                height: Math.max(2, Math.round(p * 100)) + '%',
              }"
            ></div>
          </div>
        </template>
        <template v-else-if="waveformStore.type === 'waveform'">
          <svg
            width="100%"
            height="48"
            viewBox="0 0 120 48"
            preserveAspectRatio="none"
            style="display: block; position: relative; z-index: 2"
          >
            <polyline
              :points="
                waveformPoints.map(
                  (p: number, i: number) => `${(i / 119) * 120},${48 - p * 44}`
                ).join(' ')
              "
              fill="none"
              stroke="var(--c-primary,#6366F1)"
              stroke-width="2"
              :opacity="waveformPoints.length ? 1 : 0.3"
              style="vector-effect: non-scaling-stroke"
            ></polyline>
          </svg>
        </template>
        <template v-else-if="waveformStore.type === 'spectrogram'">
          <div class="spectrogram-live" style="display: flex; align-items: flex-end; height: 48px; min-height: 48px;">
            <template v-if="spectrogramColumns.length && spectrogramColumns[0].some((v: number) => v > 0)">
              <div
                v-for="(frame, colIdx) in spectrogramColumns"
                :key="colIdx"
                style="display: flex; flex-direction: column-reverse; align-items: center; width: 3px; margin-right: 1.5px; height: 100%;"
              >
                <div
                  v-for="(v, rowIdx) in frame"
                  :key="rowIdx"
                  :style="{
                    height: (48 / frame.length) + 'px',
                    width: '100%',
                    background: `linear-gradient(to top, hsl(${220 + v * 120}, 90%, ${30 + v * 50}%), transparent 90%)`,
                    opacity: Math.max(0.15, v),
                    borderRadius: rowIdx === frame.length - 1 ? '0 0 2px 2px' : rowIdx === 0 ? '2px 2px 0 0' : '0',
                    transition: 'opacity 0.15s cubic-bezier(.4,2,.6,1)',
                  }"
                ></div>
              </div>
            </template>
            <template v-else>
              <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--v-theme-on-surface, #888); font-size: 12px; opacity: 0.7;">
                {{ t('waveform.nodata') }}
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useAudioVisualizer } from "@/composables/useAudioVisualizer";
import { ref, computed, onMounted } from "vue";
import { useWaveformStore } from "@/store/waveform";
import { useChatStore, type VoiceMessage } from "@/store/chat";
import { PLAYBACK_RATES } from "@/constants/playback";
import { usePresenceStore } from "@/store/presence";
import { t } from "@/i18n/i18nService";

const waveformStore = useWaveformStore();
const waveformTypes = [
  { value: 'waveform', title: t('waveform.waveform') },
  { value: 'bars', title: t('waveform.bars') },
  { value: 'spectrogram', title: t('waveform.spectrogram') },
];
const audioRef = ref<HTMLAudioElement | null>(null);
const props = defineProps<{ msg: VoiceMessage; mine?: boolean }>();
const presence = usePresenceStore();
const audioVis = useAudioVisualizer();
onMounted(() => {
  if (audioRef.value) audioVis.connectAudioElement(audioRef.value);
});
const chat = useChatStore();
const rate = ref(chat.playbackRate);
const rates = PLAYBACK_RATES as unknown as number[];

import { watch } from "vue";
watch([rate, audioRef], ([newRate, newAudio]) => {
  if (newAudio) newAudio.playbackRate = Number(newRate);
}, { immediate: true });

function togglePlay() {
  const audio = audioRef.value;
  if (!audio) return;
  if (audio.paused) audio.play();
  else audio.pause();
}
const isPlaying = audioVis.isPlaying;
const spectrogramColumns = computed(() => {
  const history = audioVis.spectrogramHistory.value;
  const cols = 60;
  const rows = 64;
  const empty = Array(rows).fill(0);
  const frames = history.length >= cols
    ? history.slice(-cols)
    : [
        ...Array(cols - history.length).fill(empty),
        ...history
      ];
  return frames.map((f: number[]) => f.length === rows ? f : [...f, ...Array(rows - f.length).fill(0)]);
});
const barsPeaks = computed(() => {
  const arr = audioVis.liveWaveform.value.length ? audioVis.liveWaveform.value : [0];
  const bars = 60;
  const bucket = Math.max(1, Math.floor(arr.length / bars));
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    const start = i * bucket;
    if (start >= arr.length) break;
    const slice = arr.slice(start, start + bucket);
    out.push(Math.min(1, Math.sqrt(slice.reduce((s: number, v: number) => s + v * v, 0) / slice.length)));
  }
  if (!out.length) return Array(bars).fill(0.05);
  return out;
});

const waveformPoints = computed(() => {
  const arr = audioVis.liveWaveform.value;
  const N = 120;
  if (!arr.length) return Array(N).fill(0.5);
  if (arr.length === N) return arr.map(v => (v + 1) / 2);
  if (arr.length > N) return arr.slice(-N).map(v => (v + 1) / 2);
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    const idx = (i / (N - 1)) * (arr.length - 1);
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    const frac = idx - low;
    const v = (1 - frac) * arr[low] + frac * arr[high];
    out.push((v + 1) / 2);
  }
  return out;
});
function getNick(id: string) {
  return presence.users[id]?.nickname || id;
}
const recipientNicks = computed(() => {
  if (!props.msg.recipients || !props.msg.recipients.length) return [];
  return props.msg.recipients.map(getNick);
});
onMounted(() => {
  if (audioRef.value) audioVis.connectAudioElement(audioRef.value);
});

const dynamicHeight = ref(48);
let resizeHandler: any;

function computeHeight() {
  if (typeof window !== "undefined") {
    dynamicHeight.value = window.innerWidth < 640 ? 36 : 48;
  }
}

onMounted(() => {
if (typeof window === 'undefined') return;
  resizeHandler = () => computeHeight();
  window.addEventListener("resize", resizeHandler, { passive: true });
});


const prettyDuration = computed(() => {
  const dur = typeof props.msg.duration === 'number' && isFinite(props.msg.duration) ? props.msg.duration : 0;
  return dur.toFixed(1) + "s";
});
const currentTime = ref(0);
const duration = ref(props.msg.duration);

onMounted(() => {
  if (audioRef.value) {
    audioRef.value.addEventListener('timeupdate', () => {
      currentTime.value = audioRef.value?.currentTime || 0;
    });
    audioRef.value.addEventListener('durationchange', () => {
      duration.value = audioRef.value?.duration || props.msg.duration;
    });
    audioRef.value.addEventListener('loadedmetadata', () => {
      duration.value = audioRef.value?.duration || props.msg.duration;
    });
    duration.value = audioRef.value.duration || props.msg.duration;
  }
});

const remainingTime = computed(() => {
  if (!audioRef.value) return 0;
  if (audioRef.value.paused && currentTime.value < duration.value) {
    return Math.max(0, duration.value - currentTime.value);
  }
  return 0;
});

function formatTime(sec: number) {
  if (!isFinite(sec) || isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
</script>
<style scoped>
.voice-message-item {
  margin-bottom: 18px;
}
.rate-select :deep(.v-field__input) {
  padding: 0 4px;
  min-height: 28px;
}
.voice-bubble {
  border-radius: 12px;
  background: var(--v-theme-surface, #fff);
  border: 1.5px solid var(--v-theme-outline, #e5e7eb);
  box-shadow: 0 2px 8px var(--v-theme-shadow, #0001);
  transition: background 0.2s, border 0.2s;
}
.wave-wrapper {
  position: relative;
  min-height: 48px !important;
  height: 48px !important;
  width: 100% !important;
  box-sizing: border-box;
  background: var(--v-theme-surface, #fff);
  border-radius: 6px;
  border: 1.5px solid var(--v-theme-outline, #e5e7eb);
  box-shadow: 0 2px 8px var(--v-theme-shadow, #0001);
  transition: background 0.2s, border 0.2s;
  padding: 2px 0;
  overflow: visible;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}
.spectrogram-live {
  background: var(--v-theme-surface, #fff);
  border-radius: 6px;
  min-height: 48px;
  height: 48px;
  width: 100%;
  box-shadow: 0 2px 8px var(--v-theme-shadow, #0002);
  border: 1.5px solid var(--v-theme-outline, #e5e7eb);
  transition: background 0.2s, border 0.2s;
  padding: 2px 0;
  overflow: visible;
}
.spectro-bar {
  border-radius: 2px 2px 0 0;
  will-change: height;
}
</style>
