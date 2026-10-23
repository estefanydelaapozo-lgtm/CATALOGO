// Cliente HTTP único: añade Bearer del token guardado en sesión.
import { API_URL } from '../config';

const SESION_KEY = 'multicatalogo_sesion';

function tokenActual(): string {
  try {
    const raw = localStorage.getItem(SESION_KEY);
    if (!raw) return '';
    const data = JSON.parse(raw) as { token?: string };
    return data.token ?? '';
  } catch {
    return '';
  }
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = tokenActual();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? `HTTP ${res.status}`, data?.details);
  }
  return data as T;
}
