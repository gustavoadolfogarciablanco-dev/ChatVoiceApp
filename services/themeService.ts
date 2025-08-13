// Centralized theme service: single source of truth for mode detection, persistence, and DOM sync.
// Responsibilities:
// - Resolve initial mode (cookie -> localStorage -> system preference -> default)
// - Apply mode (html class, localStorage, cookie, Vuetify global theme)
// - Toggle mode
// - Expose composable-friendly helpers

export type ThemeMode = "light" | "dark";
const COOKIE_KEY = "ui-theme";
const LS_KEY = "ui-theme";

export function readCookie(raw?: string): ThemeMode | null {
  try {
    const source =
      raw || (typeof document !== "undefined" ? document.cookie : "");
    const m = /(?:^|;\s*)ui-theme=(light|dark)\b/.exec(source);
    return m ? (m[1] as ThemeMode) : null;
  } catch {
    return null;
  }
}

export function systemPrefersLight(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  } catch {
    return false;
  }
}

export function resolveInitial(
  client: boolean,
  cookieHeader?: string,
): ThemeMode {
  // Priority: cookie -> (client) localStorage -> (client) system -> default 'dark'
  const cookieVal = readCookie(client ? undefined : cookieHeader);
  if (cookieVal) return cookieVal;
  if (client) {
    try {
      const ls = localStorage.getItem(LS_KEY);
      if (ls === "light" || ls === "dark") return ls;
    } catch {}
    if (systemPrefersLight()) return "light";
  }
  return "dark";
}

export function persist(mode: ThemeMode) {
  try {
    localStorage.setItem(LS_KEY, mode);
  } catch {}
  try {
    document.cookie = `${COOKIE_KEY}=${mode}; Path=/; SameSite=Lax`;
  } catch {}
}

export function applyDom(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", mode === "light");
}

export function applyAll(mode: ThemeMode, nuxtApp?: any) {
  applyDom(mode);
  persist(mode);
  // Sync Vuetify if present
  try {
    const framework = nuxtApp?.vueApp?.$vuetify;
    if (framework?.theme?.global?.name)
      framework.theme.global.name.value = mode;
  } catch {}
  // Dispatch global event for listeners (e.g., waveform colors, analytics)
  try {
    window.dispatchEvent(
      new CustomEvent("theme-changed", { detail: { mode } }),
    );
  } catch {}
}

export function toggleMode(current: ThemeMode): ThemeMode {
  return current === "light" ? "dark" : "light";
}

export const themeService = {
  current(): ThemeMode {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("light")
        ? "light"
        : "dark";
    }
    return "dark";
  },
  toggle(nuxtApp?: any) {
    const next = toggleMode(this.current());
    applyAll(next, nuxtApp);
    return next;
  },
  toggleMode() {
    return this.toggle();
  },
};
