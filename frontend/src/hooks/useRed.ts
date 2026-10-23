// src/hooks/useRed.ts
// Obtiene el árbol de referidos desde GET /api/red (protegido con JWT).
// Mientras llega la respuesta, o si el servidor no responde, devuelve los datos locales de data/red.ts.
import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { redInicial, type Referido } from '../data/red';

export const useRed = (): Referido => {
  const { user } = useAuth();
  const [red, setRed] = useState<Referido>(redInicial);

  useEffect(() => {
    if (!user?.token) return;
    let cancelado = false;
    const query = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
    fetch(`${API_URL}/api/red${query}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: Referido) => { if (!cancelado) setRed(data); })
      .catch((err) => console.warn("useRed: se usan los datos locales porque falló /api/red:", err));
    return () => { cancelado = true; };
  }, [user?.email, user?.token]);

  return red;
};
