import { defineNuxtConfig } from "nuxt/config";
import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";

export default defineNuxtConfig({
  devtools: { enabled: true },
  app: {
    head: {
      script: [
        {
          innerHTML: `(()=>{try{var c=document.cookie.match(/(?:^|;\\s*)ui-theme=(light|dark)\\b/);var m=c?c[1]:localStorage.getItem('ui-theme');if(m!=='light'&&m!=='dark'){m=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}if(m==='light')document.documentElement.classList.add('light');}catch(e){}})();`,
          tagPosition: "head",
        },
      ],
    },
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  css: ["~/assets/css/main.css"],
  modules: [
    "@pinia/nuxt",
    (_options, nuxt) => {
      nuxt.hooks.hook("vite:extendConfig", (config) => {
        (config.plugins ||= []).push(vuetify({ autoImport: true }));
      });
    },
  ],
  vite: {
    vue: { template: { transformAssetUrls } },
    ssr: { noExternal: ["vuetify"] },
  },
  build: { transpile: ["vuetify"] },
});
