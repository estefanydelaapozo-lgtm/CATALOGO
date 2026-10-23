// Dashboard admin — KPIs reales desde /api/reportes/*
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../services/http';

interface Resumen {
  totalVendido: number;
  numPedidos: number;
  ticketPromedio: number;
  comisionesDevengadas: number;
}

interface TopProducto {
  productoId: number;
  nombre: string;
  cantidad: number;
  total: number;
}

interface TopReferido {
  referidoId: number;
  nombre: string;
  ventas: number;
  saldo: number;
}

const Dashboard = () => {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [topProd, setTopProd] = useState<TopProducto[]>([]);
  const [topRef, setTopRef] = useState<TopReferido[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [r, p, ref] = await Promise.all([
          apiFetch<Resumen>('/api/reportes/resumen'),
          apiFetch<TopProducto[]>('/api/reportes/top-productos?limit=5'),
          apiFetch<TopReferido[]>('/api/reportes/top-referidos?limit=5'),
        ]);
        if (cancel) return;
        setResumen(r);
        setTopProd(p ?? []);
        setTopRef(ref ?? []);
      } catch (e) {
        if (!cancel) {
          setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los reportes');
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const kpis = resumen
    ? [
        {
          etiqueta: 'Total vendido',
          valor: `$${resumen.totalVendido.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          valorColor: 'text-[#82285f]',
          barra: 'bg-[#82285f]',
          chip: 'bg-[#efe5f8] text-[#82285f]',
          icono: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        },
        {
          etiqueta: 'Nº de pedidos',
          valor: String(resumen.numPedidos),
          valorColor: 'text-[#31283b]',
          barra: 'bg-[#9c4a9e]',
          chip: 'bg-[#f3e1f5] text-[#9c4a9e]',
          icono: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
        },
        {
          etiqueta: 'Ticket promedio',
          valor: `$${resumen.ticketPromedio.toFixed(2)}`,
          valorColor: 'text-[#31283b]',
          barra: 'bg-[#3a89b3]',
          chip: 'bg-[#e0f3fc] text-[#3a89b3]',
          icono: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
        },
        {
          etiqueta: 'Comisiones devengadas',
          valor: `$${resumen.comisionesDevengadas.toFixed(2)}`,
          valorColor: 'text-[#15803d]',
          barra: 'bg-[#16a34a]',
          chip: 'bg-green-100 text-[#15803d]',
          icono: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
        },
      ]
    : [];

  const tarjeta = 'bg-white rounded-2xl border border-[#e6dfea] shadow-sm';

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#31283b]">Resumen general</h1>
        <p className="text-sm text-[#5f536a] mt-1">Ventas, pedidos y red de referidos en un vistazo.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-[#5f536a]">Cargando reportes…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {kpis.map((kpi) => (
              <div key={kpi.etiqueta} className={`${tarjeta} relative overflow-hidden p-5`}>
                <span className={`absolute inset-x-0 top-0 h-1 ${kpi.barra}`} />
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-[#5f536a]">{kpi.etiqueta}</p>
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${kpi.chip}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icono} />
                    </svg>
                  </span>
                </div>
                <p className={`text-3xl font-bold mt-3 ${kpi.valorColor}`}>{kpi.valor}</p>
              </div>
            ))}
            {!resumen && (
              <p className="text-[#5f536a] col-span-full">Sin datos de ventas en el periodo.</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className={`${tarjeta} p-5 md:p-6`}>
              <h2 className="text-lg font-bold text-[#31283b] mb-4">Productos más vendidos</h2>
              {topProd.length === 0 ? (
                <p className="text-[#5f536a] text-sm bg-[#faf7fb] rounded-xl p-4">
                  Aún no hay ventas. Cuando se confirme el primer pedido, aquí verás los productos que más se venden.
                </p>
              ) : (
                <ul className="divide-y divide-[#f3eef5]">
                  {topProd.map((p, i) => (
                    <li key={p.productoId} className="flex justify-between items-center gap-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-[#efe5f8] text-[#6a1f4d] text-sm font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#31283b] truncate">{p.nombre}</p>
                          <p className="text-xs text-[#5f536a]">{p.cantidad} uds.</p>
                        </div>
                      </div>
                      <span className="font-bold text-[#31283b]">${p.total.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={`${tarjeta} p-5 md:p-6`}>
              <h2 className="text-lg font-bold text-[#31283b] mb-4">Mejores referidos</h2>
              {topRef.length === 0 ? (
                <p className="text-[#5f536a] text-sm bg-[#faf7fb] rounded-xl p-4">
                  Todavía no hay referidos con ventas.
                </p>
              ) : (
                <ul className="divide-y divide-[#f3eef5]">
                  {topRef.map((r, i) => (
                    <li key={r.referidoId} className="flex justify-between items-center gap-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 text-sm font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <p className="font-semibold text-[#31283b] truncate">{r.nombre}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-[#31283b]">${r.ventas.toLocaleString()}</p>
                        <p className="text-xs font-medium text-[#15803d]">Saldo ${r.saldo.toFixed(2)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
