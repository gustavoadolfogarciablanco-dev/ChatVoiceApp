<template>
  <div
    class="recorder flex flex-col gap-2 w-full max-w-xl mx-auto items-center text-center"
  >
    <div class="flex flex-wrap items-center gap-2 justify-center w-full">
      <div class="flex items-center gap-1 text-xs" v-if="showRecipients">
        <label class="opacity-70">{{ t("recipients.users") }}:</label>
        <div class="flex flex-wrap gap-1">
          <template v-if="availableRecipients.length">
            <button
              v-for="u in availableRecipients"
              :key="u.id"
              @click="toggleRecipient(u.id)"
              class="px-2 py-1 rounded border text-[11px] flex items-center gap-1"
              :aria-pressed="selectedRecipients.includes(u.id)"
              :aria-label="u.nickname"
              :class="
                selectedRecipients.includes(u.id)
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'border-[var(--c-border)] hover:bg-[var(--c-border)]/20'
              "
            >
              <span
                class="inline-block w-2 h-2 rounded-full"
                :class="
                  selectedRecipients.includes(u.id)
                    ? 'bg-primary'
                    : 'bg-emerald-400 animate-pulse'
                "
              ></span>
              {{ u.nickname }}
            </button>
            <button
              v-if="!allSelected && availableRecipients.length"
              class="px-2 py-1 rounded border text-[11px] border-[var(--c-border)] hover:bg-[var(--c-border)]/20"
              @click="selectAllRecipients"
            >
              {{ t("recipients.select.all") }}
            </button>
            <button
              v-if="anySelected"
              class="px-2 py-1 rounded border text-[11px] bg-primary/10 border-primary text-primary"
              @click="clearRecipients"
            >
              {{ t("recipients.clear") }}
            </button>
          </template>
          <template v-else>
            <template>
              <span class="opacity-60">{{ t("recipients.none") }}</span>
            </template>
          </template>
        </div>
      </div>
      <div
        class="text-[11px] ml-auto"
        v-if="showRecipients && selectedRecipients.length"
      >
        {{ selectedRecipients.length }} {{ t("recipients.selected") }}
      </div>
      <div
        v-if="!showRecipients && conversationTarget"
        class="text-[11px] opacity-70 ml-auto flex items-center gap-1"
      >
        <span>{{ t("recipients.users") }}:</span>
        <span
          class="px-2 py-0.5 rounded bg-primary/20 text-primary text-[11px]"
          >{{ conversationTarget.nickname }}</span
        >
      </div>
    </div>
    <div
      class="footer-bar flex flex-wrap items-center justify-center gap-4 w-full py-3 min-h-[56px]"
      style="background: var(--c-surface, #18181b); border-radius: 12px; box-shadow: 0 2px 8px #0002;"
    >
      <!-- Eliminado selector de tipo de sonda -->
      <v-btn
        v-if="!pending"
        :color="!isRecording ? 'primary' : isPaused ? 'warning' : 'error'"
        @click="mainAction"
        :prepend-icon="!isRecording ? 'mdi-microphone' : 'mdi-stop'"
        :disabled="disabled"
      >
        {{ !isRecording ? t("recorder.start") : t("recorder.stop") }}
      </v-btn>
      <v-btn
        v-if="pending && !isRecording"
        color="success"
        variant="flat"
        @click.stop="finalize"
        prepend-icon="mdi-send"
        :disabled="disabled || sending"
      >
        {{ t("recorder.send") }}
      </v-btn>
      <v-btn
        v-if="isRecording && !pending"
        size="small"
        variant="tonal"
        @click="togglePause"
        :prepend-icon="isPaused ? 'mdi-play' : 'mdi-pause'"
      >
        {{ isPaused ? t("recorder.resume") : t("recorder.pause") }}
      </v-btn>
      <v-btn
        v-if="isRecording"
        size="small"
        color="secondary"
        variant="text"
        @click="cancelRec"
        >{{ t("recorder.cancel") }}</v-btn
      >
      <v-btn
        v-if="pending && !isRecording"
        size="small"
        color="error"
        variant="text"
        @click="discardPending"
        prepend-icon="mdi-close-circle"
        >{{ t("recorder.cancel") }}</v-btn
      >
      <v-btn
        v-if="pending && !isRecording"
        size="small"
        color="warning"
        variant="text"
        @click="reRecord"
        prepend-icon="mdi-record"
        >{{ t("recorder.rerecord") }}</v-btn
      >
      <div class="relative flex items-center justify-center min-w-[140px] max-w-[180px] h-[40px] mx-auto">
        <v-switch
          v-model="autoSend"
          hide-details
          inset
          density="comfortable"
          class="footer-switch w-full text-base transition-colors"
          :class="autoSend ? 'text-primary' : 'opacity-60'"
          :color="autoSend ? 'primary' : undefined"
          :label="t('recorder.auto.send')"
          style="font-size: 1rem;"
        />
        <span class="absolute top-0 right-0 px-2 py-0.5 rounded-full bg-yellow-300 text-yellow-900 text-[10px] font-bold border border-yellow-400 shadow-sm" style="transform: translateY(-60%); letter-spacing: 0.5px;">
          BETA
        </span>
      </div>
      <div
        class="footer-info flex flex-col text-[11px] leading-tight items-center min-w-[90px] text-center mx-auto"
      >
        <span class="tabular-nums flex items-center gap-1"
          >{{ seconds }}s / 30s
          <span
            v-if="Number(seconds) >= 30 && !isRecording"
            class="px-1 py-[1px] rounded bg-red-500/20 text-red-400 text-[9px]"
            >{{ t("recorder.limit") }}</span
          ></span
        >
        <span v-if="pausedSeconds > 0" class="tabular-nums opacity-60"
          >Pausa: {{ pausedSeconds }}s</span
        >
        <span v-if="error" class="text-red-400">{{ error }}</span>
      </div>
    </div>
    <div
      v-if="isRecording"
      class="live-wave h-12 rounded-md border border-[var(--c-border)] px-2 flex items-center gap-1 relative"
      style="min-height: 48px; height: 48px; overflow: visible"
    >
      <v-select
        :items="waveformTypes"
        v-model="waveformType"
        density="comfortable"
        hide-details
        class="waveform-type-select mr-2"
        style="min-width: 140px; max-width: 180px; font-size: 1rem;"
        :label="t('waveform.type')"
        item-title="title"
        item-value="value"
      />
      <div
        class="absolute top-0 left-0 w-full h-full pointer-events-none bg-gradient-to-r from-primary/5 to-transparent animate-pulse opacity-40"
      ></div>
      <div class="flex-1 h-full relative">
        <template v-if="waveformType === 'bars'">
          <div class="flex items-end gap-[2px] h-full">
            <div
              v-for="(p, i) in (Array.isArray(displayPeaks) && displayPeaks.length ? displayPeaks : Array(60).fill(0.5))"
              :key="i"
              class="w-[3px] rounded-full bg-[var(--c-primary,#6366F1)] transition-[height] duration-150 ease-out"
              :style="{ height: Math.max(2, Math.round(p * 100)) + '%' }"
            />
          </div>
        </template>
        <template v-else-if="waveformType === 'waveform'">
          <svg
            width="100%"
            height="48"
            viewBox="0 0 120 48"
            preserveAspectRatio="none"
            style="display: block; position: relative; z-index: 2"
          >
            <polyline
              :points="
                (Array.isArray(displayPeaks) && displayPeaks.length ? displayPeaks : Array(120).fill(0.5))
                  .map(
                    (p: number, i: number) =>
                      `${(i / 119) * 120},${48 - p * 44}`,
                  )
                  .join(' ')
              "
              fill="none"
              stroke="var(--c-primary,#6366F1)"
              stroke-width="2"
              :opacity="Array.isArray(displayPeaks) && displayPeaks.length ? 1 : 0.3"
              style="vector-effect: non-scaling-stroke"
            />
          </svg>
        </template>
        <template v-else-if="waveformType === 'spectrogram'">
          <div
            class="spectrogram-live flex items-end w-full"
            style="
              height: 48px;
              min-height: 48px;
              overflow: visible;
              background: #18181b;
              border-radius: 6px;
            "
          >
            <div
              v-for="(v, i) in (Array.isArray(liveSpectrogram) && liveSpectrogram.length ? liveSpectrogram : Array(60).fill(0.5))"
              :key="i"
              :style="{
                height: Math.max(2, Math.round(v * 48)) + 'px',
                width: '3px',
                marginRight: '1px',
                background: `linear-gradient(to top, hsl(${220 + v * 120}, 80%, ${40 + v * 40}%), transparent 90%)`,
                boxShadow: `0 0 4px hsl(${220 + v * 120}, 80%, 60%)`,
                transition: 'height 0.15s cubic-bezier(.4,2,.6,1)',
              }"
              class="rounded-t-sm spectro-bar"
            />
          </div>
        </template>
      </div>
      <span class="text-[10px] text-dim pl-2 select-none">{{
        isPaused ? t("recorder.paused") : t("recorder.live.wave")
      }}</span>
    </div>
    <div v-if="isRecording" class="flex gap-4 text-[11px] pl-1 flex-wrap">
      <div class="flex items-center gap-1">
        <span class="opacity-60">{{ t("recorder.file.size") }}:</span
        ><strong>{{ prettySize }}</strong>
      </div>
      <div class="flex items-center gap-1">
        <span class="opacity-60">{{ t("recorder.peak") }}:</span
        ><strong>{{ (maxRms * 100).toFixed(0) }}%</strong>
      </div>
      <div
        class="flex items-center gap-1"
        :class="{
          'text-emerald-400': !isSilentLive,
          'text-red-400': isSilentLive,
        }"
      ></div>
    </div>
    <div
      v-else-if="pending"
      class="flex gap-4 text-[11px] pl-1 flex-wrap opacity-80"
    >
      <div class="flex items-center gap-1">
        <span class="opacity-60">{{ t("metrics.file.size") }}:</span
        ><strong>{{ prettySize }}</strong>
      </div>
      <div
        class="flex items-center gap-1"
        v-if="lastNormTime != null && ui.normalizeAudio"
      >
        <span class="opacity-60">{{ t("metrics.normalize.time") }}:</span
        ><strong>{{ lastNormTime }}ms</strong>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useAudioRecorder } from "@/composables/useAudioRecorder";
import { useUserStore } from "@/store/user";
import { useChatStore } from "@/store/chat";
import { sendVoice } from "@/services/realtimeService";
import { computePeaksQuick } from "@/services/peaksService";
import { t } from "@/i18n/i18nService";
import { processAudioOffThread } from "@/services/audioWorker";
import { pushToast } from "@/composables/useToasts";
import { usePresenceStore } from "@/store/presence";
import { useUiStore } from "@/store/ui";

const emit = defineEmits();
const sending = ref(false);
const waveformTypes = [
  { value: "waveform", title: "Waveform" },
  { value: "bars", title: "Bars" },
  { value: "spectrogram", title: "Spectrogram" },
];
const waveformType = ref("waveform");

const {
  isRecording,
  isPaused,
  elapsedMs,
  pausedMs,
  error,
  start,
  stop,
  pause,
  resume,
  cancel,
  livePeaks,
  bytesRecorded,
  maxRms,
  isSilentLive,
} = useAudioRecorder();
const user = useUserStore();
const chat = useChatStore();
const presence = usePresenceStore();
const ui = useUiStore();

const selectedRecipients = ref<string[]>([]);
const availableRecipients = computed(() =>
  presence.list.filter((u) => u.id && u.id !== presence.selfId)
);
const conversationTarget = computed(() => {
  if (!ui.activeConversation || ui.isAll) return null;
  return presence.list.find((p) => p.nickname === ui.activeConversation) || null;
});
const showRecipients = computed(() => !conversationTarget.value);
if (selectedRecipients.value.length) selectedRecipients.value = [];
watch(selectedRecipients, (ids) => {
  if (process.client) {
    try {
      localStorage.setItem("lastRecipients", JSON.stringify(ids));
    } catch {}
  }
});
watch(
  () => presence.list.map((u) => u.id),
  () => {
    if (presence.selfId) {
      selectedRecipients.value = selectedRecipients.value.filter(
        (id) => id !== presence.selfId
      );
    }
    if (conversationTarget.value) {
      selectedRecipients.value = [conversationTarget.value.id];
    }
  },
  { immediate: true }
);
watch(conversationTarget, (val) => {
  if (val) {
    selectedRecipients.value = [val.id];
  } else {
    selectedRecipients.value = [];
  }
});
const allSelected = computed(
  () =>
    availableRecipients.value.length > 0 &&
    selectedRecipients.value.length === availableRecipients.value.length
);
const anySelected = computed(() => selectedRecipients.value.length > 0);
function toggleRecipient(id: string) {
  if (!id) return;
  if (selectedRecipients.value.includes(id)) {
    selectedRecipients.value = selectedRecipients.value.filter((rid) => rid !== id);
  } else {
    selectedRecipients.value = [...selectedRecipients.value, id];
  }
}
function selectAllRecipients() {
  selectedRecipients.value = availableRecipients.value.map((u) => u.id);
}
function clearRecipients() {
  selectedRecipients.value = [];
}
const seconds = computed(() => (elapsedMs.value / 1000).toFixed(1));
const pausedSeconds = computed(() => (pausedMs.value / 1000).toFixed(1));
const disabled = computed(() => !user.nickname);
const pending = ref<{
  blob: Blob;
  duration: number;
  peaks?: number[];
  meta?: { normTimeMs?: number };
} | null>(null);
const lastNormTime = ref<number | null>(null);
const displayPeaks = computed(() => {
  if (isRecording.value) {
    return Array.isArray(livePeaks.value) && livePeaks.value.length ? livePeaks.value : Array(60).fill(0.5);
  }
  if (pending.value && Array.isArray(pending.value.peaks) && pending.value.peaks.length) {
    return pending.value.peaks;
  }
  return Array(60).fill(0.5);
});
const prettySize = computed(() => {
  let size = 0;
  if (isRecording.value && typeof bytesRecorded.value === 'number') {
    size = bytesRecorded.value;
  } else if (pending.value && pending.value.blob) {
    size = pending.value.blob.size;
  }
  if (!size || isNaN(size)) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
});
const autoSend = ref(false);
onMounted(() => {
  try {
    autoSend.value = localStorage.getItem("autoSend") === "1";
  } catch {}
});
watch(autoSend, (v) => {
  if (process.client) {
    try {
      localStorage.setItem("autoSend", v ? "1" : "0");
    } catch {}
  }
  pushToast(t(v ? "toast.autosend.enabled" : "toast.autosend.disabled"), {
    type: "info",
  });
});
let autoSendLock = false;
watch(
  [isRecording, seconds, autoSend],
  async ([rec, sec, auto]) => {
    if (auto && rec && Number(sec) >= 30 && !autoSendLock) {
      autoSendLock = true;
  const result = await stop();
  if (result && pending.value) finalize();
      setTimeout(() => { autoSendLock = false; }, 500);
    }
  }
);
async function mainAction() {
  if (!isRecording.value) {
    await start();
  } else {
    const result = await stop();
    if (result) {
      const { blob, duration } = result;
      let peaks: number[] | undefined;
      let peaksError = ref<string | null>(null);
      try {
        const workerRes = await processAudioOffThread(blob, {
          normalize: false,
          targetPeak: 0.95,
          targetPeaks: 256,
        });
        if (workerRes && workerRes.peaks && workerRes.peaks.length) {
          peaks = workerRes.peaks;
          peaksError.value = null;
        } else {
          peaks = await computePeaksQuick(blob);
          if (!peaks || !peaks.length) {
            peaksError.value = "Could not generate waveform data.";
          }
        }
      } catch (err) {
        peaksError.value = "Error generating waveform data.";
      }
      if (!peaks || !peaks.length) {
        pushToast(t("recorder.error.invalidAudio"), { type: "error" });
        pending.value = null;
        return;
      }
      pending.value = { blob, duration, peaks };
      if (autoSend.value && pending.value) {
  finalize();
      }
    }
  }
}
function togglePause() {
  if (isPaused.value) {
    resume();
  } else {
    pause();
  }
}
function cancelRec() {
  cancel();
  pending.value = null;
  error.value = null;
}
function discardPending() {
  pending.value = null;
  error.value = null;
}
function reRecord() {
  pending.value = null;
  error.value = null;
  setTimeout(() => start(), 0);
}
function finalize() {
  if (!pending.value || sending.value) return;
  sending.value = true;
  try {
    const id = `${user.nickname}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    sendVoice({
      id,
      blob: pending.value.blob,
      duration: pending.value.duration,
      sender: user.nickname,
      recipients: selectedRecipients.value.length ? selectedRecipients.value : undefined,
    });
    if (chat && Array.isArray(chat.messages)) {
      chat.messages.push({
        id,
        blob: pending.value.blob,
        duration: pending.value.duration,
        sender: user.nickname,
        recipients: selectedRecipients.value.length ? selectedRecipients.value : undefined,
        createdAt: Date.now(),
        url: URL.createObjectURL(pending.value.blob),
        status: 'sent',
      });
    }
    pushToast(t('toast.voice.sent'), { type: 'success' });
  } catch (err) {
    pushToast(t('recorder.error.invalidAudio'), { type: 'error' });
  }
  pending.value = null;
  sending.value = false;
  emit("sent");
}

</script>
<style scoped>
.footer-switch {
  min-width: 140px;
  max-width: 180px;
  height: 40px;
  font-size: 1rem;
  align-items: center;
  position: relative;
}
/* Footer normalization */
.footer-bar {
  background: var(--c-surface, #18181b);
  border-radius: 12px;
  min-height: 56px;
  box-shadow: 0 2px 8px #0002;
  padding: 12px 0;
  gap: 1.25rem !important;
}
.footer-switch {
  min-width: 140px;
  max-width: 180px;
  height: 40px;
  font-size: 1rem;
  align-items: center;
}
.footer-bar .v-btn,
.footer-bar .v-switch,
.footer-bar .v-select {
  min-height: 40px;
  font-size: 1rem;
}
.footer-bar .v-btn {
  padding: 0 16px;
}
.footer-bar .v-select,
.waveform-type-select {
  min-width: 140px;
  max-width: 180px;
  font-size: 1rem;
}
.spectrogram-live {
  background: #18181b;
  border-radius: 6px;
  min-height: 48px;
  height: 48px;
  width: 100%;
  box-shadow: 0 2px 8px #0002;
  padding: 2px 0;
  overflow: visible;
}
.spectro-bar {
  border-radius: 2px 2px 0 0;
  will-change: height;
}
.voice-message-item {
  margin-bottom: 18px;
}
</style>
