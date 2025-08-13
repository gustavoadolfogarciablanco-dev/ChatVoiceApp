
export const UI_ICONS = {
  themeLight: "mdi-weather-night",
  themeDark: "mdi-white-balance-sunny",
  download: "mdi-download",
  play: "mdi-play",
  pause: "mdi-pause",
} as const;

export type UiIconKey = keyof typeof UI_ICONS;
