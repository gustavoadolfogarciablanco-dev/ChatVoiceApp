import { inject, ref, watch, onMounted } from "vue";

export function useThemeToggle() {
  const uiTheme = inject<any>("uiTheme", null);
  const providedToggle = inject<() => void>("toggleTheme", () => {});
  const isLight = ref(false);

  function readDom(): "light" | "dark" {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.classList.contains("light")
      ? "light"
      : "dark";
  }

  function applyDom(mode: "light" | "dark") {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("light", mode === "light");
    try {
      localStorage.setItem("ui-theme", mode);
    } catch {}
  }

  function sync() {
    const current = uiTheme ? uiTheme.value : readDom();
    isLight.value = current === "light";
  }

  if (uiTheme) watch(uiTheme, () => sync(), { immediate: true });
  onMounted(() => sync());

  function toggle() {
    const before = uiTheme ? uiTheme.value : readDom();
    const next = before === "light" ? "dark" : "light";
    if (uiTheme) uiTheme.value = next;

    try {
      providedToggle();
    } catch {}

    applyDom(next);
    sync();
  }

  return { isLight, toggle };
}
