import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useThemeStore = defineStore("theme", () => {
  const mode = ref<"light" | "dark">("dark");
  const isLight = computed(() => mode.value === "light");
  function set(newMode: "light" | "dark") {
    mode.value = newMode;
  }
  function toggle() {
    mode.value = isLight.value ? "dark" : "light";
  }
  return { mode, isLight, set, toggle };
});
