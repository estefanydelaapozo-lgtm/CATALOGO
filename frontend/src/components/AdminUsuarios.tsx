// /admin/usuarios — listado de usuarios (solo administrador): búsqueda, rol, estado y paginación.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '../services/http';
import Paginador from './Paginador';

interface UsuarioAdmin {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  codigo: string;
  creadoEn: string;
}

interface Pagina {
  data: UsuarioAdmin[];
  page: number;
  limit: number;
  total: number;
}

const LIMITE = 10;

const fecha = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
};

const AdminUsuarios = () => {
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMITE) });
      if (q) params.set('q', q);
      setPagina(await apiFetch<Pagina>(`/api/admin/usuarios?${params.toString()}`));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError('El servidor todavía no tiene el módulo de usuarios. Reinicia el backend para aplicar la última versión.');
      } else if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setError('Tu sesión no tiene permiso para ver usuarios. Inicia sesión con una cuenta de administrador.');
      } else if (e instanceof ApiError) {
        setError('No se pudieron cargar los usuarios. Intenta de nuevo en unos segundos.');
      } else {
        setError('No se pudo conectar con el servidor.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(busqueda.trim());
  };

  const lista = pagina?.data ?? [];

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#31283b]">Usuarios</h1>
          <p className="text-sm text-[#5f536a] mt-1">
            {pagina ? `${pagina.total} usuario${pagina.total === 1 ? '' : 's'} registrado${pagina.total === 1 ? '' : 's'}` : 'Cuentas registradas en la plataforma.'}
          </p>
        </div>
        <form onSubmit={buscar} className="flex gap-2 w-full sm:w-auto">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar usuarios"
            className="flex-1 sm:w-72 px-4 py-2.5 rounded-xl border border-[#d3c9d9] bg-white text-[#1f1727] placeholder:text-[#7d6f87] focus:ring-4 focus:ring-[#c9a6e4]/40 focus:border-[#9c4a9e] outline-none transition"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#82285f] text-white font-semibold hover:bg-[#6a1f4d] transition"
          >
            Buscar
          </button>
        </form>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#e6dfea] shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-[#5f536a]">Cargando usuarios…</p>
        ) : lista.length === 0 ? (
          <p className="p-6 text-[#5f536a]">
            {q ? `No hay usuarios que coincidan con «${q}».` : 'Todavía no hay usuarios registrados.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#faf7fb] text-[#5f536a]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Usuario</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Rol</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Código de referido</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Registro</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3eef5]">
                {lista.map((u) => (
                  <tr key={u.id} className="hover:bg-[#faf7fb]/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-[#efe5f8] text-[#6a1f4d] font-bold flex items-center justify-center shrink-0 uppercase">
                          {(u.nombre || u.email)[0]}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#31283b] truncate">{u.nombre || 'Sin nombre'}</p>
                          <p className="text-xs text-[#5f536a] truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          u.rol === 'admin' ? 'bg-[#82285f] text-white' : 'bg-[#e0f3fc] text-[#245f7e]'
                        }`}
                      >
                        {u.rol === 'admin' ? 'Administrador' : 'Cliente'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#473d52] font-medium">{u.codigo || '—'}</td>
                    <td className="px-5 py-3 text-[#473d52] whitespace-nowrap">{fecha(u.creadoEn)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          u.activo ? 'bg-green-100 text-green-800' : 'bg-[#e6dfea] text-[#473d52]'
                        }`}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagina && (
        <Paginador page={pagina.page} limit={pagina.limit} total={pagina.total} onChange={setPage} disabled={loading} />
      )}
    </div>
  );
};

export default AdminUsuarios;
