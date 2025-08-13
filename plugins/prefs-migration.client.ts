import { defineNuxtPlugin } from "#app";
import { useUiStore } from "@/store/ui";

const PREF_SCHEMA_VERSION = 1;
const VERSION_KEY = "pref.schema.version";

function migrateToV1(ui: ReturnType<typeof useUiStore>) {
  ui.migratePrefs();
}

export default defineNuxtPlugin(() => {
  if (!process.client) return;
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    const current = stored ? parseInt(stored, 10) : 0;
    const ui = useUiStore();
    if (current < 1) {
      migrateToV1(ui);
    }
    if (current !== PREF_SCHEMA_VERSION) {
      localStorage.setItem(VERSION_KEY, String(PREF_SCHEMA_VERSION));
    }
  } catch {
  }
});
