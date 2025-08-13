import { ref, onBeforeUnmount } from "vue";

export function useAudioVisualizer() {
  let audio: HTMLAudioElement | null = null;
  let connected = false;
  const liveWaveform = ref<number[]>([]);
    const liveSpectrogram = ref<number[]>([]);
    const spectrogramHistory = ref<number[][]>([]);
    const SPECTROGRAM_COLS = 60;
  const isPlaying = ref(false);
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let dataArray: Uint8Array | null = null;
  let anim: number | null = null;

  function connectAudioElement(el: HTMLAudioElement) {
    if (connected || !el || typeof el !== 'object') return;
    audio = el;
    if ('crossOrigin' in audio) audio.crossOrigin = "anonymous";
    audioCtx = new AudioContext();
    const source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    dataArray = new Uint8Array(analyser.fftSize);

    async function handlePlay() {
      if (audioCtx && audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch {}
      }
      isPlaying.value = true;
      sample();
    }
    function handlePause() {
      isPlaying.value = false;
      stopAnim();
      liveWaveform.value = [];
      liveSpectrogram.value = [];
    }
    function handleEnded() {
      isPlaying.value = false;
      stopAnim();
      liveWaveform.value = [];
      liveSpectrogram.value = [];
    }
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", () => {
      if (audio && !audio.paused && !audio.ended) {
        if (!isPlaying.value) {
          isPlaying.value = true;
          sample();
        }
      }
    });
    if (!audio.paused && !audio.ended) {
      isPlaying.value = true;
      sample();
    }
    connected = true;
  }

  function play() {
    audio?.play();
  }
  function pause() {
    audio?.pause();
  }
  function stopAnim() {
    if (anim) cancelAnimationFrame(anim);
    anim = null;
  }
  function sample() {
    if (!analyser || !dataArray || !audio) return;
    analyser.getByteTimeDomainData(dataArray as any);
    const waveform: number[] = [];
    for (let i = 0; i < dataArray.length; i += 4) {
      waveform.push((dataArray[i] - 128) / 128);
    }
    liveWaveform.value = waveform;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
      const frame = Array.from(freqData.slice(0, 64)).map((v) => v / 255);
      liveSpectrogram.value = frame;
      spectrogramHistory.value.push(frame);
      if (spectrogramHistory.value.length > SPECTROGRAM_COLS) {
        spectrogramHistory.value.shift();
      }
    if (!audio.paused && !audio.ended) {
      isPlaying.value = true;
      anim = requestAnimationFrame(sample);
    } else {
      isPlaying.value = false;
      stopAnim();
    }
  }

  onBeforeUnmount(() => {
    stopAnim();
    audio?.pause();
    audio = null;
    audioCtx?.close();
    audioCtx = null;
    analyser = null;
    liveWaveform.value = [];
    liveSpectrogram.value = [];
    spectrogramHistory.value = [];
  });

  return {
    liveWaveform,
    liveSpectrogram,
    spectrogramHistory,
    isPlaying,
    play,
    pause,
    connectAudioElement,
  };
}
