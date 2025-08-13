// Icon font (instalado via @mdi/font)
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import { createVuetify } from "vuetify";
import { defineNuxtPlugin } from "nuxt/app";
import { resolveInitial } from "@/services/themeService";
// (No custom theme toggle here; separate theme plugin will manage html class)
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

export default defineNuxtPlugin((nuxtApp: any) => {
  const cookieHeader = process.server
    ? (nuxtApp?.ssrContext?.event?.node?.req?.headers?.cookie as
        | string
        | undefined)
    : undefined;
  const initial: "dark" | "light" = resolveInitial(
    !!process.client,
    cookieHeader,
  );
  if (process.client) {
    try {
      document.documentElement.classList.toggle("light", initial === "light");
    } catch {}
  }
  const vuetify = createVuetify({
    components,
    directives,
    defaults: {
      VBtn: { rounded: "lg", color: "primary", variant: "flat" },
    },
    theme: {
      defaultTheme: initial,
      themes: {
        dark: {
          dark: true,
          colors: {
            primary: "#6366F1",
            secondary: "#64748B",
            accent: "#F59E0B",
            success: "#10B981",
            warning: "#FBBF24",
            error: "#EF4444",
            info: "#3B82F6",
            background: "#121214",
            surface: "#18181b",
          },
        },
        light: {
          dark: false,
          colors: {
            primary: "#4F46E5",
            secondary: "#475569",
            accent: "#D97706",
            success: "#059669",
            warning: "#D97706",
            error: "#DC2626",
            info: "#2563EB",
            background: "#f4f6f8",
            surface: "#ffffff",
          },
        },
      },
    },
    // deshabilitar efectos pesados en tests / SSR si se requiere
    // ssr: true  // (Vuetify ya soporta SSR; habilitar si se necesita config extra)
  });
  nuxtApp.vueApp.use(vuetify);

  // The separate theme.client.ts plugin will handle runtime toggling.
});
