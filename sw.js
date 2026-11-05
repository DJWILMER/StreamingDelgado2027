/* ============================================================
   DJ WILMER · Service Worker
   Cachea el app shell para que la interfaz abra sin conexión.
   El audio y los metadatos viajan por red (no se cachean).
   ============================================================ */

const CACHE_VERSION = 'dj-wilmer-v3';
const CACHE_NAME = `dj-wilmer-shell-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './css/fonts.css',
  './css/styles.css',
  './js/config.js',
  './js/app.js',
  './libs/qrcode.min.js',
  './assets/fonts/inter-var.woff2',
  './assets/fonts/montserrat-var.woff2',
  './assets/img/logo-1024.png',
  './assets/img/fondo.webp',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('dj-wilmer-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }

  // Solo se gestionan recursos del propio origen. Audio, HLS,
  // metadatos y CDNs externos pasan directamente a la red.
  if (url.origin !== self.location.origin) return;

  // Navegación: red primero, app shell como respaldo offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
            return response;
          }

          // Un error HTTP (5xx/502 de un proxy, por ejemplo) tampoco
          // debe dejar al usuario sin interfaz: se usa el shell cacheado.
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('./index.html')) ||
            (await cache.match('./')) ||
            response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('./index.html')) ||
            (await cache.match('./')) ||
            new Response('<h1>DJ WILMER</h1><p>Sin conexión.</p>', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        })
    );
    return;
  }

  // Estáticos: cache primero con actualización en segundo plano.
  // La red se inicia de inmediato y waitUntil se registra de forma
  // síncrona para que el navegador no detenga el SW antes de cachear.
  const network = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        return caches.open(CACHE_NAME)
          .then((cache) => cache.put(request, response.clone()))
          .then(() => response);
      }
      return response;
    })
    .catch(() => null);

  event.waitUntil(network);

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;

      const response = await network;
      if (response) return response;

      return new Response('Recurso no disponible sin conexión.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })
  );
});

// Permite que la app active de inmediato una versión nueva del SW.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
