// Tienda: hero del catálogo activo, selector de catálogos, destacados y sugerencias.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCatalog } from "../context/CatalogContext";
import { getProductos } from "../services/productosService";
import { catalogos, enCatalogo } from "../data/catalogos";
import type { Producto } from "../data/productos";
import ProductCard from "./ProductCard";
import Sugeridos from "./Sugeridos";

const Storefront = () => {
  const { user } = useAuth();
  const { activo, setActivo } = useCatalog();
  const nav = useNavigate();
  const [todos, setTodos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProductos().then(setTodos).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const destacados = todos.filter((p) => enCatalogo(activo, p)).slice(0, 4);
  const abrir = (id: string) => { setActivo(id); nav("/catalogo"); };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <section className={`rounded-3xl bg-gradient-to-br ${activo.grad} p-8 md:p-14 grid md:grid-cols-2 gap-10 items-center overflow-hidden relative`}>
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-[#c3e7f8]/70 blur-3xl" />
        <div className="relative">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-widest text-[#5f536a] mb-4">
            Catálogo {activo.nombre}
          </p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] text-[#1f1727] mb-5">
            Cosmética que se comparte.
          </h1>
          <p className="text-[#473d52] text-lg mb-8 max-w-md">
            {activo.lema}. Descubre fórmulas pensadas para tu rutina y construye ingresos con tu red de referidos.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/catalogo" className="bg-[#1f1727] text-white font-semibold px-7 py-3.5 rounded-full hover:bg-[#82285f] transition">
              Ver catálogo
            </Link>
            {user?.rol === "admin" && (
              <Link to="/mi-red" className="font-semibold px-7 py-3.5 rounded-full ring-1 ring-[#1f1727]/20 hover:bg-white/60 transition">
                Mi red
              </Link>
            )}
          </div>
        </div>
        <div className="hidden md:grid grid-cols-2 gap-4">
          {todos.slice(0, 4).map((p, k) => (
            <img key={p.id} src={p.img} alt={p.nombre} className={`rounded-3xl aspect-square object-cover shadow-xl shadow-[#1f1727]/10 ${k % 2 ? "translate-y-6" : ""}`} />
          ))}
        </div>
      </section>

      {/* Beneficios */}
      <section className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm font-semibold text-[#5f536a]">
        {["Fórmulas dermatológicas", "Envíos a todo el país", "Comisiones hasta 3 niveles"].map((t) => (
          <p key={t} className="bg-white/80 rounded-full ring-1 ring-[#efe5f8] px-5 py-3 text-center"><span className="inline-block w-2 h-2 rounded-full bg-[#78c1e6] mr-2" />{t}</p>
        ))}
      </section>

      {/* Elige tu catálogo */}
      <section className="mt-14">
        <h2 className="font-display text-2xl md:text-3xl text-[#1f1727] mb-6">Elige tu catálogo</h2>
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {catalogos.filter((c) => c.id !== "todo").map((c, k) => (
            <button key={c.id} onClick={() => abrir(c.id)} className={`text-left rounded-2xl bg-gradient-to-br ${c.grad} p-6 hover:-translate-y-1 hover:shadow-lg transition`}>
              <span className="text-xs font-semibold tracking-widest text-[#5f536a]/80">0{k + 1}</span>
              <h3 className="font-display text-3xl text-[#1f1727] mt-8">{c.nombre}</h3>
              <p className="text-sm text-[#473d52] mt-1">{c.lema}</p>
              <p className="text-xs font-semibold text-[#5f536a] mt-4">
                {todos.filter((p) => enCatalogo(c, p)).length} productos →
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Destacados */}
      <section className="mt-14">
        <h2 className="font-display text-2xl md:text-3xl text-[#1f1727] mb-6">Destacados de {activo.nombre}</h2>
        {loading ? (
          <p className="text-[#7d6f87]">Cargando…</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {destacados.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      <Sugeridos titulo="Descubre en otros catálogos" otros />

      {/* Plan multinivel */}
      <section className="mt-14 mb-6 rounded-3xl bg-[#1f1727] text-white p-8 md:p-12">
        <h2 className="font-display text-2xl md:text-3xl mb-8">Compra, invita y gana</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["1", "Explora y compra", "Elige tus favoritos en cualquiera de los catálogos."],
            ["2", "Invita a tu red", "Comparte tu enlace: cada invitado suma un nivel."],
            ["3", "Gana comisiones", "10 %, 5 % y 2 % de las ventas de tus niveles 1, 2 y 3."],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span className="w-9 h-9 rounded-full bg-[#9c4a9e] font-bold flex items-center justify-center mb-3">{n}</span>
              <h3 className="font-semibold mb-1">{t}</h3>
              <p className="text-sm text-[#d3c9d9]">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Storefront;
