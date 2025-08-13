# Chat Voice App

## Tecnologías y Stack

El proyecto utiliza un stack moderno y profesional, optimizado para aplicaciones web escalables y de alto rendimiento. **Toda la gestión de dependencias y scripts se realiza con [pnpm](https://pnpm.io/)**:

- **Nuxt.js** v3.x (Framework Vue para SSR y SSG)
- **Vue.js** v3.x (UI reactiva y composición)
- **Pinia** v2.x (Gestión de estado global)
- **Vuetify** v3.x (Componentes UI Material Design)
- **Tailwind CSS** v3.x (Utilidades CSS y diseño responsivo)
- **TypeScript** v4.x (Tipado estricto y robusto)
- **Vite** v4.x (Bundler y servidor de desarrollo)
- **Jest** v29.x (Pruebas unitarias)
- **ESLint** v8.x (Linter y calidad de código)
- **Node.js** >=18.x (Entorno de ejecución)
- **pnpm** >=8.x (Gestor de paquetes recomendado)

> Las versiones pueden variar según el archivo `package.json` y la configuración del proyecto. Se recomienda revisar y mantener actualizadas las dependencias principales.

## Descripción General
Chat Voice App es una plataforma de mensajería de voz profesional, moderna y escalable, diseñada para equipos y comunidades que requieren comunicación eficiente y segura. Permite enviar, recibir y visualizar mensajes de voz con controles avanzados, internacionalización, y una experiencia de usuario optimizada para productividad y accesibilidad.

---

## Funcionalidades Principales
- Envío y recepción de mensajes de voz con visualización avanzada (ondas, barras, espectrograma).
- Selección de destinatarios, conversaciones privadas y grupales.
- Auto-envío de mensajes (BETA) y control de tiempo de grabación.
- Normalización y procesamiento de audio para calidad profesional.
- Internacionalización (i18n): permite cambiar el idioma de la interfaz entre español e inglés, con soporte para agregar más idiomas fácilmente.
- Cambio de tema (estilo): alterna entre modo claro y oscuro, con estilos modernos y personalizables desde el panel de configuración.
- Preferencias de usuario persistentes (tema, idioma, notificaciones, audio).
- Notificaciones locales y control de privacidad.
- Interfaz responsiva, accesible y optimizada para desktop y móvil.
- Historial virtualizado para alto rendimiento.
- Panel de configuración y personalización.
- Pruebas unitarias y cobertura de servicios clave.

---

## Atajos y Short Codes
- `Ctrl + Enter`: Enviar mensaje de voz.
- `R`: Iniciar grabación.
- `Esc`: Cancelar grabación o cerrar panel.
- `Tab`: Navegación rápida entre conversaciones.
- `Ctrl + /`: Abrir panel de ayuda.

---

## Patrones de Diseño y Arquitectura
- **Composition API**: Composables para lógica compartida y desacoplada.
- **Store Centralizada (Pinia)**: Estado global modular y reactivo.
- **Inyección de Dependencias**: Servicios desacoplados, testables y escalables.
- **Componentización**: UI dividida en componentes reutilizables y desacoplados.
- **Internacionalización (i18n)**: Servicio y locales extensibles.
- **Normalización de Audio**: Procesamiento off-thread y defensivo.
- **Virtualización**: Listas eficientes para historial y mensajes.
- **Persistencia Local**: Preferencias y datos clave en localStorage.
- **Testing**: Pruebas unitarias y mocks para servicios.

---

## Buenas Prácticas
- Separación estricta de lógica y presentación.
- Tipado estricto con TypeScript en todo el proyecto.
- Manejo robusto de errores y estados.
- Limpieza continua de imports, comentarios y código no usado.
- Accesibilidad (WAI-ARIA, navegación por teclado, contraste).
- Responsividad y mobile-first.
- Documentación y comentarios claros en servicios y componentes clave.
- Uso de hooks y composables para evitar duplicidad.
- Pruebas unitarias y cobertura en servicios críticos.

---

## Arquitectura y Anatomía del Proyecto
```
Code/
├── components/         # Componentes Vue reutilizables (UI, lógica, visualización)
├── pages/              # Páginas principales (chat, index)
├── store/              # Estado global (Pinia: usuario, chat, presencia, UI, tema)
├── services/           # Servicios de negocio, audio, realtime, utilidades
├── composables/        # Composables Vue para lógica compartida (hooks)
├── plugins/            # Plugins Nuxt y Vue (i18n, shortcuts, migraciones)
├── i18n/               # Internacionalización y locales
├── constants/          # Constantes globales y configuraciones
├── assets/             # Recursos estáticos (CSS, imágenes, fuentes)
├── types/              # Tipos TypeScript globales y externos
├── tests/              # Pruebas unitarias y mocks
├── nuxt.config.ts      # Configuración principal Nuxt
├── .gitignore          # Exclusiones de git
└── README.md           # Documentación principal
```

### Componentes Clave
- **Recorder.vue**: Grabación y envío de mensajes de voz.
- **VoiceMessage.vue**: Reproducción y visualización de audio.
- **VirtualMessageList.vue**: Renderizado eficiente de historial.
- **SettingsPanel.vue**: Preferencias y configuración de usuario.
- **UiTooltip.vue**: Tooltips accesibles y personalizables.

### Servicios y Composables
- **i18nService.ts**: Servicio de internacionalización.
- **audioNormalizationService.ts**: Procesamiento y normalización de audio.
- **useAudioRecorder.ts**: Hook para grabación y control de audio.
- **useWaveform.ts**: Hook para visualización de ondas.

---

## Alcance (Scope)
El proyecto está enfocado en la mensajería de voz profesional, con visualización avanzada, internacionalización, privacidad y una arquitectura escalable. No incluye chat de texto tradicional ni integración con redes sociales externas. El objetivo es proveer una base robusta para comunicación por voz en equipos y comunidades.

---

## Despliegue Local (Paso a Paso)

### Requisitos
- Node.js >= 18
- pnpm >=8.x

### Instalación
1. Clona el repositorio:
   ```sh
   git clone <url-del-repo>
   cd Code
   ```
2. Instala dependencias:
   ```sh
   pnpm install
   ```

### Ejecución en Desarrollo
```sh
pnpm dev
```
- Abre `http://localhost:3000` en tu navegador.

### Comandos Clave
- `pnpm dev`: Inicia el servidor de desarrollo con hot-reload.
- `pnpm dev:all`: Levanta frontend y backend en paralelo.
- `pnpm build`: Compila el proyecto para producción.
- `pnpm lint`: Ejecuta el linter para verificar calidad de código.
- `pnpm test`: Ejecuta pruebas unitarias.
- `pnpm typecheck`: Verifica tipos TypeScript.

### Despliegue en Producción
1. Compila el proyecto:
   ```sh
   pnpm build
   ```
2. Inicia el servidor:
   ```sh
   pnpm start
   ```

---


## Explicación de Comandos

| Comando            | Descripción                                                                                   |
|--------------------|----------------------------------------------------------------------------------------------|
| `pnpm dev`         | Inicia el servidor de desarrollo del frontend con hot-reload y debugging.                     |
| `pnpm dev:all`     | Levanta ambos proyectos: frontend (Nuxt) y backend (realtime-server) en paralelo.             |
| `pnpm build`       | Compila y optimiza el proyecto para producción.                                               |
| `pnpm start`       | Inicia el servidor en modo producción usando los archivos generados por `build`.              |
| `pnpm lint`        | Ejecuta ESLint para verificar y corregir problemas de estilo y calidad de código.             |
| `pnpm test`        | Ejecuta pruebas unitarias y de integración (Jest).                                           |
| `pnpm typecheck`   | Verifica tipos y errores de TypeScript en todo el proyecto.                                   |
| `pnpm generate`    | (Opcional) Genera archivos estáticos si se usa SSG.                                          |
| `pnpm clean`       | (Opcional) Elimina archivos temporales y de build.                                           |
| `pnpm coverage`    | (Opcional) Genera reporte de cobertura de pruebas.                                           |

### Ejemplo de uso

```sh
pnpm dev         # Desarrollo local (solo frontend)
pnpm dev:all     # Desarrollo local: frontend y backend juntos
pnpm build       # Compilar para producción
pnpm start       # Servidor en producción
pnpm lint        # Linter de código
pnpm test        # Pruebas unitarias
pnpm typecheck   # Verificación de tipos
```

> Puedes consultar el archivo `package.json` para ver todos los scripts disponibles y personalizarlos según tus necesidades. Recuerda que **todas las operaciones se realizan con pnpm**.

---

## Contribución y Contacto
Para dudas, sugerencias o contribuciones, abre un issue o pull request en el repositorio. Se recomienda seguir el estándar de commits y abrir PRs bien documentados. Para soporte, contacta al mantenedor principal.

---

## Licencia
MIT
