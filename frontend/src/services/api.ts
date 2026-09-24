// src/services/api.ts
// Capa de acceso a la API RESTful (backend en Go + Fiber).
// Centraliza la URL base, los tipos de las respuestas y el manejo de errores,
// para que los componentes solo llamen a funciones como loginRequest() o getProductos().

import type { Producto } from '../data/productos';

// URL base de la API. Se puede sobreescribir con VITE_API_URL (archivo .env).
// Por defecto usa el mismo host desde el que se abrió el frontend, en el puerto 3000 del backend;
// así funciona tanto con localhost como con la IP de la máquina/VM.
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:3000`;

// Respuesta de POST /api/login
export interface LoginResponse {
  token: string;
  email: string;
}

// Error propio para distinguir fallos HTTP (401, 400, 500...) de fallos de red.
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Función genérica: hace la petición, valida el código HTTP y devuelve el JSON tipado.
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    // fetch solo lanza excepción cuando no hay conexión / CORS bloquea / el servidor está apagado
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
      0
    );
  }

  if (!response.ok) {
    // El backend responde los errores como { "error": "mensaje" }
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error ?? `Error ${response.status} del servidor`, response.status);
  }

  return response.json() as Promise<T>;
}

// POST /api/login
export const loginRequest = (email: string, password: string) =>
  request<LoginResponse>('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

// GET /api/productos
export const getProductos = () => request<Producto[]>('/api/productos');
