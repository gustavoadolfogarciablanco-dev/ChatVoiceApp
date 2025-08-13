import { defineNuxtPlugin } from "#app";
import { useState } from "#imports";
import { setLocale, getLocale, t } from "@/i18n/i18nService";

export default defineNuxtPlugin(() => {
  if (process.client) {
    const saved = localStorage.getItem("app.locale");
    if (saved) setLocale(saved as any);
  }
  const localeState = useState("locale", () => getLocale());
  async function change(l: any) {
    await setLocale(l);
    localeState.value = l;
    if (process.client) localStorage.setItem("app.locale", l);
  }
  return {
    provide: {
      i18n: { t, setLocale: change },
    },
  };
});
