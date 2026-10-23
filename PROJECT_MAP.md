# PROJECT_MAP — MultiCatálogo (mapa de navegación)

> Leer ESTE archivo antes de abrir código. Solo rutas y responsabilidades.
> Raíz del proyecto = carpeta que contiene `backend/` y `frontend/`.

## 1. Visión general
- Sistema SaaS multitenant tipo catálogo/billetera con red de referidos (multinivel).
- Unidad 2: alta transaccionalidad y rendimiento **backend**. El frontend ya está terminado y funciona como "monitor visual".
- Puertos: API Go/Fiber `:3000` · Frontend Vite `:5173` · PostgreSQL 16 (Docker) `:5432` · Redis (Docker) `:6379`.
- **Back-office MLM completo (Fases 0-7):** registro con referido real, CRUD de productos, pedidos con estados, ledger de comisiones, liquidaciones y reportes. Detalle en `PLAN_IMPLEMENTACION_U2.md`.
- **PWA:** el frontend es instalable y funciona offline (shell + catálogo público). Ver `frontend/README.md`.
- Cuentas de prueba: `admin@upse.edu.ec` / `cliente@upse.edu.ec`, contraseña `123456`.

## 2. Backend — `backend/` (Go + Fiber v2 + PostgreSQL vía `database/sql` + `lib/pq`)
Patrón por capas: routes → controllers → repository (Redis Cache-Aside → PostgreSQL) → models.
Fase 4: los controladores son `struct` que reciben **interfaces** (`DBRepository`, `CacheRepository`); `main.go` es el único lugar que crea las implementaciones y las inyecta.

| Ruta | Responsabilidad |
|---|---|
| `backend/main.go` | Arranque: .env, BD, migración Fase 4, Redis, **inyección de dependencias**, Fiber + ErrorHandler + recover + CORS, apagado ordenado (espera comisiones) |
| `backend/config/db.go` | `LoadEnv`, `Getenv`, `ConnectDB` (pool + reintentos) |
| `backend/config/migrate.go` | `Migrate`: ejecuta un script SQL idempotente al arrancar |
| `backend/database/migracion_fase4.sql`, `embed.go` | Tablas `pedidos`, `pedido_items`, `comisiones` + stock/saldo/referido_id (embebido en el binario) |
| `backend/database/reset_demo_fase4.sql` | Deja la demo como al inicio (stock, saldos, pedidos) |
| `backend/controllers/checkoutController.go` | `Checkout` (POST /api/checkout), goroutine `calcularComisiones`, `Esperar`, validación |
| `backend/controllers/checkout_test.go` | Pruebas unitarias con repositorio y caché falsos |
| `backend/repository/interfaces.go` | Contratos `DBRepository` y `CacheRepository` |
| `backend/repository/pedidos.go` | `CrearPedido` (transacción ACID), `AcreditarComisiones`, errores de negocio, inyección de falla (demo) |
| `backend/config/redis.go` | `ConnectRedis` (cliente go-redis; `REDIS_URL` o `REDIS_HOST`/`PORT`) |
| `backend/docker-compose.yml` | PostgreSQL 16 + Redis (`docker compose up -d`); API opcional con `--profile full` |
| `backend/Dockerfile` | Imagen de la API (solo perfil `full`) |
| `backend/database/init.sql` | Esquema (`usuarios`, `productos`, `referidos`) + datos semilla |
| `backend/.env`, `.env.example` | Credenciales BD, `REDIS_*` y `PORT` (el `.env` está en .gitignore) |
| `backend/routes/routes.go` | ÚNICO lugar donde se registran endpoints |
| `backend/controllers/authController.go` | `Login`: validación de entrada, 400/401/200 |
| `backend/controllers/prodController.go` | `GetProductos`, `GetProductoPorID` (400/404) |
| `backend/controllers/redController.go` | `GetRed` (árbol multinivel, `?email=` opcional, 400 si es inválido) |
| `backend/controllers/healthController.go` | `Health` → `{"status":"ok",...}` |
| `backend/controllers/response.go` | `SendError` + `ErrorHandler` (formato `APIError`) + `setCacheHeader` (`X-Cache`) |
| `backend/models/models.go` | `LoginRequest/Response`, `Producto`, `Referido`, `Usuario`, `APIError` |
| `backend/repository/cache.go` | `CacheAside[T]`, `RedisCache`, `NopCache`, claves (`productos:all` 5 min, `red:tree:{email}` 10 min) |
| `backend/repository/repository.go` | `PostgresRepo` (implementa `DBRepository`): `FindUsuario[ByToken]`, `GetProductos`, `GetProductoByID`, `GetRed` |
| `backend/auth/jwt.go`, `middleware/auth.go` | JWT: emisión/validación; `RequireAuth` y `RequireAdmin` |
| `backend/database/003_seguridad.sql`, `004_backoffice.sql` | bcrypt + índices; columnas/tablas del back-office (`comisiones`, `liquidaciones`, `estado`, `activo`, `codigo`…) |
| `backend/controllers/registerController.go` | `POST /api/register` (usuario + nodo de referido en una transacción) |
| `backend/controllers/prodAdminController.go` | CRUD admin de productos (borrado lógico, `?q=`, paginado) |
| `backend/controllers/pedidosController.go` | `/pedidos/mios`, listado admin, detalle (solo dueño/admin), cambio de estado |
| `backend/controllers/mlmController.go` | `/red/mia`, `/comisiones/mias`, liquidaciones, reportes (deuda por distribuidor) |
| `backend/repository/pedidos_query.go`, `productos_admin.go`, `red_comisiones.go`, `reportes.go`, `usuarios.go` | Consultas paginadas, ledger de comisiones, liquidación idempotente, reportes SQL, alta de usuarios |
| `backend/domain/comisiones.go` | `RepartirComisiones`: función pura (10 % / 5 % / 2 %), sin I/O |
| `backend/go.mod`, `go.sum` | Módulo `multicatalogo-backend`: fiber/v2, lib/pq, godotenv, go-redis/v9 |

### Endpoints
| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/api/health` | 200 `{status,message}` |
| POST | `/api/checkout` | 201 `Pedido` · 400 validación/producto inexistente · 401 sin sesión · 409 stock · 500 (con `Authorization: Bearer <token>`) |
| POST | `/api/login` | 200 `{token,email,rol}` · 400 validación · 401 credenciales |
| GET | `/api/productos` | 200 `[Producto]` · cabecera `X-Cache: HIT\|MISS` |
| GET | `/api/productos/:id` | 200 `Producto` · 400 id inválido · 404 no existe |
| GET | `/api/red[?email=]` | 200 `Referido` (árbol) · `X-Cache: HIT\|MISS` · 400 email inválido |
| POST | `/api/register` | 201 · 400 validación / `ref` inexistente · 409 email repetido |
| GET | `/api/red/mia` · `/api/comisiones/mias` · `/api/liquidaciones/mias` | Auth: red y cobros del usuario del token |
| GET | `/api/pedidos/mios` · `/api/pedidos/:id` | Auth: historial paginado `{data,page,limit,total}` y detalle |
| GET/POST/PUT/DELETE/PATCH | `/api/admin/productos`, `/api/productos[/:id[/activar]]` | Admin: CRUD con borrado lógico, búsqueda `?q=` y paginación |
| GET/PATCH | `/api/pedidos`, `/api/pedidos/:id/estado` | Admin: listado (`?estado=`) y transiciones (cancelar restituye stock) |
| GET/POST | `/api/liquidaciones` | Admin: historial y liquidar `{referido_id}` |
| GET | `/api/reportes/resumen`, `top-productos`, `top-referidos`, `comisiones-pendientes` | Admin: KPIs del Dashboard |

### Contrato de error (todas las rutas)
`{"status": int, "message": string, "details": any (opcional)}`

## 3. Frontend — `frontend/` (React 19 + Vite 5 + Tailwind 3 + React Router 7 + TypeScript)
**Prohibido cambiar** firmas de endpoints ni forma de los JSON que consume.

| Ruta | Responsabilidad |
|---|---|
| `frontend/src/App.tsx` | Rutas y guardas (`ProtectedRoute`, `AdminRoute`, `CartBoundary`) |
| `frontend/src/config.ts` | `API_URL` = `http://<host>:3000` |
| `frontend/src/context/AuthContext.tsx` | Usuario + rol (`admin` \| `cliente`) |
| `frontend/src/context/CartContext.tsx` | Carrito persistente por usuario (localStorage) |
| `frontend/src/services/productosService.ts` | `fetch` a `/api/productos[/:id]`, clase `ApiError` |
| `frontend/src/data/productos.ts` | Tipo `Producto` + categorías (mock ya no se usa en servicio) |
| `frontend/src/data/red.ts` | Cálculo de comisiones + red local de respaldo si `/api/red` falla |
| `frontend/src/components/Login.tsx` | POST `/api/login`, muestra `message` del backend |
| `frontend/src/components/DetalleProducto.tsx` | `/producto/:id`, muestra errores 400/404 |
| `frontend/src/components/Catalogo.tsx`, `Storefront.tsx` | Listado y tienda (consumen `getProductos`) |
| `frontend/src/components/Carrito.tsx`, `Checkout.tsx`, `Confirmacion.tsx` | Flujo de compra; `Checkout` hace POST a `/api/checkout` |
| `frontend/src/hooks/useRed.ts` | Hook: árbol desde `/api/red` (respaldo `data/red.ts`), usado por Dashboard y MiRed |
| `frontend/src/components/Dashboard.tsx`, `MiRed.tsx` | Solo admin (`/`, `/mi-red`); ambos usan `useRed` |
| `frontend/src/components/Layout.tsx`, `Navbar.tsx`, `Sidebar.tsx` | Estructura visual |
| `frontend/src/components/Registro.tsx` | `/registro` público (prefill `?ref=`) |
| `frontend/src/components/MisPedidos.tsx` | `/mis-pedidos` (cliente), paginado |
| `frontend/src/components/AdminProductos.tsx`, `AdminPedidos.tsx`, `AdminLiquidaciones.tsx` | Vistas admin (CRUD, estados, liquidar) |
| `frontend/src/components/Paginador.tsx` | Anterior / Página X de Y / Siguiente; reutilizable con el contrato `{data,page,limit,total}` |
| `frontend/src/pwa.ts` | Registro del Service Worker (solo producción) y aviso de actualización |
| `frontend/src/components/PwaStatus.tsx` | Banner «Instalar», aviso «Hay una actualización», barra «Sin conexión» |
| `frontend/public/sw.js` | Service Worker propio: precache del shell, caché del catálogo público e imágenes; nunca cachea datos privados |
| `frontend/public/manifest.webmanifest`, `offline.html`, `icons/` | Manifest (standalone, shortcuts), página offline e iconos (192/512/maskable/apple-touch) |

### Rutas de la SPA
`/login`, `/registro` públicos · `/`, `/admin/productos`, `/admin/pedidos`, `/admin/liquidaciones` solo admin · `/mi-red`, `/mis-pedidos`, `/tienda`, `/catalogo`, `/producto/:id`, `/carrito`, `/checkout`, `/confirmacion` ambos roles.

## 4. Documentación existente
- `README.md` (raíz): cómo ejecutar backend y frontend.
- `frontend/README.md`: estructura y rutas del frontend.
- `REQUIREMENTS_CHECKLIST.md`: estado y requerimientos (leer al iniciar sesión).
- `.windsurfrules`: reglas del agente.
- NOTA: `Guia_Practica_Tema5_leccion.md`, `Planificacion_Unidad1_Tema5.md` y `Silabo_Framework_Programacion_Web.md` NO están en este árbol; ubicación por confirmar.

## 5. Comandos
- BD + Redis: `cd backend && docker compose up -d` (reiniciar datos: `docker compose down -v`)
- Pruebas unitarias: `cd backend && go test ./controllers/ -v`
- Demo de ROLLBACK: `FALLA_CHECKOUT=antes_items go run .` (o `=pausa`; ver `.env.example`)
- Reiniciar la demo: ver `backend/database/reset_demo_fase4.sql`
- Ver/limpiar caché: `docker exec multicatalogo-redis redis-cli KEYS "*"` · `... redis-cli FLUSHALL`
- Backend: `cd backend && go run .`
- Frontend: `cd frontend && npm install && npm run dev`
- Tipos frontend: `cd frontend && npx tsc -b`
- PWA (build + preview, no sirve `npm run dev`): `cd frontend && npm run build && npm run preview`
- Verificar API sin navegador: `GET http://localhost:3000/api/health`
