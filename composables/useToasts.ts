import { ref } from "vue";

export interface Toast {
  id: number;
  message: string;
  ttl: number;
  type?: "info" | "success" | "error";
  count?: number;
  _timer?: any;
}
const toasts = ref<Toast[]>([]);
const MAX_TOASTS = 5;
let counter = 0;

export function pushToast(
  message: string,
  opts: { ttl?: number; type?: Toast["type"]; dedupe?: boolean } = {},
) {
  const ttl = opts.ttl ?? 3000;
  if (opts.dedupe !== false) {
    const existing = toasts.value.find((t) => t.message === message);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      // Reset its timer properly
      if (existing._timer) clearTimeout(existing._timer);
      existing._timer = setTimeout(() => dismissToast(existing.id), ttl);
      return existing.id;
    }
  }
  if (toasts.value.length >= MAX_TOASTS) {
    // remove oldest
    toasts.value.shift();
  }
  const id = ++counter;
  const toast: Toast = { id, message, ttl, type: opts.type };
  toasts.value.push(toast);
  toast._timer = setTimeout(() => dismissToast(id), ttl);
  return id;
}
export function dismissToast(id: number) {
  const i = toasts.value.findIndex((t) => t.id === id);
  if (i >= 0) toasts.value.splice(i, 1);
}
export function clearAllToasts() {
  toasts.value.forEach((t) => t._timer && clearTimeout(t._timer));
  toasts.value = [];
}
export function useToasts() {
  return { toasts, pushToast, dismissToast, clearAllToasts };
}
