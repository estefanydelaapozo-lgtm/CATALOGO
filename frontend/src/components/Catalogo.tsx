// Catálogo del multicatálogo activo: búsqueda (?q=), categorías (?categoria=), orden y sugerencias.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCatalog } from "../context/CatalogContext";
import { getProductos } from "../services/productosService";
import { enCatalogo, norm } from "../data/catalogos";
import { categorias, type Producto } from "../data/productos";
import ProductCard from "./ProductCard";
import Sugeridos from "./Sugeridos";
import CatalogSwitcher from "./CatalogSwitcher";

const Catalogo = () => {
  const { activo } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [todos, setTodos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orden, setOrden] = useState("relevancia");

  const q = params.get("q") ?? "";
  const visibles = activo.categorias.length ? activo.categorias : categorias;
  const catParam = params.get("categoria") ?? "Todas";
  const categoria = visibles.includes(catParam) ? catParam : "Todas";

  useEffect(() => {
    getProductos()
      .then(setTodos)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v && v !== "Todas") n.set(k, v); else n.delete(k);
    setParams(n, { replace: true });
  };

  const lista = useMemo(() => {
    const t = norm(q.trim());
    const r = todos.filter(
      (p) =>
        enCatalogo(activo, p) &&
        (categoria === "Todas" || p.categoria === categoria) &&
        (!t || norm(`${p.nombre} ${p.descripcion} ${p.categoria}`).includes(t))
    );
    if (orden === "precio-asc") r.sort((a, b) => a.precio - b.precio);
    if (orden === "precio-desc") r.sort((a, b) => b.precio - a.precio);
    if (orden === "nombre") r.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return r;
  }, [todos, activo, categoria, q, orden]);

  if (loading) return <p className="text-center p-8 text-[#7d6f87]">Cargando catálogo…</p>;
  if (error) return <p className="text-center p-8 text-[#6a1f4d]">{error}</p>;

  return (
    <div className="max-w-6xl mx-auto">
      <CatalogSwitcher />
      <p className="text-xs font-semibold uppercase tracking-widest text-[#82285f] mt-8">Catálogo {activo.nombre}</p>
      <h1 className="font-display text-3xl md:text-5xl text-[#1f1727] mt-2">{activo.lema}</h1>
      <p className="text-[#7d6f87] mt-2 mb-8">
        {lista.length} producto(s){q && <> para «{q}»</>}
      </p>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Filtrar este catálogo…"
          className="flex-1 px-5 py-3 rounded-full bg-white ring-1 ring-[#e6dfea] focus:ring-2 focus:ring-[#9c4a9e] outline-none transition"
        />
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          aria-label="Ordenar"
          className="px-5 py-3 rounded-full bg-white ring-1 ring-[#e6dfea] focus:ring-2 focus:ring-[#9c4a9e] outline-none"
        >
          <option value="relevancia">Relevancia</option>
          <option value="precio-asc">Precio: menor a mayor</option>
          <option value="precio-desc">Precio: mayor a menor</option>
          <option value="nombre">Nombre A–Z</option>
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8">
        {["Todas", ...visibles].map((c) => (
          <button
            key={c}
            onClick={() => setParam("categoria", c)}
            className={`shrink-0 text-sm font-semibold px-4 py-1.5 rounded-full ring-1 transition ${
              c === categoria ? "bg-[#82285f] text-white ring-[#82285f]" : "bg-white text-[#5f536a] ring-[#e6dfea] hover:ring-[#c9a6e4]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-[#e6dfea] p-10 text-center">
          <p className="text-[#5f536a]">No encontramos productos con esa búsqueda.</p>
          <button onClick={() => setParams({}, { replace: true })} className="mt-3 font-semibold text-[#82285f] hover:underline">
            Limpiar filtros
          </button>
          <Sugeridos titulo="Quizá te interese" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {lista.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
};

export default Catalogo;
