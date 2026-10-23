// /admin/liquidaciones — comisiones pendientes de pago + historial de liquidaciones confirmadas
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../services/http';

interface Deuda {
  referidoId: number;
  nombre: string;
  email?: string;
  codigo: string;
  pendiente: number;
  numComisiones: number;
  ultimaComision?: string;
}

interface Liquidacion {
  id: number;
  referidoId: number;
  nombre?: string;
  email?: string;
  total: number;
  estado: string;
  creadoEn: string;
  pagadaEn?: string;
}

const dinero = (n: number): string => `$${n.toFixed(2)}`;

const fechaHora = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const th = 'px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7a90]';

const AdminLiquidaciones = () => {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [historial, setHistorial] = useState<Liquidacion[]>([]);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
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

  const liquidar = async (d: Deuda) => {
    if (!window.confirm(`¿Liquidar ${dinero(d.pendiente)} a ${d.nombre}?`)) return;
    setBusy(d.referidoId);
    setError('');
    setAviso('');
    try {
      // referidoId puede ser 0 (nodo raíz "Tú"): es un id válido.
      const liq = await apiFetch<Liquidacion>('/api/liquidaciones', {
        method: 'POST',
        body: JSON.stringify({ referido_id: d.referidoId }),
      });
      setAviso(`Liquidación LIQ-#${liq.id} registrada por ${dinero(liq.total)} a ${d.nombre}.`);
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo liquidar');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 text-sm">{error}</div>
      )}
      {aviso && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 text-sm">{aviso}</div>
      )}

      {/* ---------- Comisiones pendientes ---------- */}
      <section className="bg-white border border-[#e6dfea] rounded-2xl shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-[#1f1727]">Comisiones Pendientes de Pago</h1>
            <p className="text-sm text-[#7d6f87]">
              Distribuidores con saldo acumulado listo para corte y liquidación
            </p>
            <p className="text-xs text-[#7d6f87] mt-1">
              Cada compra de un usuario genera comisión para quienes lo invitaron (nivel 1: 10 %, nivel 2: 5 %,
              nivel 3: 2 %). A cada uno se le liquida lo acumulado en sus comisiones pendientes.
            </p>
          </div>
          <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full">
            {deudas.length} {deudas.length === 1 ? 'distribuidor pendiente' : 'distribuidores pendientes'}
          </span>
        </div>

        {loading ? (
          <p className="text-[#7d6f87]">Cargando…</p>
        ) : deudas.length === 0 ? (
          <p className="text-[#7d6f87] text-center py-8">No hay comisiones pendientes de liquidar</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f6fa]">
                <tr>
                  <th className={th}>ID Distribuidor</th>
                  <th className={th}>Nombre</th>
                  <th className={th}>Email</th>
                  <th className={`${th} text-center`}>Comisiones</th>
                  <th className={th}>Última</th>
                  <th className={`${th} text-right`}>Saldo pendiente</th>
                  <th className={`${th} text-center`}>Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3eef5]">
                {deudas.map((d) => (
                  <tr key={d.referidoId}>
                    <td className="px-5 py-4 text-[#6b7a90]">#{d.referidoId}</td>
                    <td className="px-5 py-4 font-semibold text-[#1f1727]">{d.nombre}</td>
                    <td className="px-5 py-4 text-[#6b7a90]">{d.email || '—'}</td>
                    <td className="px-5 py-4 text-center text-[#6b7a90]">{d.numComisiones}</td>
                    <td className="px-5 py-4 text-[#6b7a90]">{fechaHora(d.ultimaComision)}</td>
                    <td className="px-5 py-4 text-right font-bold text-amber-600">{dinero(d.pendiente)}</td>
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        disabled={busy === d.referidoId}
                        onClick={() => void liquidar(d)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap"
                      >
                        {busy === d.referidoId ? 'Liquidando…' : '💰 Liquidar Pago'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- Historial ---------- */}
      <section className="bg-white border border-[#e6dfea] rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-[#1f1727] mb-5">Historial de Liquidaciones Confirmadas</h2>
        {historial.length === 0 ? (
          <p className="text-[#7d6f87] text-sm">Aún no hay liquidaciones registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f6fa]">
                <tr>
                  <th className={th}>Nº Liquidación</th>
                  <th className={th}>Distribuidor</th>
                  <th className={th}>Total liquidado</th>
                  <th className={th}>Fecha de creación</th>
                  <th className={th}>Fecha de pago</th>
                  <th className={th}>Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3eef5]">
                {historial.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-4 font-mono font-bold text-[#1f1727]">LIQ-#{l.id}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#1f1727]">{l.nombre || `Distribuidor ${l.referidoId}`}</p>
                      {l.email && <p className="text-xs text-[#7d6f87]">{l.email}</p>}
                    </td>
                    <td className="px-5 py-4 font-bold text-emerald-600">{dinero(l.total)}</td>
                    <td className="px-5 py-4 text-[#6b7a90]">{fechaHora(l.creadoEn)}</td>
                    <td className="px-5 py-4 text-[#6b7a90]">{fechaHora(l.pagadaEn)}</td>
                    <td className="px-5 py-4">
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                        {l.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminLiquidaciones;
