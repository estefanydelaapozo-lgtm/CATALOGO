// src/components/MisPedidos.tsx — historial del cliente
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import Paginador from "./Paginador";

const LIMITE = 10;

interface PedidoLista {
  id: number;
  numero: string;
  total: number;
  estado: string;
  fecha: string;
}

interface Pagina {
  data: PedidoLista[];
  page: number;
  limit: number;
  total: number;
}

const MisPedidos = () => {
  const { user } = useAuth();
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.token) return;
    setLoading(true);
    fetch(`${API_URL}/api/pedidos/mios?page=${page}&limit=${LIMITE}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.message ?? `HTTP ${r.status}`);
        return data as Pagina;
      })
      .then(setPagina)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.token, page]);

  if (loading && !pagina) return <p className="text-[#7d6f87] p-6">Cargando pedidos…</p>;
  if (error)
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg m-4 border border-red-200">{error}</div>
    );

  const lista = pagina?.data ?? [];

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1f1727] mb-4">Mis pedidos</h1>
      {lista.length === 0 ? (
        <div className="bg-white border border-[#e6dfea] rounded-lg p-8 text-center">
          <p className="text-[#5f536a] mb-4">Aún no has realizado pedidos.</p>
          <Link to="/catalogo" className="text-[#82285f] font-semibold hover:underline">
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map((p) => (
            <li
              key={p.id}
              className="bg-white border border-[#e6dfea] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div>
                <p className="font-semibold text-[#1f1727]">{p.numero}</p>
                <p className="text-sm text-[#7d6f87]">
                  {new Date(p.fecha).toLocaleString()} · {p.estado}
                </p>
              </div>
              <p className="text-lg font-bold text-[#82285f]">${p.total.toFixed(2)}</p>
            </li>
          ))}
        </ul>
      )}
      {pagina && (
        <Paginador
          page={pagina.page}
          limit={pagina.limit}
          total={pagina.total}
          disabled={loading}
          onChange={setPage}
        />
      )}
    </div>
  );
};

export default MisPedidos;
