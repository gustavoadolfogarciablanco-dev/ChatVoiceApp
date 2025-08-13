import type { VoiceMessage } from "@/store/chat";
import { STORAGE_KEYS, CHAT_LIMITS } from "@/constants/storage";
import { computePeaksQuick } from "@/services/peaksService";
import {
  putBlob,
  getBlob,
  clearBlobs,
  deleteBlobs,
} from "@/services/idbService";

interface PersistedMessageV2 {
  id: string;
  sender: string;
  createdAt: number;
  duration: number;
  mime: string;
  b64?: string;
}

interface PersistedMessageV3 extends PersistedMessageV2 {
  /** Precomputed normalized peaks (0..1) */
  peaks?: number[];
}

interface PersistedMessageV4 extends PersistedMessageV3 {
  /** Targeted recipients (presence ids) */
  recipients?: string[] | null;
  senderId?: string;
  convId?: string;
}
interface PersistedMessageV5 extends PersistedMessageV4 {
  listenedBy?: string[];
}

function isClient() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export async function load(): Promise<VoiceMessage[]> {
  if (!isClient()) return [];
  const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
  if (!raw) return [];
  let parsed: (
    | PersistedMessageV2
    | PersistedMessageV3
    | PersistedMessageV4
    | PersistedMessageV5
  )[] = [];
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed) || !parsed.length) return [];
  const out: VoiceMessage[] = [];
  let mutated = false; // if we add peaks migration, re-save
  for (const p of parsed) {
    if (!p) continue;
    try {
      // Intentar recuperar blob desde IndexedDB si existe (migración v5)
      let blob = await getBlob(p.id);
      if (!blob) {
        if (p.b64) {
          blob = b64ToBlob(p.b64, (p as any).mime || "audio/webm");
          try {
            await putBlob(p.id, blob);
          } catch {}
        } else {
          // No blob in IDB and no base64 fallback; skip
          continue;
        }
      }
      let peaks: number[] | undefined = (p as PersistedMessageV3).peaks;
      if (!peaks) {
        // migrate: compute peaks
        try {
          peaks = await computePeaksQuick(blob);
          (p as PersistedMessageV3).peaks = peaks;
          mutated = true;
        } catch {}
      }
      const v4 = p as PersistedMessageV4;
      const v5 = p as PersistedMessageV5;
      out.push({
        id: p.id,
        sender: p.sender,
        senderId: (p as any).senderId,
        createdAt: p.createdAt,
        blob,
        url: URL.createObjectURL(blob),
        duration: p.duration,
        peaks,
        recipients: v4.recipients || null,
        convId: (p as any).convId,
        listenedBy: v5.listenedBy || [],
      });
    } catch {
      /* skip corrupt item */
    }
  }
  if (mutated) {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(parsed));
    } catch {}
  }
  return out;
}

export async function append(message: VoiceMessage) {
  if (!isClient()) return;
  let existing: (
    | PersistedMessageV5
    | PersistedMessageV4
    | PersistedMessageV3
    | PersistedMessageV2
  )[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (raw) existing = JSON.parse(raw) || [];
  } catch {
    existing = [];
  }
  if (existing.length >= CHAT_LIMITS.MAX_MESSAGES) {
    const remove = existing.length - CHAT_LIMITS.MAX_MESSAGES + 1;
    if (remove > 0) {
      existing.splice(0, remove);
    }
  }
  // Guardar blob en IndexedDB y no depender de base64 (pero mantenemos base64 mínima para fallback)
  try {
    await putBlob(message.id, message.blob);
  } catch {}
  // Eliminamos base64 para versión limpia
  // ensure peaks present
  let peaks = message.peaks;
  if (!peaks) {
    try {
      peaks = await computePeaksQuick(message.blob);
    } catch {
      peaks = undefined;
    }
  }
  existing.push({
    id: message.id,
    sender: message.sender,
    senderId: message.senderId,
    createdAt: message.createdAt,
    duration: message.duration,
    mime: message.blob.type,
    peaks,
    recipients: message.recipients || null,
    convId: message.convId,
    listenedBy: message.listenedBy || [],
  } as PersistedMessageV5);
  try {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(existing));
  } catch {}
}

export function clearAll() {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  void clearBlobs();
}

export async function deleteConversation(convId: string) {
  if (!isClient()) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    const removedIds: string[] = [];
    const filtered = arr.filter((m: any) => {
      const isTarget =
        m &&
        (m.convId === convId ||
          (convId === "__all__" && (m.convId === "__all__" || !m.convId)));
      if (isTarget) removedIds.push(m.id);
      return !isTarget;
    });
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(filtered));
    if (removedIds.length) void deleteBlobs(removedIds);
  } catch {}
}

export async function purgeLegacyBase64() {
  if (!isClient()) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    let changed = false;
    for (const m of arr) {
      if (m && typeof m === "object" && "b64" in m && m.b64) {
        delete m.b64;
        changed = true;
      }
    }
    if (changed)
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(arr));
  } catch {}
}

function b64ToBlob(b64: string, mime = "audio/webm"): Blob {
  const bin = atob(b64);
  const len = bin.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export const messageRepository = {
  load,
  append,
  clearAll,
  purgeLegacyBase64,
  deleteConversation,
};
