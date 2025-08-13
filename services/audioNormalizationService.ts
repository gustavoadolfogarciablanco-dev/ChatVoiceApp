export interface NormalizeOptions {
  targetPeak?: number;
  targetRms?: number;
  maxGain?: number;
}

export async function normalizeAudioBuffer(
  buf: AudioBuffer,
  opts: NormalizeOptions = {},
): Promise<AudioBuffer> {
  const { targetPeak = 0.95, targetRms, maxGain = 10 } = opts;
  const channels = buf.numberOfChannels;
  let peak = 0;
  const data: Float32Array[] = [];
  for (let ch = 0; ch < channels; ch++) {
    const arr = buf.getChannelData(ch);
    data.push(arr);
    for (let i = 0; i < arr.length; i++) {
      const v = Math.abs(arr[i]);
      if (v > peak) peak = v;
    }
  }
  let gain = peak > 0 ? targetPeak / peak : 1;
  if (targetRms) {
    let sumSq = 0;
    const arr = data[0];
    for (let i = 0; i < arr.length; i++) sumSq += arr[i] * arr[i];
    const rms = Math.sqrt(sumSq / arr.length);
    if (rms > 0) {
      const rmsGain = targetRms / rms;
      gain = Math.min(
        gain,
        rmsGain * (targetPeak / Math.min(peak || targetPeak, targetPeak)),
      );
    }
  }
  if (gain > maxGain) gain = maxGain;
  if (gain <= 0 || !isFinite(gain)) return buf;
  const ctx = new OfflineAudioContext(channels, buf.length, buf.sampleRate);
  const clone = ctx.createBuffer(channels, buf.length, buf.sampleRate);
  for (let ch = 0; ch < channels; ch++) {
    const src = data[ch];
    const dest = clone.getChannelData(ch);
    for (let i = 0; i < src.length; i++) dest[i] = src[i] * gain;
  }
  return clone;
}

export async function normalizeBlob(
  blob: Blob,
  opts?: NormalizeOptions,
): Promise<Blob> {
  const arrayBuf = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
  const norm = await normalizeAudioBuffer(audioBuf, opts);
  
  const wav = audioBufferToWav(norm);
  return new Blob([wav], { type: "audio/wav" });
}

// Minimal WAV encoder for PCM 16-bit little endian
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bits = 16;
  const bytesPerSample = bits / 8;
  const length = buffer.length * numCh * bytesPerSample;
  const blockAlign = numCh * bytesPerSample;
  const ab = new ArrayBuffer(44 + length);
  const dv = new DataView(ab);
  let offset = 0;
  function writeString(s: string) {
    for (let i = 0; i < s.length; i++) dv.setUint8(offset++, s.charCodeAt(i));
  }
  function writeUint32(v: number) {
    dv.setUint32(offset, v, true);
    offset += 4;
  }
  function writeUint16(v: number) {
    dv.setUint16(offset, v, true);
    offset += 2;
  }
  writeString("RIFF");
  writeUint32(36 + length);
  writeString("WAVE");
  writeString("fmt ");
  writeUint32(16);
  writeUint16(format);
  writeUint16(numCh);
  writeUint32(sampleRate);
  writeUint32(sampleRate * blockAlign);
  writeUint16(blockAlign);
  writeUint16(bits);
  writeString("data");
  writeUint32(length);
  // Interleave
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numCh; ch++)
    channelData.push(buffer.getChannelData(ch));
  const maxSample = 32767;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      let sample = channelData[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      dv.setInt16(
        offset,
        sample < 0 ? sample * 32768 : sample * maxSample,
        true,
      );
      offset += 2;
    }
  }
  return ab;
}
