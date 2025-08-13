import { getLocale, t } from "./i18nService";

const dayCache = new Map<string, string>();

export function formatDateDay(ts: number): string {
  const locale = getLocale();
  const d = new Date(ts);
  const today = new Date();
  const dayKey = d.toISOString().slice(0, 10);
  const cacheKey = locale + ":" + dayKey;
  const cached = dayCache.get(cacheKey);
  if (cached) return cached;
  const todayKey = today.toISOString().slice(0, 10);
  const ytdKey = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let label: string;
  if (dayKey === todayKey) label = t("date.today");
  else if (dayKey === ytdKey) label = t("date.yesterday");
  else
    label = d.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: today.getFullYear() === d.getFullYear() ? undefined : "numeric",
    });
  dayCache.set(cacheKey, label);
  return label;
}

export function formatTimeHM(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(getLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatExact(ts: number): string {
  return new Date(ts).toLocaleString(getLocale(), { hour12: false });
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return sec + "s";
  const min = Math.floor(sec / 60);
  if (min < 60) return min + "m";
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + "h";
  const day = Math.floor(hr / 24);
  return day + "d";
}
