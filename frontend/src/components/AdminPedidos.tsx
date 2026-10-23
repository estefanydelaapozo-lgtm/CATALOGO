// /admin/pedidos — listado + cambio de estado
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../services/http';
import Paginador from './Paginador';

const LIMITE = 20;

interface PedidoLista {
  id: number;
  numero: string;
  total: number;
  estado: string;
  fecha: string;
  cliente?: string;
  email?: string;
}

interface Pagina {
  data: PedidoLista[];
  page: number;
  limit: number;
  total: number;
}

const ESTADOS = ['', 'pendiente', 'preparando', 'enviado', 'entregado', 'cancelado'];

const transiciones: Record<string, string[]> = {
  pendiente: ['preparando', 'cancelado'],
  preparando: ['enviado', 'cancelado'],
  enviado: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

const badge = (estado: string) => {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-100 text-amber-800',
    preparando: 'bg-blue-100 text-blue-800',
    enviado: 'bg-[#efe5f8] text-[#561a40]',
    entregado: 'bg-green-100 text-green-800',
    cancelado: 'bg-red-100 text-red-700',
  };
  return map[estado] ?? 'bg-[#f3eef5] text-[#473d52]';
};

const AdminPedidos = () => {
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [filtro, setFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const cargar = useCallback(async (estado = filtro, pg = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMITE) });
      if (estado) params.set('estado', estado);
      const data = await apiFetch<Pagina>(`/api/pedidos?${params}`);
      setPagina(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [filtro, page]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiarEstado = async (id: number, estado: string) => {
    if (estado === 'cancelado') {
      const ok = window.confirm(
        '¿Cancelar el pedido? Se restaurará el stock y se revertirán comisiones pendientes.'
      );
      if (!ok) return;
    }
    setBusyId(id);
    setError('');
    try {
      await apiFetch(`/api/pedidos/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cambiar el estado');
    } finally {
      setBusyId(null);
    }
  };

  const lista = pagina?.data ?? [];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1f1727] mb-4">Pedidos</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        {ESTADOS.map((e) => (
          <button
            key={e || 'todos'}
            type="button"
            onClick={() => {
              setFiltro(e);
              setPage(1);
            }}
            className={`px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] border ${
              filtro === e
                ? 'bg-[#82285f] text-white border-[#82285f]'
                : 'bg-white text-[#473d52] border-[#e6dfea] hover:bg-[#faf7fb]'
            }`}
          >
            {e || 'Todos'}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-[#7d6f87]">Cargando…</p>
      ) : (
        <div className="space-y-3">
          {lista.map((p) => {
            const siguientes = transiciones[p.estado] ?? [];
            return (
              <div
                key={p.id}
                className="bg-white border border-[#e6dfea] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-[#1f1727]">{p.numero}</p>
                  <p className="text-sm text-[#7d6f87]">
                    {p.cliente || p.email || '—'} · {new Date(p.fecha).toLocaleString()}
                  </p>
                  <p className="text-lg font-semibold text-[#82285f] mt-1">
                    ${p.total.toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full w-fit ${badge(p.estado)}`}>
                    {p.estado}
                  </span>
                  {siguientes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {siguientes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => void cambiarEstado(p.id, s)}
                          className={`text-sm font-medium px-3 py-2 rounded-lg min-h-[44px] border disabled:opacity-50 ${
                            s === 'cancelado'
                              ? 'border-red-300 text-red-700 hover:bg-red-50'
                              : 'border-[#c9a6e4] text-[#6a1f4d] hover:bg-[#f8f3fc]'
                          }`}
                        >
                          → {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {lista.length === 0 && (
            <p className="text-center text-[#7d6f87] py-8">No hay pedidos con ese filtro</p>
          )}
        </div>
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

export default AdminPedidos;
