import { ref, onMounted, onBeforeUnmount, watch, type Ref } from "vue";

export interface WaveformOptions {
  url: string;
  progressColor?: string;
  waveColor?: string;
  progressColorRef?: Ref<string>;
  waveColorRef?: Ref<string>;
  barWidth?: number;
  height?: number;
  playbackRate?: Ref<number>;
  gain?: number;
  volumeRef?: Ref<number>;
  lazy?: boolean;
  peaks?: number[];
  type?: "waveform" | "bars" | "spectrogram";
}
export interface UseWaveformReturn {
  container: Ref<HTMLElement | null>;
  wavesurfer: Ref<any>;
  ready: Ref<boolean>;
  error: Ref<string | null>;
  ensure: () => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  getAnalyser: () => any | null;
}

export function useWaveform(opts: WaveformOptions): UseWaveformReturn {
  const container = ref<HTMLElement | null>(null);
  const wavesurfer = ref<any>(null);
  const ready = ref(false);
  const error = ref<string | null>(null);

  function play() {
    if (!process.client) return;
    if (wavesurfer.value && ready.value) {
      try {
        wavesurfer.value.play();
      } catch {}
    }
  }
  function pause() {
    if (!process.client) return;
    if (wavesurfer.value && ready.value) {
      try {
        wavesurfer.value.pause();
      } catch {}
    }
  }
  function stop() {
    if (!process.client) return;
    if (wavesurfer.value && ready.value) {
      try {
        wavesurfer.value.stop();
      } catch {}
    }
  }

  async function ensure() {
    if (!process.client) return;
    if (wavesurfer.value || !container.value) return;
    const WaveSurfer = (await import("wavesurfer.js")).default;
    let baseOpts: any = {
      container: container.value,
      url: opts.url,
      height: opts.height ?? 40,
      barWidth: opts.barWidth ?? 2,
      responsive: true,
      normalize: true,
      waveColor: opts.waveColorRef
        ? opts.waveColorRef.value
        : opts.waveColor || "rgba(150,150,150,.5)",
      progressColor: opts.progressColorRef
        ? opts.progressColorRef.value
        : opts.progressColor || "var(--color-primary, #6366F1)",
      cursorWidth: 0,
    };
    if (opts.type === "spectrogram") {
      const SpectrogramPlugin = (
        await import("wavesurfer.js/dist/plugins/spectrogram.js")
      ).default;
      baseOpts.plugins = [
        SpectrogramPlugin.create({
          container: container.value,
          labels: true,
        }),
      ];
    } else {
      baseOpts.plugins = [];
    }
    watch(
      () => opts.type,
      async () => {
        if (!container.value) return;
        if (wavesurfer.value) {
          try {
            wavesurfer.value.destroy();
          } catch {}
          wavesurfer.value = null;
        }
        await ensure();
      },
    );
    wavesurfer.value = WaveSurfer.create(baseOpts);
    try {
      const validPeaks =
        Array.isArray(opts.peaks) &&
        opts.peaks.length >= 32 &&
        opts.peaks.every((p) => typeof p === "number" && p >= 0 && p <= 1);
      if (validPeaks) {
        await wavesurfer.value.load(opts.url, opts.peaks);
      } else {
        await wavesurfer.value.load(opts.url);
      }
    } catch (err) {
      try {
        await wavesurfer.value.load(opts.url);
        error.value = null;
      } catch (err2) {
        error.value = "Error loading waveform";
        console.error("Error loading waveform:", err2);
      }
      console.error("Error loading waveform (peaks):", err);
    }
    wavesurfer.value.on("ready", () => {
      ready.value = true;
      error.value = null;
    });
    wavesurfer.value.on("error", (e: any) => {
      error.value = typeof e === "string" ? e : "Error en wavesurfer";
      console.error("Wavesurfer error:", e);
    });
    watch(container, (el) => {
      if (el && !wavesurfer.value) ensure();
    });
  }

  onMounted(async () => {
    if (!opts.lazy && process.client) await ensure();
  });

  onBeforeUnmount(() => {
    if (!process.client) return;
    try {
      wavesurfer.value?.destroy();
    } catch {}
    wavesurfer.value = null;
  });

  if (opts.playbackRate) {
    watch(opts.playbackRate, (r) => {
      if (wavesurfer.value) wavesurfer.value.setPlaybackRate(r);
    });
  }

  if (opts.waveColorRef) {
    watch(opts.waveColorRef, (c) => {
      if (wavesurfer.value && wavesurfer.value.setOptions) {
        wavesurfer.value.setOptions({ waveColor: c });
      }
    });
  }
  if (opts.progressColorRef) {
    watch(opts.progressColorRef, (c) => {
      if (wavesurfer.value && wavesurfer.value.setOptions) {
        wavesurfer.value.setOptions({ progressColor: c });
      }
    });
  }
  if (opts.volumeRef) {
    watch(opts.volumeRef, (v) => {
      if (wavesurfer.value) {
        try {
          wavesurfer.value.setVolume(v);
        } catch {}
      }
    });
  }

  return {
    container,
    wavesurfer,
    ready,
    error,
    ensure,
    play,
    pause,
    stop,
    getAnalyser: () => {
      if (
        wavesurfer.value &&
        wavesurfer.value.backend &&
        wavesurfer.value.backend.analyser
      ) {
        return wavesurfer.value.backend.analyser;
      }
      return null;
    },
  };
}
