import { reactive, computed } from "vue";

export type Locale = "es" | "en";
export type MessageKey =
  | "app.title"
  | "login.subtitle"
  | "login.placeholder"
  | "login.helper"
  | "login.button"
  | "logout"
  | "close"
  | "login.suggestion"
  | "login.suggestion.another"
  | "no.user"
  | "no.messages"
  | "wave.loading"
  | "wave.download"
  | "recorder.start"
  | "recorder.stop"
  | "recorder.error.silence"
  | "recorder.error.mic"
  | "recorder.error.invalidAudio"
  | "toast.language.es"
  | "toast.language.en"
  | "toast.theme.light"
  | "toast.theme.dark"
  | "announce.language.es"
  | "announce.language.en"
  | "announce.theme"
  | "recorder.pause"
  | "recorder.resume"
  | "recorder.cancel"
  | "recorder.send"
  | "recorder.live.wave"
  | "recorder.auto.send"
  | "recorder.file.size"
  | "recorder.peak"
  | "recorder.silence"
  | "recorder.paused"
  | "toast.autosend.sent"
  | "toast.autosend.disabled"
  | "toast.autosend.enabled"
  | "toast.voice.sent"
  | "recipients.users"
  | "recipients.none"
  | "recipients.selected"
  | "recipients.select.all"
  | "recipients.clear"
  | "recipients.self"
  | "message.recipients.to"
  | "message.recipients.all"
  | "status.online"
  | "status.offline"
  | "error.recipients"
  | "sidebar.chats"
  | "sidebar.all"
  | "date.today"
  | "date.yesterday"
  | "activity.recording"
  | "activity.listening"
  | "activity.downloaded"
  | "message.status.pending"
  | "message.status.sending"
  | "message.status.sent"
  | "message.status.failed"
  | "message.status.listened"
  | "message.retry"
  | "settings.normalize"
  | "settings.normalize.on"
  | "settings.normalize.off"
  | "recorder.limit"
  | "recorder.rerecord"
  | "tooltip.listened.missing"
  | "tooltip.listened.complete"
  | "tooltip.listened.partial"
  | "tooltip.listened.partial.singular"
  | "tooltip.listened.partial.plural"
  | "metrics.normalize.time"
  | "metrics.file.size"
  | "notify.new.message"
  | "settings.notifications"
  | "settings.notifications.on"
  | "settings.notifications.off"
  | "settings.delete.conversation"
  | "settings.delete.all"
  | "settings.delete.confirm.one"
  | "settings.delete.confirm.all"
  | "settings.delete.done.one"
  | "settings.delete.done.all"
  | "error.nickname.taken"
  | "nickname.conflict.title"
  | "nickname.conflict.message"
  | "nickname.conflict.placeholder"
  | "nickname.conflict.action"
  | "nickname.conflict.cancel"
  | "nickname.conflict.suggest"
  | "settings.privacy.hideMissing"
  | "settings.privacy.hideMissing.on"
  | "settings.privacy.hideMissing.off"
  | "tooltip.listened.missing.singular"
  | "menu"
  | "playback.rate"
  | "language"
  | "theme"
  | "theme.light"
  | "theme.dark"
  | "sheet.expand"
  | "sheet.collapse"
  | "settings.drag.threshold"
  | "status"
  | "voice.me"
  | "voice.listening"
  | "voice.play"
  | "voice.pause"
  | "voice.pausing"
  | "voice.ready"
  | "waveform.waveform"
  | "waveform.bars"
  | "waveform.spectrogram"
  | "waveform.type"
  | "waveform.nodata";

interface I18nState {
  locale: Locale;
  dict: Record<string, string>;
  loaded: Set<Locale>;
  store: Record<Locale, Record<string, string>>;
}
const state = reactive<I18nState>({
  locale: "es",
  dict: {},
  loaded: new Set(),
  store: { es: {}, en: {} },
});

async function loadLocale(l: Locale) {
  if (state.loaded.has(l)) return;
  let mod: any;
  if (l === "es") mod = await import("./locales/es");
  else if (l === "en") mod = await import("./locales/en");
  state.store[l] = mod.default;
  state.loaded.add(l);
}

export async function setLocale(l: Locale) {
  await loadLocale(l);
  state.locale = l;
  state.dict = state.store[l];
}
export function getLocale() {
  return state.locale;
}

export function t(key: MessageKey): string {
  const val = state.dict[key];
  return val || key;
}

void (async () => {
  await setLocale("es");
})();

export function useI18n() {
  return { locale: computed(() => state.locale), setLocale, t };
}
