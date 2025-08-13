// Centralized client theme plugin using themeService helpers
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { defineNuxtPlugin } from "#app";
import { ref, type Ref } from "vue";
import {
  resolveInitial,
  applyAll,
  toggleMode,
  type ThemeMode,
} from "@/services/themeService";

export default defineNuxtPlugin((nuxtApp: any) => {
  const mode: Ref<ThemeMode> = ref(resolveInitial(true));
  applyAll(mode.value, nuxtApp);

  function toggle() {
    mode.value = toggleMode(mode.value);
    applyAll(mode.value, nuxtApp);
  }

  nuxtApp.provide("uiTheme", mode);
  nuxtApp.provide("toggleTheme", toggle);
});
