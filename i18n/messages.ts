export const messages = {
  es: {
    "app.title": "MiniChat Voz",
    "login.subtitle": "Entra con un apodo para comenzar",
    "login.placeholder": "Ej: GustaDev",
    "login.helper": "Se mostrará a los demás usuarios en el chat.",
    "login.button": "Entrar",
    logout: "Salir",
    "no.user": "Sin usuario",
    "no.messages": "No hay mensajes aún",
    "wave.loading": "Cargando...",
    "wave.download": "Descargar",
    "recorder.start": "Grabar",
    "recorder.stop": "Detener",
    "recorder.error.silence": "Audio vacío o silencio",
    "recorder.error.mic": "No se pudo acceder al micrófono",
  },
  en: {
    "app.title": "MiniChat Voice",
    "login.subtitle": "Enter a nickname to start",
    "login.placeholder": "E.g. GustaDev",
    "login.helper": "It will be visible to other users.",
    "login.button": "Enter",
    logout: "Logout",
    "no.user": "No user",
    "no.messages": "No messages yet",
    "wave.loading": "Loading...",
    "wave.download": "Download",
    "recorder.start": "Record",
    "recorder.stop": "Stop",
    "recorder.error.silence": "Empty or silent audio",
    "recorder.error.mic": "Could not access microphone",
  },
} as const;

export type Locale = keyof typeof messages;
export type MessageKey = keyof typeof messages.en | keyof typeof messages.es;
