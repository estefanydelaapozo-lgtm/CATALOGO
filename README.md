# MultiCatálogo — Frontend React conectado a API RESTful en Go

Proyecto (React + TypeScript + Vite + Tailwind) conectado al backend visto en clases (Go + Fiber).

```
.
├── backend/    API RESTful en Go (Fiber) — puerto 3000
└── frontend/   Aplicación React (Vite) — puerto 5173
```

## Endpoints consumidos

| Método | Ruta             | Uso en el frontend                                     |
|--------|------------------|--------------------------------------------------------|
| POST   | `/api/login`     | `Login.tsx` — valida credenciales y devuelve el token  |
| GET    | `/api/productos` | `Catalogo.tsx` — carga el catálogo de productos        |

Credenciales de prueba: `admin@upse.edu.ec` / `123456`

## Qué se cambió respecto al proyecto base (layout y enrutamiento)

- **`frontend/src/services/api.ts`** (nuevo): capa de acceso a la API. Define la URL base (`VITE_API_URL` o `http://<host>:3000`), los tipos de respuesta, el error `ApiError` y las funciones `loginRequest()` y `getProductos()`.
- **`Login.tsx`**: se reemplazó la validación hardcodeada por `POST /api/login`; muestra el error que devuelve el servidor, un estado de carga y un mensaje si no hay conexión.
- **`AuthContext.tsx`**: `login(email, token)` ahora también guarda el token que entrega la API; `logout()` lo limpia.
- **`Catalogo.tsx`**: los productos ya no están quemados en el código; se cargan con `GET /api/productos` dentro de `useEffect`, con estados de carga, error (botón *Reintentar*) y lista vacía.
- **`backend/main.go`**: CORS ampliado para aceptar `localhost:5173` y `127.0.0.1:5173` además de la IP original, y se permite la cabecera `Authorization`.

## Cómo ejecutarlo

Necesitas dos terminales.

**1. Backend** (Go instalado):

```bash
cd backend
go run .
# API escuchando en http://localhost:3000
```

**2. Frontend** (Node.js instalado):

```bash
cd frontend
npm install
npm run dev
# Abrir http://localhost:5173
```

Si el backend corre en otro equipo/VM, crea `frontend/.env` (puedes copiar `frontend/.env.example`) con:

```
VITE_API_URL=http://IP_DEL_BACKEND:3000
```

y agrega el origen del frontend en `AllowOrigins` de `backend/main.go`.

## Subir al repositorio personal

```bash
git init
git add .
git commit -m "Conecta el frontend React con la API RESTful en Go"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```
