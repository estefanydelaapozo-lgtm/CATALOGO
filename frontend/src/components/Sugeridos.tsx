// Sugerencias de productos. Con `base`: relacionados (misma categoría y precio cercano).
// Sin `base`: del catálogo activo, o de los otros catálogos si `otros` es true.
import { useEffect, useState } from "react";
import { getProductos } from "../services/productosService";
import { enCatalogo } from "../data/catalogos";
import { useCatalog } from "../context/CatalogContext";
import type { Producto } from "../data/productos";
import ProductCard from "./ProductCard";

interface Props { base?: Producto; titulo?: string; max?: number; otros?: boolean }

const Sugeridos = ({ base, titulo = "Te puede gustar", max = 4, otros = false }: Props) => {
  const { activo } = useCatalog();
  const [todos, setTodos] = useState<Producto[]>([]);
  useEffect(() => { getProductos().then(setTodos).catch(() => {}); }, []);

  let lista = todos.filter((p) => p.id !== base?.id);
  if (base) {
    const score = (p: Producto) => (p.categoria === base.categoria ? 100 : 0) - Math.abs(p.precio - base.precio);
    lista = [...lista].sort((a, b) => score(b) - score(a));
  } else {
    const filtrada = lista.filter((p) => (otros ? !enCatalogo(activo, p) : enCatalogo(activo, p)));
    if (filtrada.length > 0) lista = filtrada;
  }
  lista = lista.slice(0, max);
  if (lista.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl md:text-3xl text-[#1f1727] mb-6">{titulo}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {lista.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
};

export default Sugeridos;
