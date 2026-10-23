# MultiCatálogo — Frontend

Práctica 03 (Unidad 1, Tema 5) — Framework Programación Web.
Stack: **React 19 + Vite + Tailwind CSS + React Router v7 + TypeScript**.

## Estructura

```
frontend/
├── index.html
├── public/                     # PWA: sw.js, manifest.webmanifest, offline.html, icons/, favicon.ico
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── src/
    ├── main.tsx
    ├── pwa.ts                  # registro del Service Worker + aviso de actualización
    ├── App.tsx                 # rutas + guardas (ProtectedRoute, AdminRoute, CartBoundary)
    ├── config.ts               # API_URL (backend en el puerto 3000)
    ├── index.css
    ├── context/
    │   ├── AuthContext.tsx     # usuario + rol (admin | cliente)
    │   └── CartContext.tsx     # carrito persistente por usuario (localStorage)
    ├── data/
    │   ├── productos.ts        # mock del catálogo
    │   └── red.ts              # red multinivel + funciones de comisiones
    ├── services/
    │   └── productosService.ts
    └── components/
        ├── Layout.tsx  Navbar.tsx  Sidebar.tsx
        ├── Login.tsx
        ├── Storefront.tsx      # /tienda
        ├── Catalogo.tsx        # /catalogo
        ├── DetalleProducto.tsx # /producto/:id
        ├── Carrito.tsx  Checkout.tsx  Confirmacion.tsx
        ├── Registro.tsx        # /registro (público, ?ref=CODIGO)
        ├── MisPedidos.tsx      # /mis-pedidos
        ├── MiRed.tsx           # /mi-red (red propia + link de referido + comisiones)
        ├── Dashboard.tsx       # /       (solo admin, reportes reales)
        ├── AdminProductos.tsx  AdminPedidos.tsx  AdminLiquidaciones.tsx  # /admin/* (solo admin)
        ├── Paginador.tsx       # paginación reutilizable ({data,page,limit,total})
        └── PwaStatus.tsx       # banner instalar / actualización / sin conexión
```

## Ejecutar

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint     # 0 errores (2 warnings de fast-refresh en los context son aceptables)
npm run build    # tsc -b + vite build
```

Requiere el backend corriendo en el puerto 3000 (ver `../backend`).

## Cuentas de prueba

| Rol     | Correo               | Contraseña |
|---------|----------------------|------------|
| Admin   | admin@upse.edu.ec    | 123456     |
| Cliente | cliente@upse.edu.ec  | 123456     |

## Rutas

| Ruta | Acceso |
|---|---|
| `/login` | público |
| `/login`, `/registro` | público |
| `/` (Dashboard), `/admin/productos`, `/admin/pedidos`, `/admin/liquidaciones` | solo admin |
| `/mi-red`, `/mis-pedidos`, `/tienda`, `/catalogo`, `/producto/:id`, `/carrito`, `/checkout`, `/confirmacion` | admin y cliente |

## PWA (instalable + offline básico)

La app es una Progressive Web App con **service worker propio** (`public/sw.js`), sin plugins:
no requiere instalar nada extra.

> ⚠ El service worker **solo se registra en el build de producción**. Probar con
> `npm run build && npm run preview` (http://localhost:4173), no con `npm run dev`.

**Qué se guarda en caché**

| Recurso | Estrategia |
|---|---|
| Shell (`index.html`, iconos, manifest) y rutas de la SPA | Red primero; sin red abre el shell guardado |
| `/assets/*` (JS/CSS con hash) | Cache primero |
| `GET /api/productos` y `/api/productos/:id` (públicos) | Red primero, respaldo en caché |
| Imágenes (picsum/CDN) | Cache primero, máx. 80 |
| Login, registro, checkout, pedidos, comisiones, red, admin | **Siempre red, nunca se cachea** (datos privados) |

**Probar instalación**
1. `npm run build && npm run preview`, abrir en Chrome/Edge.
2. DevTools → Application → *Manifest* (sin errores) y *Service Workers* (activated).
3. Aparece el banner «Instala MultiCatálogo» (o el icono en la barra de direcciones). En iOS Safari: Compartir → *Añadir a pantalla de inicio* (iOS no emite `beforeinstallprompt`).

**Probar offline**: visitar `/tienda` con red → DevTools → Network → *Offline* → recargar. Debe verse la barra «Sin conexión» y el catálogo guardado.

**Probar actualización**: cambiar `VERSION` en `public/sw.js` (o cualquier archivo), `npm run build`, recargar la pestaña abierta → aparece «Hay una actualización disponible → Reiniciar».

**Regenerar iconos**: los PNG de `public/icons/` (192, 512, maskable 512, apple-touch 180) son un cuadrado teal `#0d9488` con «MC». Para cambiarlos, reemplazar esos archivos manteniendo nombres y tamaños; el maskable debe dejar el logo dentro del 80 % central.

## Paginación

`Paginador.tsx` recibe `page`, `limit`, `total` y `onChange(page)` (el contrato estándar del backend).
Se usa en `/admin/pedidos` y `/admin/productos` (20 por página) y `/mis-pedidos` (10). Al cambiar de filtro o búsqueda vuelve a la página 1; si hay una sola página no se muestra.
