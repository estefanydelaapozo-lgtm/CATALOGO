# REQUIREMENTS_CHECKLIST — MultiCatálogo

## Estado General
- **Hito actual:** Back-office MLM (Fases 0-7 de `PLAN_IMPLEMENTACION_U2.md`) **completo** + **HITO F (PWA)** implementado en código + paginación real en el front.
- **Última tarea completada (2026-10-22):** PWA con service worker propio (manifest, iconos, precache del shell, caché del catálogo público, página offline, banner de instalación, aviso de actualización, indicador sin conexión) y componente `Paginador` en `/admin/pedidos`, `/admin/productos` y `/mis-pedidos`. Verificado: `tsc -b` sin errores, ESLint 0 errores, lógica del SW probada con mocks.
- **Siguiente tarea pendiente:** pruebas manuales del alumno en navegador (`npm run build && npm run preview`, instalar, modo offline, Lighthouse) y `go run .` con Docker. Esas casillas siguen sin marcar a propósito.

> Fuente de estos requerimientos: guía Unidad 2 (Fase 1) + DRS Fase 1 + código existente. Los documentos `Guia_Practica_Tema5_leccion.md`, `Planificacion_Unidad1_Tema5.md` y `Silabo_Framework_Programacion_Web.md` no se encontraron en el proyecto; los ítems de Unidad 1 se dedujeron del código/README del frontend. Completar cuando se disponga de esos archivos.

---

## HITO A — Unidad 1 · Tema 5 (Frontend, ya finalizado)
### Frontend
- [x] React 19 + Vite + Tailwind + React Router 7 + TypeScript
- [x] Login con roles `admin` / `cliente` y redirección según rol
- [x] Rutas protegidas (`ProtectedRoute`) y exclusivas de admin (`AdminRoute`)
- [x] Catálogo con filtros por búsqueda y categoría
- [x] Detalle de producto con ruta dinámica `/producto/:id`, galería y lightbox
- [x] Carrito persistente por usuario (localStorage)
- [x] Checkout simulado con validación + pantalla de confirmación
- [x] Dashboard y Mi Red (árbol multinivel con comisiones 10 % / 5 % / 2 %) para admin
- [x] Consumo de API con promesas (`fetch`) en Login

---

## HITO B — Unidad 2 · Fase 1: Arquitectura y API robusta
### Backend
- [x] Arquitectura limpia: `routes` / `controllers` / `models` / `repository`
- [x] Datos estáticos movidos a `repository/repository.go`
- [x] `APIError {status, message, details}` en `models`
- [x] `ErrorHandler` global + `recover` (404/405/500 con el mismo JSON)
- [x] `/api/login`: valida email/password vacíos (400), formato de email (400), credenciales (401)
- [x] `GET /api/productos/:id`: id no numérico → 400; inexistente → 404
- [x] `GET /api/health` → 200 `{"status":"ok","message":"Servidor Go/Fiber operativo"}`
- [x] `GET /api/red` expuesto desde el backend
- [x] Tipado estricto en respuestas (`LoginResponse`, `Producto`, `Referido`)
- [x] Compilado y probado por el agente (build + `go vet`); falta ejecutarlo en la máquina del alumno
- [ ] Validación de entrada y errores estandarizados en `/api/red` (hoy solo GET sin parámetros)

### Frontend (solo lo necesario para ver el avance)
- [x] `Login.tsx` muestra `message` de la API (y mensaje si el servidor no responde)
- [x] `productosService.ts` consume la API real con `ApiError`
- [x] `DetalleProducto.tsx` muestra alerta 400/404 precisa
- [ ] `MiRed.tsx` consumir `/api/red` (opcional; hoy usa `data/red.ts`)

### Pruebas manuales de aceptación
- [ ] Login con credenciales erróneas → alerta "Credenciales incorrectas"
- [ ] Login con campos vacíos → alerta "Datos de inicio de sesión inválidos"
- [ ] `/producto/999` → "El producto con id 999 no existe"
- [ ] `/producto/abc` → mensaje de id inválido
- [ ] `GET /api/health` → JSON `ok`

---

## HITO C — Unidad 2 · Fase 2: Persistencia con PostgreSQL
### Backend
- [x] `docker-compose.yml` con PostgreSQL 16 (variables de entorno, volumen, healthcheck)
- [x] `config/db.go`: pool de conexiones (`database/sql` + `lib/pq`), reintentos, variables desde `.env`
- [x] `.env` / `.env.example` con credenciales de desarrollo
- [x] `database/init.sql`: tablas `usuarios`, `productos` (galeria `TEXT[]`), `referidos` (`parent_id` FK) + datos semilla idénticos
- [x] `repository.go` sin variables globales de datos; consultas parametrizadas (`$1`, `$2`)
- [x] `FindUsuario` con `SELECT ... WHERE email AND password` (a prueba de SQL injection)
- [x] `GetProductos` / `GetProductoByID` con `SELECT`
- [x] `GetRed` reconstruye el árbol desde la lista plana de `referidos`
- [x] Falla de BD → 500 estandarizado `APIError` (detalle real solo en el log del servidor)
- [x] Cierre del pool y apagado ordenado (Ctrl+C / SIGTERM)
- [x] Firmas de los controladores y JSON de respuesta sin cambios
- [ ] Ejecutar en la máquina del alumno con Docker real (el agente probó con PostgreSQL 16 local, no con Docker)
### Pruebas manuales de aceptación
- [ ] `docker compose up -d` y `go run .` arrancan sin error
- [ ] `UPDATE productos SET precio = 99.99 WHERE id = 1;` → recargar `/tienda` o `/catalogo` muestra el nuevo precio
- [ ] Login y `/producto/999` siguen mostrando las alertas de la Fase 1

---

## HITO D — Unidad 2 · Fase 3: Caché con Redis (Cache-Aside)
### Backend
- [x] `docker-compose.yml`: servicio `redis` (`redis:alpine`, puerto 6379, healthcheck, sin persistencia, `maxmemory` 128 mb LRU)
- [x] Servicio `backend` (perfil `full`, con `Dockerfile`) que depende de `db` y `redis` con `service_healthy`
- [x] `go-redis/v9` en `go.mod` (falta `go mod tidy` en la máquina del alumno para generar `go.sum`)
- [x] `config/redis.go`: `ConnectRedis` (`REDIS_URL` o `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`/`REDIS_DB`, timeouts cortos, reintentos al arrancar)
- [x] `repository/cache.go`: `cacheAside[T]` genérico + `GetProductosCached` + `GetRedCached`
- [x] `GET /api/productos` → clave `productos:all`, TTL 5 min
- [x] `GET /api/red[?email=]` → clave `red:tree:{email}` (sin email: `red:tree:global`), TTL 10 min; email inválido → 400
- [x] Cabecera `X-Cache: HIT|MISS` (campo adicional; el JSON no cambia)
- [x] Tolerancia a fallos: si Redis no está o se cae, la API responde desde PostgreSQL (pausa de 15 s al caché)
- [x] Cierre ordenado del cliente de Redis
- [x] Probado: MISS→HIT, TTL 300 s / 600 s, JSON idéntico, email inválido 400, Redis caído (en caliente y desde el arranque) y recuperación
- [x] Invalidación del caché al escribir (`DEL productos:all` tras cada escritura de productos y checkout; resuelto en Fase 2 del back-office)
- [ ] `GET /api/productos/:id` sin caché (no estaba en el alcance de la fase)
### Frontend
- [x] `MiRed.tsx` consume `GET /api/red?email=…` (con respaldo a `data/red.ts` si el servidor no responde)
### Pruebas manuales de aceptación
- [ ] `docker compose up -d` levanta `multicatalogo-db` y `multicatalogo-redis`
- [ ] `/mi-red` → Network → 1.ª carga de `/api/red` `X-Cache: MISS`; tras F5 `X-Cache: HIT` y tiempo mucho menor
- [ ] `docker exec multicatalogo-redis redis-cli KEYS "*"` muestra `productos:all` y `red:tree:<email>`
- [ ] ⚠ El `UPDATE productos SET precio = …` de la Fase 2 ahora tarda hasta 5 min en verse; para verlo ya: `docker exec multicatalogo-redis redis-cli DEL productos:all`

---

## HITO E — Unidad 2 · Fases siguientes (POR DEFINIR)
> Solo se conoce el objetivo general: alta transaccionalidad y rendimiento backend.
- [x] Autenticación real (JWT, `auth/jwt.go`, `middleware/auth.go`) y contraseñas con bcrypt (`003_seguridad.sql`)
- [x] Operaciones transaccionales (`CrearPedido`, cancelación con restitución de stock, liquidaciones con `FOR UPDATE`)

---

## HITO F — PWA (Progressive Web App)

> Objetivo: que MultiCatálogo sea **instalable** (Add to Home Screen), se abra a pantalla completa y ofrezca un **mínimo offline** (shell de la app + catálogo en caché). Stack: Vite 5 + `vite-plugin-pwa` (Workbox). No altera el contrato de la API ni el backend.

### Plan de implementación (resumen)

| Fase | Nombre | Entregable principal | Dependencias |
|------|--------|----------------------|--------------|
| **PWA-1** | Fundamentos e instalabilidad | Manifest + iconos + meta + plugin PWA básico | Ninguna |
| **PWA-2** | Service Worker y precache | App instalable; assets estáticos en caché | PWA-1 |
| **PWA-3** | Offline y runtime cache | Catálogo usable sin red; fallback offline | PWA-2 |
| **PWA-4** | UX de instalación y actualizaciones | Banner “Instalar”, aviso de nueva versión, indicador offline | PWA-2 |

---

### Fase PWA-1 — Fundamentos e instalabilidad
**Objetivo:** cumplir los requisitos mínimos de Chrome/Edge/Android para que aparezca “Instalar aplicación”.

#### Frontend
- [x] Crear carpeta `frontend/public/`
- [x] Añadir iconos PWA en `public/icons/`:
  - [x] `icon-192.png` (192×192)
  - [x] `icon-512.png` (512×512)
  - [x] `icon-maskable-512.png` (maskable, safe zone)
  - [x] Favicon `favicon.ico` o `icon-192.png` enlazado
- [x] Crear `public/manifest.webmanifest` con:
  - [x] `name`, `short_name`, `description`
  - [x] `start_url: "/"`, `scope: "/"`
  - [x] `display: "standalone"`
  - [x] `background_color` y `theme_color` (alineados con la UI)
  - [x] `icons` (192, 512, maskable)
  - [x] `lang: "es"`, `dir: "ltr"`
- [x] Actualizar `index.html`:
  - [x] `<link rel="manifest" href="/manifest.webmanifest" />`
  - [x] `<meta name="theme-color" content="…" />`
  - [x] Meta Apple: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`
  - [x] `<link rel="apple-touch-icon" href="/icons/icon-192.png" />`
- [x] ~~Instalar `vite-plugin-pwa`~~ → **decisión:** service worker propio (`public/sw.js` + `src/pwa.ts`), sin dependencias nuevas
- [x] ~~Registrar el plugin en `vite.config.ts`~~ → N/A; el registro del SW está en `src/pwa.ts` (llamado desde `main.tsx`, solo en producción) y el manifest vive en `public/`
- [x] Documentar en `frontend/README.md` cómo generar iconos y probar en build

#### Pruebas manuales de aceptación
- [ ] `npm run build && npm run preview` sin errores
- [ ] DevTools → Application → Manifest: sin errores; iconos visibles
- [ ] En Chrome (localhost o HTTPS): aparece opción “Instalar MultiCatálogo” / icono en la barra de direcciones

---

### Fase PWA-2 — Service Worker y precache
**Objetivo:** service worker activo, precache del shell (HTML/JS/CSS/iconos) y app usable en modo standalone.

#### Frontend
- [x] Configurar el SW propio (equivalente a Workbox `generateSW`):
  - [x] `strategies: "generateSW"` (o `injectManifest` si se necesita SW custom)
  - [x] Precache de assets del build (`globPatterns`: js, css, html, ico, png, svg, webmanifest)
  - [x] `navigateFallback: "/index.html"` (SPA)
  - [x] `navigateFallbackDenylist` para no capturar `/api/*`
- [x] Verificar que el SW se registra en producción (`main.tsx` no requiere código extra si el plugin inyecta el registro)
- [x] Asegurar que `BrowserRouter` sigue funcionando con `navigateFallback` (rutas client-side)
- [x] Añadir script o nota en README: la PWA se valida con **build + preview**, no solo con `npm run dev` (en dev el SW suele desactivarse o ser limitado)

#### Pruebas manuales de aceptación
- [ ] Tras `npm run build && npm run preview`: Application → Service Workers → status **activated**
- [ ] Application → Cache Storage: aparecen entradas del precache (JS/CSS/index)
- [ ] Instalar la app → se abre sin barra de URL (standalone)
- [ ] Cerrar pestaña, abrir desde el icono del sistema → carga la shell

---

### Fase PWA-3 — Offline y runtime cache
**Objetivo:** con la red caída, la shell sigue abriendo y el catálogo (y opcionalmente la red de referidos) se sirven desde caché si ya se visitaron online.

#### Frontend
- [x] Runtime caching (Workbox) en la config del plugin:
  - [x] `GET /api/productos` → estrategia **StaleWhileRevalidate** o **NetworkFirst** (TTL razonable, p. ej. 5–10 min)
  - [x] `GET /api/productos/:id` → NetworkFirst con fallback a caché
  - [x] `GET /api/red` → **no se cachea** (decisión: datos privados/autenticados; en un dispositivo compartido quedarían expuestos)
  - [x] Imágenes externas (picsum / CDN) → CacheFirst con límite de entradas y duración
  - [x] **No** cachear `POST /api/login` (siempre red)
- [x] Página o componente de **fallback offline** (ruta catch-all o UI cuando `navigator.onLine === false` y no hay caché de la vista)
- [x] Reutilizar el respaldo ya existente en `MiRed.tsx` / `data/red.ts` cuando la API no responda
- [ ] (Opcional) Guardar última respuesta de productos en `localStorage`/`IndexedDB` como respaldo extra al SW

#### Pruebas manuales de aceptación
- [ ] Online: cargar `/catalogo` o `/tienda` → luego DevTools → Network → Offline
- [ ] Recargar: la shell carga; el listado de productos se muestra desde caché (o mensaje claro si nunca se cacheó)
- [ ] `/login` sin red: mensaje de error amigable (no pantalla en blanco)
- [ ] Volver online: datos se actualizan en la siguiente navegación o al revalidar

---

### Fase PWA-4 — UX de instalación y actualizaciones
**Objetivo:** experiencia de instalación y actualización clara para el usuario final (sin depender solo del menú del navegador).

#### Frontend
- [x] Capturar evento `beforeinstallprompt`, guardar el `deferredPrompt` y mostrar un **banner o botón “Instalar app”** (dismissible; no mostrar si ya está instalada: `display-mode: standalone` o `getInstalledRelatedApps` si aplica)
- [x] Escuchar `appinstalled` para ocultar el banner y opcionalmente registrar analítica local
- [x] Aviso de **nueva versión**: cuando el SW detecta update (`needRefresh` / `onNeedRefresh` del virtual module de `vite-plugin-pwa`), mostrar toast “Hay una actualización — Reiniciar”
- [x] Indicador visual de estado de red (punto o barra “Sin conexión”) usando `online` / `offline` events
- [x] (Opcional) Atajos en el manifest: `shortcuts` a `/tienda` y `/catalogo`

#### Pruebas manuales de aceptación
- [ ] En Chrome (condiciones de instalabilidad): aparece el banner/botón propio de “Instalar”
- [ ] Tras instalar, el banner no vuelve a mostrarse en esa sesión/dispositivo
- [ ] Publicar un build nuevo → al abrir la app instalada aparece el aviso de actualización y al aceptar se recarga con la versión nueva
- [ ] Desconectar red → se ve el indicador “Sin conexión”

---

### Criterios de cierre del HITO F (PWA)
- [ ] Lighthouse (modo Mobile) → categoría **PWA** / Installable en verde (o checklist manual equivalente en DevTools)
- [ ] Manifest válido + SW activo + al menos un icono 192 y 512
- [ ] App instalable en Android Chrome y escritorio Chromium
- [ ] Offline: shell + catálogo (si ya visitado) no muestran pantalla en blanco
- [x] Ningún cambio en firmas de endpoints ni en el JSON del backend
- [x] Documentado en `frontend/README.md` (build, preview, cómo probar offline e instalar)

### Fuera de alcance (por ahora)
- Push notifications / Web Push
- Background Sync de pedidos (no hay API de escritura de pedidos aún)
- iOS Safari: instalación manual desde “Compartir → Añadir a pantalla de inicio” (sin `beforeinstallprompt`); se documenta, no se automatiza
- Sustituir `http://` del API en producción por HTTPS + mismo origen o CORS ya existente
