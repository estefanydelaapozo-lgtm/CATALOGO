// /admin/productos — CRUD admin (borrado lógico)
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '../services/http';
import Paginador from './Paginador';

const LIMITE = 20;

interface ProductoAdmin {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  img: string;
  galeria: string[];
  stock: number;
  activo: boolean;
}

interface Pagina {
  data: ProductoAdmin[];
  page: number;
  limit: number;
  total: number;
}

const vacio = {
  nombre: '',
  descripcion: '',
  precio: 0,
  categoria: '',
  img: 'https://picsum.photos/seed/nuevo/600',
  stock: 100,
};

const AdminProductos = () => {
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(vacio);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async (busqueda = q, pg = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMITE) });
      if (busqueda) params.set('q', busqueda);
      const data = await apiFetch<Pagina>(`/api/admin/productos?${params}`);
      setPagina(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirCrear = () => {
    setEditId(null);
    setForm(vacio);
    setShowForm(true);
  };

  const abrirEditar = (p: ProductoAdmin) => {
    setEditId(p.id);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      categoria: p.categoria,
      img: p.img,
      stock: p.stock,
    });
    setShowForm(true);
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await apiFetch(`/api/productos/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch('/api/productos', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (p: ProductoAdmin) => {
    const ok = window.confirm(
      p.activo
        ? `¿Desactivar «${p.nombre}»? Dejará de verse en el catálogo.`
        : `¿Reactivar «${p.nombre}»?`
    );
    if (!ok) return;
    try {
      if (p.activo) {
        await apiFetch(`/api/productos/${p.id}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/api/productos/${p.id}/activar`, { method: 'PATCH' });
      }
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado');
    }
  };

  const lista = pagina?.data ?? [];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[#1f1727]">Productos</h1>
        <button
          type="button"
          onClick={abrirCrear}
          className="bg-[#82285f] text-white font-semibold px-4 py-3 rounded-lg min-h-[44px] hover:bg-[#6a1f4d]"
        >
          + Nuevo producto
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border border-[#d3c9d9] rounded-lg px-3 py-3 min-h-[44px]"
          placeholder="Buscar por nombre o categoría…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          onKeyDown={(e) => e.key === 'Enter' && void cargar(q, 1)}
        />
        <button
          type="button"
          onClick={() => {
            setPage(1);
            void cargar(q, 1);
          }}
          className="border border-[#d3c9d9] px-4 rounded-lg min-h-[44px] hover:bg-[#faf7fb]"
        >
          Buscar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={guardar}
          className="bg-white border border-[#e6dfea] rounded-lg p-4 mb-6 space-y-3"
        >
          <h2 className="font-bold text-[#31283b]">
            {editId ? `Editar #${editId}` : 'Nuevo producto'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              className="border rounded-lg px-3 py-3 min-h-[44px]"
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
            <input
              required
              className="border rounded-lg px-3 py-3 min-h-[44px]"
              placeholder="Categoría"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            />
            <input
              required
              type="number"
              min={0.01}
              step={0.01}
              className="border rounded-lg px-3 py-3 min-h-[44px]"
              placeholder="Precio"
              value={form.precio || ''}
              onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })}
            />
            <input
              type="number"
              min={0}
              className="border rounded-lg px-3 py-3 min-h-[44px]"
              placeholder="Stock"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
            />
            <input
              className="border rounded-lg px-3 py-3 min-h-[44px] sm:col-span-2"
              placeholder="URL imagen"
              value={form.img}
              onChange={(e) => setForm({ ...form, img: e.target.value })}
            />
            <textarea
              className="border rounded-lg px-3 py-3 sm:col-span-2"
              placeholder="Descripción"
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#82285f] text-white px-4 py-3 rounded-lg min-h-[44px] font-semibold disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border px-4 py-3 rounded-lg min-h-[44px]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-[#7d6f87]">Cargando…</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-[#e6dfea] rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-[#faf7fb] text-left text-[#5f536a]">
              <tr>
                <th className="p-3">Img</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} className="border-t border-[#f3eef5]">
                  <td className="p-3">
                    <img src={p.img} alt="" className="w-12 h-12 object-cover rounded" />
                  </td>
                  <td className="p-3 font-medium text-[#31283b]">{p.nombre}</td>
                  <td className="p-3 text-[#5f536a]">{p.categoria}</td>
                  <td className="p-3">${p.precio.toFixed(2)}</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        p.activo ? 'bg-green-100 text-green-700' : 'bg-[#e6dfea] text-[#5f536a]'
                      }`}
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-3 space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => abrirEditar(p)}
                      className="text-[#82285f] font-medium min-h-[44px] px-2"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActivo(p)}
                      className="text-[#5f536a] font-medium min-h-[44px] px-2"
                    >
                      {p.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#7d6f87]">
                    No hay productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {pagina && (
        <>
          <p className="text-xs text-[#7d6f87] mt-2">
            {pagina.total} producto(s) en total
          </p>
          <Paginador
            page={pagina.page}
            limit={pagina.limit}
            total={pagina.total}
            disabled={loading}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
};

export default AdminProductos;
