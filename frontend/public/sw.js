/* Service Worker de MultiCatálogo (PWA) — sin dependencias.
 *
 * Estrategias:
 *  - Navegación (HTML)        → red primero; si falla, shell cacheado (/index.html) y, al final, /offline.html
 *  - /assets/* (JS/CSS hash)  → cache primero (son inmutables por el hash del build)
 *  - Imágenes (incl. CDN)     → cache primero con tope de entradas
 *  - GET /api/productos[/:id] → red primero con respaldo en caché (único dato de API que se guarda: es público)
 *  - Todo lo demás (login, registro, pedidos, comisiones, admin…) → SIEMPRE red, nunca se cachea.
 *
 * Para publicar una versión nueva basta con que este archivo cambie (sube VERSION).
 */
const VERSION = "v1";
const SHELL_CACHE = `mc-shell-${VERSION}`;
const ASSETS_CACHE = `mc-assets-${VERSION}`;
const IMG_CACHE = `mc-img-${VERSION}`;
const API_CACHE = `mc-api-${VERSION}`;
const ALL_CACHES = [SHELL_CACHE, ASSETS_CACHE, IMG_CACHE, API_CACHE];

const MAX_IMAGES = 80;
const MAX_API = 40;

const SHELL_FILES = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  // Sin skipWaiting automático: la app avisa "Hay una actualización" y el usuario decide.
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll es atómico; con Promise.allSettled un archivo faltante no rompe la instalación.
      Promise.allSettled(SHELL_FILES.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("mc-") && !ALL_CACHES.includes(k)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Mantiene como máximo `max` entradas (borra las más antiguas).
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
  }
}

async function networkFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      cache.put(request, res.clone()).then(() => (max ? trim(cacheName, max) : undefined));
    }
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  // ok (200) o respuesta opaca de imágenes cross-origin (status 0)
  if (res && (res.ok || res.type === "opaque")) {
    cache.put(request, res.clone()).then(() => (max ? trim(cacheName, max) : undefined));
  }
  return res;
}

async function navegacion(request) {
  try {
    const res = await fetch(request);
    // Guardamos el shell actualizado para poder abrir la SPA sin red.
    if (res && res.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put("/index.html", res.clone());
    }
    return res;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (
      (await cache.match("/index.html")) ||
      (await cache.match("/")) ||
      (await cache.match("/offline.html")) ||
      Response.error()
    );
  }
}

// ¿Es un GET público de productos? (/api/productos o /api/productos/:id numérico)
function esApiProductosPublica(url) {
  return url.pathname === "/api/productos" || /^\/api\/productos\/\d+$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // login, registro, checkout, PATCH…: siempre red

  const url = new URL(request.url);

  // 1) Navegación de la SPA (mismo origen, no API)
  if (request.mode === "navigate") {
    if (url.origin === self.location.origin && !url.pathname.startsWith("/api/")) {
      event.respondWith(navegacion(request));
    }
    return;
  }

  // 2) API: el backend vive en otro origen/puerto (…:3000); se identifica por la ruta /api/
  if (url.pathname.startsWith("/api/")) {
    if (esApiProductosPublica(url) && !request.headers.has("Authorization")) {
      event.respondWith(networkFirst(request, API_CACHE, MAX_API));
    }
    return; // el resto de la API nunca se cachea
  }

  // 3) Assets del build con hash (mismo origen)
  if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  // 4) Iconos y archivos estáticos del shell (mismo origen)
  if (url.origin === self.location.origin && SHELL_FILES.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // 5) Imágenes (picsum / CDN)
  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMG_CACHE, MAX_IMAGES));
  }
});
