import { defineStore } from "pinia";

export const useWaveformStore = defineStore("waveform", {
  state: () => ({
    type: "waveform" as "waveform" | "bars" | "spectrogram",
  }),
  actions: {
    setType(t: "waveform" | "bars" | "spectrogram") {
      this.type = t;
    },
  },
});
