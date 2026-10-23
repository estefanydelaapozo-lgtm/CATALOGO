// src/services/productosService.ts
// Capa de servicios del catálogo: consume la API Go/Fiber (GET /api/productos y /api/productos/:id).
// Los errores del backend llegan con formato estandarizado { status, message, details }
// y se propagan como ApiError para que los componentes muestren el mensaje exacto.

import type { Producto } from "../data/productos";
import { API_URL } from "../config";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`);
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.message ?? "Error inesperado del servidor",
      data?.details
    );
  }
  return data as T;
}

// GET /api/productos (lista completa)
export const getProductos = (): Promise<Producto[]> =>
  request<Producto[]>("/api/productos");

// GET /api/productos/:id (detalle). Se envía el id tal cual viene de la URL;
// la validación (400 si no es numérico, 404 si no existe) la hace el backend.
export const getProductoById = (id: string): Promise<Producto> =>
  request<Producto>(`/api/productos/${encodeURIComponent(id)}`);
