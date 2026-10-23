// Mi Red — subárbol del usuario + link de invitación + ledger de comisiones
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../services/http';

interface Referido {
  id: number;
  nombre: string;
  nivel: number;
  ventas: number;
  saldo?: number;
  hijos?: Referido[];
}

interface RedMia {
  red: Referido;
  codigo: string;
  link: string;
}

interface ComisionFila {
  id: number;
  pedidoId: number;
  pedidoNumero?: string;
  nivel: number;
  porcentaje: number;
  monto: number;
  estado: string;
  creadoEn: string;
}

interface ComisionesResumen {
  items: ComisionFila[];
  pendiente: number;
  pagado: number;
  total: number;
}

function Nodo({ n, depth = 0 }: { n: Referido; depth?: number }) {
  return (
    <li className="mt-2">
      <div
        className="flex flex-wrap items-center gap-2 text-sm"
        style={{ marginLeft: depth * 12 }}
      >
        <span className="font-semibold text-[#31283b]">{n.nombre}</span>
        <span className="text-xs text-[#7d6f87]">N{n.nivel}</span>
        <span className="text-xs text-[#82285f]">${n.ventas.toLocaleString()}</span>
        {typeof n.saldo === 'number' && (
          <span className="text-xs text-green-600">saldo ${n.saldo.toFixed(2)}</span>
        )}
      </div>
      {n.hijos && n.hijos.length > 0 && (
        <ul>
          {n.hijos.map((h) => (
            <Nodo key={h.id} n={h} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

const MiRed = () => {
  const [redMia, setRedMia] = useState<RedMia | null>(null);
  const [coms, setComs] = useState<ComisionesResumen | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const [r, c] = await Promise.all([
          apiFetch<RedMia>('/api/red/mia'),
          apiFetch<ComisionesResumen>('/api/comisiones/mias'),
        ]);
        if (cancel) return;
        setRedMia(r);
        setComs(c);
      } catch (e) {
        if (!cancel) setError(e instanceof ApiError ? e.message : 'Error al cargar la red');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const linkCompleto =
    redMia?.codigo != null
      ? `${window.location.origin}/registro?ref=${encodeURIComponent(redMia.codigo)}`
      : '';

  const copiar = async () => {
    if (!linkCompleto) return;
    try {
      await navigator.clipboard.writeText(linkCompleto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (loading) return <p className="p-4 text-[#7d6f87]">Cargando tu red…</p>;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#1f1727]">Mi Red</h1>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <section className="bg-white border border-[#e6dfea] rounded-lg p-4">
        <h2 className="font-bold text-[#31283b] mb-2">Tu link de referido</h2>
        <p className="text-sm text-[#7d6f87] mb-3">
          Comparte este enlace para que nuevos clientes cuelguen de tu nodo.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            className="flex-1 border border-[#d3c9d9] rounded-lg px-3 py-3 text-sm min-h-[44px] bg-[#faf7fb]"
            value={linkCompleto}
          />
          <button
            type="button"
            onClick={() => void copiar()}
            className="bg-[#82285f] text-white font-semibold px-4 py-3 rounded-lg min-h-[44px] hover:bg-[#6a1f4d]"
          >
            {copiado ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>
        {redMia?.codigo && (
          <p className="text-xs text-[#7d6f87] mt-2">
            Código: <span className="font-mono font-semibold">{redMia.codigo}</span>
          </p>
        )}
      </section>

      <section className="bg-white border border-[#e6dfea] rounded-lg p-4">
        <h2 className="font-bold text-[#31283b] mb-3">Tu subárbol</h2>
        {redMia?.red ? (
          <ul>
            <Nodo n={redMia.red} />
          </ul>
        ) : (
          <p className="text-[#7d6f87] text-sm">No tienes nodo en la red aún</p>
        )}
      </section>

      <section className="bg-white border border-[#e6dfea] rounded-lg p-4">
        <h2 className="font-bold text-[#31283b] mb-3">Mis comisiones</h2>
        {coms && (
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-700 uppercase font-semibold">Pendiente</p>
              <p className="text-lg font-bold text-amber-800">${coms.pendiente.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-700 uppercase font-semibold">Pagado</p>
              <p className="text-lg font-bold text-green-800">${coms.pagado.toFixed(2)}</p>
            </div>
            <div className="bg-[#faf7fb] rounded-lg p-3">
              <p className="text-xs text-[#5f536a] uppercase font-semibold">Total</p>
              <p className="text-lg font-bold text-[#31283b]">${coms.total.toFixed(2)}</p>
            </div>
          </div>
        )}
        {!coms?.items?.length ? (
          <p className="text-[#7d6f87] text-sm">Aún no hay comisiones registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-[#7d6f87]">
                <tr>
                  <th className="py-2 pr-3">Pedido</th>
                  <th className="py-2 pr-3">Nivel</th>
                  <th className="py-2 pr-3">%</th>
                  <th className="py-2 pr-3">Monto</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {coms.items.map((c) => (
                  <tr key={c.id} className="border-t border-[#f3eef5]">
                    <td className="py-2 pr-3">{c.pedidoNumero || c.pedidoId}</td>
                    <td className="py-2 pr-3">{c.nivel}</td>
                    <td className="py-2 pr-3">{(c.porcentaje * 100).toFixed(0)}%</td>
                    <td className="py-2 pr-3 font-semibold">${c.monto.toFixed(2)}</td>
                    <td className="py-2">
                      <span className="text-xs font-semibold uppercase">{c.estado}</span>
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

export default MiRed;
