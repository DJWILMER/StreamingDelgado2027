# DJ WILMER · Radio Online PWA

Reproductor de radio en vivo instalable (PWA) para móvil y PC, con el diseño del reproductor **Cuarzo** (template 11): degradado naranja/rojo curvo, vinilo giratorio, menú de programación, compartir, redes sociales, QR e instalación.

## Características

- ▶️ Reproducción en vivo con `audio` nativo y respaldo HLS.
- 🎵 Metadatos del tema actual (si el endpoint lo permite).
- 📅 Programación semanal por día, con programa "En el Aire" resaltado.
- 🔗 Menú para compartir por WhatsApp y Facebook.
- 📱 Instalación como PWA en Android/Chrome, escritorio e iOS (instrucciones de Safari).
- 📴 App shell cacheado por Service Worker: la interfaz abre sin conexión (el audio requiere internet).
- 🌐 QR generado localmente con la URL publicada.
- 🔤 Fuentes Montserrat/Inter alojadas localmente (sin depender de Google Fonts).
- 🎨 Colores e identidad configurables desde un solo archivo.

## Estructura

```
DJ-WILMER/
├─ index.html
├─ manifest.webmanifest
├─ sw.js
├─ favicon.svg
├─ server.ps1
├─ css/
│  ├─ fonts.css
│  └─ styles.css
├─ js/
│  ├─ config.js          ← edita aquí tu emisora
│  └─ app.js
├─ libs/
│  └─ qrcode.min.js
├─ assets/
│  ├─ fonts/
│  └─ img/
│     ├─ logo-1024.png
│     └─ fondo.webp
├─ icons/
│  ├─ icon-192.png
│  ├─ icon-512.png
│  ├─ maskable-512.png
│  └─ apple-touch-icon.png
└─ tools/
   └─ generate-icons.ps1
```

## Probar en local

La PWA **debe** abrirse desde `http://` o `https://`. Con `file://` el Service Worker y la instalación quedan desactivados (la app avisa y oculta esos botones).

```powershell
cd DJ-WILMER
powershell -ExecutionPolicy Bypass -File server.ps1
```

Luego abre <http://localhost:8080/>.

Para usar otro puerto:

```powershell
powershell -ExecutionPolicy Bypass -File server.ps1 -Port 5500
```

> También puedes usar cualquier servidor estático (Live Server de VS Code, `npx serve`, IIS, Nginx, etc.).

## Configuración

Todo se edita en `js/config.js`:

| Campo | Descripción |
| --- | --- |
| `station.name` | Nombre visible de la emisora. |
| `station.slogan` | Eslogan bajo el nombre. |
| `station.description` | Descripción para metadatos. |
| `station.logo` | Ruta del logo principal. |
| `station.background` | Imagen de fondo de la consola. |
| `station.primary_color` | Color principal (genera automáticamente el degradado). |
| `station.audio_streaming_url` | Stream principal (MP3/AAC). |
| `station.audio_hls_url` | Alternativa HLS (`.m3u8`). |
| `station.radio_url_api` | Endpoint opcional del tema actual. |
| `station.social_*` | Enlaces de redes. Vacío (`''`) oculta el icono. |
| `station.chat` / `chat_url` | Chat opcional. |
| `schedules[]` | Programación semanal. |

### Programación

```js
{
  day_of_week: 'friday',        // monday ... sunday
  start_time: '18:00',          // formato 24 h
  end_time: '21:00',
  program_name: 'La Hora del Mix',
  description: 'Los mejores mixes.',
  announcer_name: 'DJ Wilmer',
  announcer_photo_url: ''       // opcional
}
```

Los enlaces sociales y la programación actuales son **datos de ejemplo**: reemplázalos por los oficiales de DJ WILMER.

## Instalar como app

### Android / Chrome / Edge en PC

1. Abre la URL publicada (HTTPS o localhost).
2. Pulsa **Instalar App** en el reproductor, o el icono de instalar de la barra de direcciones.
3. Acepta el diálogo del navegador.

### iPhone / iPad (Safari)

1. Abre la URL en Safari.
2. Toca **Compartir** → **Agregar a inicio**.
3. Confirma con **Agregar**.

La app detecta iOS y muestra estas instrucciones desde el botón **Instalar App**.

## Publicar

Sube **todo el contenido de `DJ-WILMER/`** a un hosting con HTTPS. El `start_url` y el `scope` son relativos (`./`), por lo que funciona tanto en la raíz del dominio como en una subcarpeta.

Ejemplos:

- **Netlify / Vercel / Cloudflare Pages**: arrastra la carpeta o conecta el repositorio; no requiere build.
- **GitHub Pages**: sube los archivos a la rama de Pages.
- **Hosting tradicional**: copia por FTP a `public_html`.

> HTTPS es obligatorio para instalar la PWA en producción (localhost es la excepción).

## Regenerar logo e iconos

El logo y los iconos se generan con `System.Drawing` de Windows:

```powershell
powershell -ExecutionPolicy Bypass -File tools/generate-icons.ps1
```

Esto reescribe:

- `assets/img/logo-1024.png`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/maskable-512.png`
- `icons/apple-touch-icon.png`

Si cambias el logo a mano, conserva los tamaños indicados en `manifest.webmanifest`.

## Service Worker y caché

`sw.js` cachea el app shell con la versión `dj-wilmer-v3`:

- Navegación: red primero y `index.html` cacheado como respaldo.
- Recursos propios: caché primero con actualización en segundo plano.
- Audio, HLS, metadatos y CDNs externos: **no se cachean**.

**Importante:** cada vez que modifiques `index.html`, CSS, JS, imágenes o iconos, sube el número de versión en `sw.js`:

```js
const CACHE_VERSION = 'dj-wilmer-v4';
```

Así se elimina la caché anterior y los usuarios reciben los cambios. En local, si un cambio no aparece, recarga con `Ctrl + Shift + R` o usa *Application → Service Workers → Update* en DevTools.

## Notas técnicas

- **HLS.js** se carga desde CDN (`cdn.jsdelivr.net`) solo si el navegador no reproduce HLS de forma nativa. Requiere internet.
- Los metadatos pueden fallar por CORS según el proveedor; la app intenta el endpoint directo y dos proxies públicos, y simplemente oculta el tema si no hay respuesta.
- El QR se genera en el navegador; no envía datos a terceros.
- `theme-color`, manifest y splash usan `#FF4500` / `#0d0606`; si cambias `primary_color`, actualiza también esos valores para mantener coherencia.

## Créditos

Diseño inspirado en el reproductor **Cuarzo** (template 11) de MiRadio. Rebranding, lógica PWA y recursos de DJ WILMER adaptados para este proyecto.
