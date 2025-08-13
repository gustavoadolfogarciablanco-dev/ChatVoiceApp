// Lightweight peaks computation reused by recorder to avoid duplication with repository logic.
// Intentionally small to keep UI responsive.
let sharedCtx: AudioContext | null = null;
let worker: Worker | null = null;

interface PeaksWorkerMsg {
  id: string;
  peaks?: number[];
  error?: string;
}

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === "undefined") return null;
  const blobSrc = `self.onmessage = async (e)=>{\n  const { id, buffer, targetPeaks } = e.data;\n  try {\n    const ctx = new (self.AudioContext || self.webkitAudioContext)();\n    const audioBuf = await ctx.decodeAudioData(buffer.slice(0));\n    const data = audioBuf.getChannelData(0);\n    const block = Math.floor(data.length / targetPeaks) || 1;\n    const peaks = [];\n    for (let i=0;i<targetPeaks;i++){\n      const start=i*block; if (start>=data.length) break;\n      let end=start+block; if (end>data.length) end=data.length;\n      let max=0; for (let j=start;j<end;j++){ const v=Math.abs(data[j]); if (v>max) max=v; }\n      peaks.push(max); if (end===data.length) break;\n    }\n    const gmax = peaks.reduce((m,v)=>v>m?v:m,0)||1;\n    postMessage({ id, peaks: peaks.map(p=>p/gmax) });\n  } catch(err){\n    postMessage({ id, error: String(err) });\n  }\n}`;
  const blob = new Blob([blobSrc], { type: "application/javascript" });
  worker = new Worker(URL.createObjectURL(blob));
  return worker;
}

export async function computePeaksOffThread(
  blob: Blob,
  targetPeaks = 256,
  timeoutMs = 5000,
): Promise<number[] | null> {
  const w = getWorker();
  if (!w) return null;
  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    const to = setTimeout(() => {
      resolve(null);
    }, timeoutMs);
    const handler = (ev: MessageEvent<PeaksWorkerMsg>) => {
      if (!ev.data || ev.data.id !== id) return;
      w.removeEventListener("message", handler);
      clearTimeout(to);
      if (ev.data.peaks) resolve(ev.data.peaks);
      else resolve(null);
    };
    w.addEventListener("message", handler);
    blob
      .arrayBuffer()
      .then((buffer) => {
        try {
          w.postMessage({ id, buffer, targetPeaks });
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

export async function computePeaksQuick(
  blob: Blob,
  targetPeaks = 256,
): Promise<number[]> {
  // Intentar worker primero
  try {
    const off = await computePeaksOffThread(blob, targetPeaks, 4000);
    if (off && off.length) return off;
  } catch {}
  const buf = await blob.arrayBuffer();
  if (!sharedCtx)
    sharedCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  const audioBuf = await sharedCtx.decodeAudioData(buf.slice(0));
  const data = audioBuf.getChannelData(0);
  const block = Math.floor(data.length / targetPeaks) || 1;
  const peaks: number[] = [];
  for (let i = 0; i < targetPeaks; i++) {
    const start = i * block;
    if (start >= data.length) break;
    let end = start + block;
    if (end > data.length) end = data.length;
    let max = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(data[j]);
      if (v > max) max = v;
    }
    peaks.push(max);
    if (end === data.length) break;
  }
  const gmax = peaks.reduce((m, v) => (v > m ? v : m), 0) || 1;
  return peaks.map((p) => p / gmax);
}

export function releaseAudioContext() {
  if (sharedCtx) {
    try {
      sharedCtx.close();
    } catch {}
    sharedCtx = null;
  }
}
