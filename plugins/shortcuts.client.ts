import { defineNuxtPlugin } from "#app";
import { useI18n, t } from "@/i18n/i18nService";
import { themeService } from "@/services/themeService";
import { pushToast } from "@/composables/useToasts";

export default defineNuxtPlugin(() => {
  if (!process.client) return;
  const { locale, setLocale } = useI18n();

  function isTypingTarget(el: EventTarget | null) {
    if (!(el instanceof HTMLElement)) return false;
    const tag = el.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || el.isContentEditable;
  }

  async function handle(e: KeyboardEvent) {
    if (isTypingTarget(e.target)) return;
    if (e.ctrlKey && e.altKey && (e.key === "l" || e.key === "L")) {
      e.preventDefault();
      const next = (e.shiftKey ? "en" : locale.value === "es" ? "en" : "es") as
        | "es"
        | "en";
      await setLocale(next);
      announce(
        next === "es" ? t("announce.language.es") : t("announce.language.en"),
      );
      pushToast(
        next === "es" ? t("toast.language.es") : t("toast.language.en"),
      );
    }
    if (e.ctrlKey && e.altKey && (e.key === "t" || e.key === "T")) {
      e.preventDefault();
      const next = themeService.toggleMode();
      announce(t("announce.theme"));
      pushToast(
        next === "light" ? t("toast.theme.light") : t("toast.theme.dark"),
      );
    }
  }

  let live: HTMLElement | null = null;
  function ensureLive() {
    if (live) return live;
    live = document.createElement("div");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    live.style.position = "absolute";
    live.style.width = "1px";
    live.style.height = "1px";
    live.style.overflow = "hidden";
    live.style.clip = "rect(0 0 0 0)";
    live.style.clipPath = "inset(50%)";
    document.body.appendChild(live);
    return live;
  }
  let announceTimer: any;
  function announce(msg: string) {
    const node = ensureLive();
    if (announceTimer) clearTimeout(announceTimer);
    node.textContent = "";
    requestAnimationFrame(() => {
      node!.textContent = msg;
    });
    announceTimer = setTimeout(() => {
      if (node) node.textContent = "";
    }, 3000);
  }

  window.addEventListener("keydown", handle);
  return {
    provide: { shortcuts: {} },
  };
});
