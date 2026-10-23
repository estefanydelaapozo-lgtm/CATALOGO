// /admin/liquidaciones — deudas pendientes + historial
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../services/http';

interface Deuda {
  referidoId: number;
  nombre: string;
  codigo: string;
  pendiente: number;
}

interface Liquidacion {
  id: number;
  referidoId: number;
  nombre?: string;
  total: number;
  estado: string;
  creadoEn: string;
  pagadaEn?: string;
}

const AdminLiquidaciones = () => {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [historial, setHistorial] = useState<Liquidacion[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [d, h] = await Promise.all([
        apiFetch<Deuda[]>('/api/reportes/comisiones-pendientes'),
        apiFetch<Liquidacion[]>('/api/liquidaciones'),
      ]);
      setDeudas(d ?? []);
      setHistorial(h ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar liquidaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const liquidar = async (referidoId: number, nombre: string) => {
    const ok = window.confirm(`¿Liquidar comisiones pendientes de ${nombre}?`);
    if (!ok) return;
    setBusy(referidoId);
    setError('');
    try {
      await apiFetch('/api/liquidaciones', {
        method: 'POST',
        body: JSON.stringify({ referido_id: referidoId }),
      });
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo liquidar');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1f1727] mb-6">Liquidaciones</h1>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-[#7d6f87]">Cargando…</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-bold text-[#31283b] mb-3">Deuda pendiente</h2>
            {deudas.length === 0 ? (
              <p className="text-[#7d6f87] bg-white border border-[#e6dfea] rounded-lg p-6 text-center">
                No hay comisiones pendientes de liquidar
              </p>
            ) : (
              <ul className="space-y-3">
                {deudas.map((d) => (
                  <li
                    key={d.referidoId}
                    className="bg-white border border-[#e6dfea] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-[#1f1727]">{d.nombre}</p>
                      <p className="text-sm text-[#7d6f87]">Código: {d.codigo || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-amber-600">
                        ${d.pendiente.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        disabled={busy === d.referidoId}
                        onClick={() => void liquidar(d.referidoId, d.nombre)}
                        className="bg-[#82285f] text-white font-semibold px-4 py-3 rounded-lg min-h-[44px] hover:bg-[#6a1f4d] disabled:opacity-50"
                      >
                        {busy === d.referidoId ? 'Liquidando…' : 'Liquidar'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#31283b] mb-3">Historial de pagos</h2>
            {historial.length === 0 ? (
              <p className="text-[#7d6f87] text-sm">Aún no hay liquidaciones registradas</p>
            ) : (
              <ul className="space-y-2">
                {historial.map((l) => (
                  <li
                    key={l.id}
                    className="bg-white border border-[#f3eef5] rounded-lg p-3 flex justify-between text-sm"
                  >
                    <span>
                      #{l.id} · {l.nombre || `Referido ${l.referidoId}`} ·{' '}
                      {new Date(l.creadoEn).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-green-700">${l.total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AdminLiquidaciones;
