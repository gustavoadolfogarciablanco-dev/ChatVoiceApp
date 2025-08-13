// Combined audio worker code (inline string generator) for normalization + peaks
// This will be instantiated dynamically to avoid separate bundling complexity.
export interface AudioWorkerJob {
  id: string;
  action: "normalize_peaks";
  buffer: ArrayBuffer; // original audio blob array buffer
  targetPeaks?: number;
  normalize?: boolean;
  targetPeak?: number;
}

interface AudioWorkerResult {
  id: string;
  peaks?: number[];
  blob?: ArrayBuffer;
  mime?: string;
  error?: string;
}

const workerCode = () => `self.onmessage = async (e) => {
  const data = e.data;
  if (!data || data.action !== 'normalize_peaks') return;
  const { id, buffer, targetPeaks = 256, normalize = false, targetPeak = 0.95 } = data;
  try {
    const ctx = new (self.AudioContext || self.webkitAudioContext)();
    const audioBuf = await ctx.decodeAudioData(buffer.slice(0));
    let buf = audioBuf;
    if (normalize) {
      // Peak normalize
      const chs = buf.numberOfChannels;
      let peak=0; const channels=[]; for (let c=0;c<chs;c++){ const arr=buf.getChannelData(c); channels.push(arr); for (let i=0;i<arr.length;i++){ const v=Math.abs(arr[i]); if (v>peak) peak=v; }}
      const gain = peak>0? Math.min(targetPeak/peak, 10):1;
      if (gain !== 1) {
        const off = new OfflineAudioContext(chs, buf.length, buf.sampleRate);
        const clone = off.createBuffer(chs, buf.length, buf.sampleRate);
        for (let c=0;c<chs;c++) { const src=channels[c]; const dest=clone.getChannelData(c); for (let i=0;i<src.length;i++) dest[i]=src[i]*gain; }
        buf = clone;
      }
    }
    // Peaks
    const data0 = buf.getChannelData(0);
    const block = Math.floor(data0.length / targetPeaks) || 1;
    const peaks=[]; for (let i=0;i<targetPeaks;i++){ const start=i*block; if (start>=data0.length) break; let end=start+block; if (end>data0.length) end=data0.length; let m=0; for (let j=start;j<end;j++){ const v=Math.abs(data0[j]); if (v>m) m=v; } peaks.push(m); if (end===data0.length) break; }
    const gmax = peaks.reduce((a,v)=>v>a?v:a,0)||1; const normPeaks = peaks.map(p=>p/gmax);
    // Encode WAV 16-bit
    const chs = buf.numberOfChannels; const sampleRate = buf.sampleRate; const bits=16; const bytesPerSample=bits/8; const length=buf.length*chs*bytesPerSample; const ab=new ArrayBuffer(44+length); const dv=new DataView(ab); let off=0; const wStr=(s)=>{ for(let i=0;i<s.length;i++) dv.setUint8(off++, s.charCodeAt(i)); }; const w32=(v)=>{ dv.setUint32(off, v, true); off+=4; }; const w16=(v)=>{ dv.setUint16(off, v, true); off+=2; };
    wStr('RIFF'); w32(36+length); wStr('WAVE'); wStr('fmt '); w32(16); w16(1); w16(chs); w32(sampleRate); w32(sampleRate*chs*bytesPerSample); w16(chs*bytesPerSample); w16(bits); wStr('data'); w32(length);
    const channelData=[]; for(let c=0;c<chs;c++) channelData.push(buf.getChannelData(c));
    for (let i=0;i<buf.length;i++){ for(let c=0;c<chs;c++){ let sample=channelData[c][i]; sample=Math.max(-1, Math.min(1, sample)); dv.setInt16(off, sample<0? sample*32768: sample*32767, true); off+=2; }}
    postMessage({ id, peaks: normPeaks, blob: ab, mime: 'audio/wav' }, { transfer: [ab] });
  } catch(err){ postMessage({ id, error: String(err) }); }
};`;

let _worker: Worker | null = null;
function ensureWorker(): Worker | null {
  if (_worker) return _worker;
  if (typeof Worker === "undefined") return null;
  const code = workerCode().toString();
  const blob = new Blob([code], { type: "application/javascript" });
  _worker = new Worker(URL.createObjectURL(blob));
  return _worker;
}

export async function processAudioOffThread(
  blob: Blob,
  opts: { normalize: boolean; targetPeak?: number; targetPeaks?: number },
) {
  const w = ensureWorker();
  if (!w) return null;
  return new Promise<{ peaks: number[]; wav: Blob } | null>((resolve) => {
    const id = crypto.randomUUID();
    const to = setTimeout(() => resolve(null), 7000);
    const handler = (ev: MessageEvent<AudioWorkerResult>) => {
      if (!ev.data || ev.data.id !== id) return;
      w.removeEventListener("message", handler);
      clearTimeout(to);
      if (ev.data.error || !ev.data.peaks || !ev.data.blob)
        return resolve(null);
      resolve({
        peaks: ev.data.peaks,
        wav: new Blob([ev.data.blob], { type: ev.data.mime || "audio/wav" }),
      });
    };
    w.addEventListener("message", handler);
    blob
      .arrayBuffer()
      .then((buffer) => {
        try {
          w.postMessage(
            {
              id,
              action: "normalize_peaks",
              buffer,
              targetPeaks: opts.targetPeaks || 256,
              normalize: opts.normalize,
              targetPeak: opts.targetPeak || 0.95,
            },
            { transfer: [buffer] },
          );
        } catch {
          clearTimeout(to);
          resolve(null);
        }
      })
      .catch(() => {
        clearTimeout(to);
        resolve(null);
      });
  });
}
