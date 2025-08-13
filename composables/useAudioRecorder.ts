import { ref } from "vue";
import { t } from "@/i18n/i18nService";

interface RecordResult {
  blob: Blob;
  duration: number;
}

export function useAudioRecorder(maxMs = 30000) {
  const isRecording = ref(false);
  const isPaused = ref(false);
  const livePeaks = ref<number[]>([]);
  const liveWaveform = ref<number[]>([]);
  const liveSpectrogram = ref<number[]>([]);
  const elapsedMs = ref(0);
  const error = ref<string | null>(null);
  const bytesRecorded = ref(0);
  const lastRms = ref(0);
  const maxRms = ref(0);
  const isSilentLive = ref(true);
  const pausedMs = ref(0);
  const completed = ref<RecordResult | null>(null);
  let mediaRecorder: MediaRecorder | null = null;
  let startTime = 0;
  let totalPausedMs = 0;
  let pauseStartedAt = 0;
  const chunks: BlobPart[] = [];
  let timer: number | null = null;
  let watchdog: number | null = null;

  async function start() {
    error.value = null;
    if (isRecording.value) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = "audio/wav";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
      }
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      chunks.length = 0;
      bytesRecorded.value = 0;
      completed.value = null;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
        bytesRecorded.value += e.data.size || 0;
        // enforce cap even if rAF throttled
        const now = performance.now();
        const pausedPortion =
          totalPausedMs + (isPaused.value ? now - pauseStartedAt : 0);
        const active = now - startTime - pausedPortion;
        if (!isPaused.value && active >= maxMs && isRecording.value) {
          void stop();
        }
      };

      mediaRecorder.start(250);
      isRecording.value = true;
      startTime = performance.now();
      tick();
      startLiveAnalysis(stream);
      watchdog = window.setInterval(() => {
        if (!isRecording.value) return;
        const now = performance.now();
        const pausedPortion =
          totalPausedMs + (isPaused.value ? now - pauseStartedAt : 0);
        const active = now - startTime - pausedPortion;
        if (!isPaused.value && active >= maxMs) {
          void stop();
        }
      }, 300);
    } catch (e: any) {
      error.value = e?.message || t("recorder.error.mic");
    }
  }

  function tick() {
    if (!isRecording.value) return;
    const now = performance.now();
    const pausedPortion =
      totalPausedMs + (isPaused.value ? now - pauseStartedAt : 0);
    const active = now - startTime - pausedPortion;
    elapsedMs.value = active;
    pausedMs.value = pausedPortion;
    if (!isPaused.value && active >= maxMs) {
      void stop();
      return;
    }
    timer = window.requestAnimationFrame(tick);
  }

  function pause() {
    if (!mediaRecorder || !isRecording.value || isPaused.value) return;
    try {
      mediaRecorder.pause();
      isPaused.value = true;
      pauseStartedAt = performance.now();
    } catch {}
  }
  function resume() {
    if (!mediaRecorder || !isRecording.value || !isPaused.value) return;
    try {
      mediaRecorder.resume();
      isPaused.value = false;
      totalPausedMs += performance.now() - pauseStartedAt;
      pauseStartedAt = 0;
    } catch {}
  }
  function cancel() {
    if (!isRecording.value) return;
    try {
      mediaRecorder?.stop();
    } catch {}
    cleanup(true);
  }

  async function stop(): Promise<RecordResult | null> {
    if (!isRecording.value || !mediaRecorder) return null;
    return new Promise((resolve) => {
      mediaRecorder!.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const now = performance.now();
        const pausedPortion =
          totalPausedMs + (isPaused.value ? now - pauseStartedAt : 0);
        let activeMs = now - startTime - pausedPortion;
        if (activeMs > maxMs) activeMs = maxMs;
        const duration = activeMs / 1000;
        cleanup();
        const silent = await isSilent(blob);
        if (silent) {
          error.value = t("recorder.error.silence");
          resolve(null);
          return;
        }
        const result = { blob, duration };
        completed.value = result;
        resolve(result);
      };
      mediaRecorder!.stop();
    });
  }

  function cleanup(cancelled = false) {
    isRecording.value = false;
    isPaused.value = false;
    if (timer) cancelAnimationFrame(timer);
    timer = null;
    mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
    mediaRecorder = null;
    if (cancelled) chunks.length = 0;
    stopLiveAnalysis();
    livePeaks.value = [];
    lastRms.value = 0;
    maxRms.value = 0;
    isSilentLive.value = true;
    totalPausedMs = 0;
    pauseStartedAt = 0;
    pausedMs.value = 0;
    if (watchdog) {
      clearInterval(watchdog);
      watchdog = null;
    }
  }

  let sharedCtx: AudioContext | null = null;
  const SILENCE_THRESHOLD = 0.005;
  async function isSilent(
    blob: Blob,
    threshold = SILENCE_THRESHOLD,
  ): Promise<boolean> {
    const arrayBuf = await blob.arrayBuffer();
    if (!sharedCtx) sharedCtx = new AudioContext();
    let buffer: AudioBuffer;
    try {
      buffer = await sharedCtx.decodeAudioData(arrayBuf.slice(0));
    } catch (err) {
      error.value = t("recorder.error.mic");
      return true;
    }
    const channel = buffer.getChannelData(0);
    let sum = 0;
    const stride = Math.max(1, Math.floor(channel.length / 5000));
    for (let i = 0; i < channel.length; i += stride) {
      const v = channel[i];
      sum += v * v;
    }
    const rms = Math.sqrt(sum / (channel.length / stride));
    return rms < threshold;
  }

  let analyser: AnalyserNode | null = null;
  let audioCtx: AudioContext | null = null;
  let liveDataArray: Uint8Array | null = null;
  let liveAnim: number | null = null;
  function startLiveAnalysis(stream: MediaStream) {
    try {
      audioCtx = audioCtx || new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      liveDataArray = new Uint8Array(analyser.fftSize);
      sampleLive();
    } catch {}
  }
  function sampleLive() {
    if (!analyser || !liveDataArray) return;
    if (isPaused.value) {
      liveAnim = requestAnimationFrame(sampleLive);
      return;
    }
    analyser.getByteTimeDomainData(liveDataArray as any);
    let sum = 0;
    const waveform: number[] = [];
    for (let i = 0; i < liveDataArray.length; i += 4) {
      const v = (liveDataArray[i] - 128) / 128;
      sum += v * v;
      waveform.push(v);
    }
    const rms = Math.sqrt(sum / (liveDataArray.length / 4));
    livePeaks.value.push(rms);
    if (livePeaks.value.length > 120) livePeaks.value.shift();
    liveWaveform.value = waveform;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    liveSpectrogram.value = Array.from(freqData.slice(0, 64)).map(
      (v) => v / 255,
    );
    lastRms.value = rms;
    if (rms > maxRms.value) maxRms.value = rms;
    isSilentLive.value = rms < SILENCE_THRESHOLD;
    liveAnim = requestAnimationFrame(sampleLive);
  }
  function stopLiveAnalysis() {
    if (liveAnim) cancelAnimationFrame(liveAnim);
    liveAnim = null;
    analyser = null;
    liveWaveform.value = [];
    liveSpectrogram.value = [];
  }

  return {
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
    liveWaveform,
    liveSpectrogram,
    bytesRecorded,
    lastRms,
    maxRms,
    isSilentLive,
    completed,
  };
}
