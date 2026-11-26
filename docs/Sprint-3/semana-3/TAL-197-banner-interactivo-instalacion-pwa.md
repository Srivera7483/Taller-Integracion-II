# Seguimiento de Rama: TAL-197 - Banner Interactivo de Instalación PWA

## 1. Contexto y Alcance del Requerimiento

El objetivo de esta tarea consiste en guiar de forma clara y amigable al usuario institucional para instalar la Progressive Web App (PWA) de InfraManager en su dispositivo móvil o estación de trabajo de escritorio (laptop), garantizando una experiencia nativa sin barra de navegación del navegador y permitiendo el acceso rápido y trabajo sin conexión.

### Criterios de Aceptación Verificados
1. **Despliegue condicional estricto:** El componente únicamente se presenta cuando el cliente no está ejecutando la aplicación en modo `standalone` y el navegador soporta las capacidades nativas de instalación PWA (evento `beforeinstallprompt` o flujo adaptativo en iOS Safari).
2. **Persistencia de preferencia durante 7 días:** Si el usuario decide posponer la instalación seleccionando la opción *"Más tarde"* o cerrando el banner mediante el control *"X"*, la preferencia se persiste en el almacenamiento local (`localStorage`) mediante una marca temporal con vigencia exacta de 7 días naturales (604,800,000 milisegundos). Durante este periodo, no se vuelve a interrumpir al usuario con el aviso emergente, respetando su decisión de uso.
3. **Disparo del prompt nativo:** Al interactuar con el botón *"Instalar Ahora"*, se invoca directamente el método `prompt()` del evento nativo interceptado (`beforeinstallprompt`), permitiendo al sistema operativo desplegar el diálogo nativo de confirmación y gestionando la resolución posterior (`userChoice`).
4. **Desacoplamiento arquitectónico:** Aplicación del patrón de diseño *Container / Presentational Components* (Smart & Dumb Components), separando la lógica de ciclo de vida, persistencia y eventos en `PWAInstallPrompt.jsx`, de la presentación visual y accesibilidad en `PWAInstallBanner.jsx`.

---

## 2. Registro Continuo de Cambios por Archivo

### archivo modificado: `frontend-web/src/components/PWAInstallBanner.jsx`
- **Razón del cambio:** Creación del componente presentacional especializado para renderizar la interfaz de usuario del banner flotante de instalación PWA, separándolo por completo de la lógica de eventos y estado del navegador.
- **Detalle de lo realizado:**
  - Se estructuró un elemento accesible `<aside role="banner" aria-label="Sugerencia de instalación de la aplicación PWA">` con posicionamiento fijo flotante en la zona inferior (`fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96`), dotado de sombras, bordes institucionales y animaciones suaves de entrada.
  - Se incorporó la insignia visual con el isotipo de la aplicación (`/pwa-192x192.png`) y el texto descriptivo con los beneficios exactos requeridos: *"Acceso más rápido y trabajo sin conexión"*.
  - Se implementaron los botones de acción requeridos:
    - Botón primario *"Instalar Ahora"* con identificador `id="btn-pwa-install"` y callback `onInstall`, acompañado de su ícono representativo de descarga (`FiDownload`).
    - Botón secundario *"Más tarde"* con identificador `id="btn-pwa-dismiss"` y callback `onDismiss`.
    - Botón de cierre superior *"X"* accesible con `aria-label="Cerrar sugerencia de instalación"`.
  - Se mantuvo la compatibilidad adaptativa para navegadores iOS Safari donde el evento `beforeinstallprompt` no está estandarizado, desplegando un cuadro instructivo con el ícono de compartir (`FiShare`) que indica la secuencia: *Pulsa Compartir y luego "Agregar a la pantalla de inicio"*.

### archivo modificado: `frontend-web/src/components/PWAInstallPrompt.jsx`
- **Razón del cambio:** Refactorización integral del componente contenedor para asumir de forma exclusiva la orquestación del ciclo de vida, captura de eventos nativos, detección de plataforma y la regla de negocio de persistencia por 7 días en `localStorage`.
- **Detalle de lo realizado:**
  - Se implementó la constante de tiempo `DURACION_DESCARTE_MILISEGUNDOS = 7 * 24 * 60 * 60 * 1000` (7 días exactos) y la clave `CLAVE_EXPIRACION_BANNER = 'pwa_banner_dismissed_until'`.
  - Se construyó la función auxiliar `verificarDescarteVigente()` que evalúa si la marca temporal almacenada en `localStorage` aún está vigente en relación a `Date.now()`. En caso de haber vencido el plazo, se remueve automáticamente la clave para posibilitar una nueva recomendación de instalación.
  - Se mantuvieron los escuchadores de los eventos nativos `beforeinstallprompt` y `appinstalled`, además del disparador manual `pwa-install-trigger` (utilizado por el menú lateral en `Layout.jsx`).
  - Al presionar *"Más tarde"*, `handleDismiss` calcula el nuevo timestamp de expiración (`Date.now() + 7 días`) y lo guarda en `localStorage`.
  - Al completarse exitosamente la instalación (`appinstalled` o `choiceResult.outcome === 'accepted'`), se limpia la clave de descarte y se actualiza el estado `isInstalled` a `true`, ocultando permanentemente el banner.
  - Se delega la renderización visual al componente `<PWAInstallBanner />`, inyectándole los manejadores `onInstall`, `onDismiss` y la bandera `isIOS`.

### archivo modificado: `frontend-web/src/components/Layout.jsx`
- **Razón del cambio:** Ajuste de redacción en la etiqueta del botón de instalación manual dentro de la barra lateral para unificar el lenguaje institucional y simplificar la acción hacia el usuario final.
- **Detalle de lo realizado:** Se actualizó el texto del botón de `"Instalar App PWA"` a `"Instalar App"`, manteniendo intacta la emisión del evento personalizado `pwa-install-trigger` y los estilos de accesibilidad y diseño.

### archivo modificado: `frontend-web/src/pwa.test.mjs`
- **Razón del cambio:** Actualización de la suite de pruebas automatizadas de PWA para reflejar la separación arquitectónica y verificar la presencia de los nuevos textos, identificadores, persistencia en `localStorage` y criterios de aceptación definidos para TAL-197.
- **Detalle de lo realizado:**
  - Se adaptó la prueba de `PWAInstallPrompt` para verificar que capture `beforeinstallprompt`, `appinstalled`, verifique el modo `standalone`, soporte iOS, utilice `localStorage` para la persistencia e importe `PWAInstallBanner`.
  - Se agregó una prueba dedicada a `PWAInstallBanner` que valida la existencia del identificador `btn-pwa-install`, la inclusión del texto *"Acceso más rápido y trabajo sin conexión"*, los botones *"Instalar Ahora"* y *"Más tarde"*, y el atributo semántico `role="banner"`.

---

## 3. Verificación y Resultados de Pruebas

Se ejecutó la suite de pruebas unitarias y de integración de frontend con resultados 100% exitosos:
- `node --test src/pwa.test.mjs`: **9 pruebas aprobadas, 0 fallidas.**
- `pnpm.cmd lint` (`oxlint`): **0 errores.**
- `pnpm.cmd build` (`vite build`): **Compilación exitosa con generación de Service Worker (`dist/sw.js`).**
