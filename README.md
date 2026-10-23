# MultiCatálogo

Proyecto dividido en dos partes:

```
MultiCatalogo/
├── backend/    API en Go (Fiber) — puerto 3000
└── frontend/   React 19 + Vite + Tailwind + React Router 7 + TypeScript
```

## Backend
Requiere Docker (PostgreSQL 16 + Redis).
```bash
cd backend
docker compose up -d      # levanta PostgreSQL (carga database/init.sql) y Redis
go mod tidy               # solo la primera vez (descarga go-redis y genera go.sum)
go run .
```
Opcional: la API también puede correr en Docker con `docker compose --profile full up -d --build`.

### Caché con Redis (Fase 3)
`GET /api/productos` (5 min) y `GET /api/red` (10 min) usan el patrón Cache-Aside. La cabecera
`X-Cache: HIT|MISS` indica si la respuesta vino de Redis o de PostgreSQL.
```bash
docker exec multicatalogo-redis redis-cli KEYS "*"                 # ver claves
docker exec multicatalogo-redis redis-cli DEL productos:all        # invalidar el catálogo
docker exec multicatalogo-redis redis-cli FLUSHALL                 # limpiar todo (útil entre demos)
```
> Con el caché activo, un `UPDATE` directo en PostgreSQL tarda hasta 5 min en verse en el catálogo
> (hasta que expire el TTL); invalida la clave con el comando de arriba para verlo al instante.

## Frontend
```bash
cd frontend
npm install
npm run dev
```

El frontend se conecta al backend en `http://<host>:3000` (ver `frontend/src/config.js`).
Más detalle del frontend en `frontend/README.md`.

### Checkout transaccional (Fase 4)
`POST /api/checkout` (requiere `Authorization: Bearer <token>` del login) guarda el pedido en una
transacción ACID, descuenta stock y calcula las comisiones de la red (10 % / 5 % / 2 %) en una
goroutine, sin hacer esperar al cliente. Al arrancar, la API aplica sola la migración
`database/migracion_fase4.sql` (idempotente), no hace falta ejecutar SQL a mano.
```bash
cd backend && go test ./controllers/ -v      # pruebas unitarias (sin BD)
```
Demostrar el ROLLBACK (solo en clase): poner `FALLA_CHECKOUT=antes_items` en `backend/.env`, reiniciar
`go run .` y comprar; la BD no debe tener ningún pedido nuevo. Para volver a empezar la demo ejecuta
`database/reset_demo_fase4.sql` y `redis-cli FLUSHALL`.

### Seguridad (JWT + bcrypt)
- Passwords almacenados con **bcrypt** (migración `003_seguridad.sql` al arrancar).
- Login emite un **JWT real** HS256 (`JWT_SECRET` en `.env`, claims `{sub,email,rol,iat,exp}`, TTL 2h).
- Middleware `RequireAuth` protege `GET /api/red` y `POST /api/checkout`.
- El checkout toma la identidad del **token** (`c.Locals`), no del email del body (anti-spoofing).
- `/api/health` hace ping real a Postgres (503 si cae) y Redis (`degraded` si cae).
- Frontend: sesión persistida en `localStorage` (`multicatalogo_sesion`).

Cuentas de prueba (password `123456`):
- `admin@upse.edu.ec`
- `cliente@upse.edu.ec`
