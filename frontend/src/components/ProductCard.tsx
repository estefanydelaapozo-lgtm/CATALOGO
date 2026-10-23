import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import type { Producto } from "../data/productos";

const ProductCard = ({ p }: { p: Producto }) => {
  const { addToCart } = useCart();
  return (
    <article className="group bg-white rounded-3xl overflow-hidden ring-1 ring-[#e6dfea]/80 hover:ring-[#c9a6e4] hover:shadow-xl hover:shadow-[#451635]/5 transition flex flex-col">
      <Link to={`/producto/${p.id}`} className="relative block aspect-square overflow-hidden bg-[#f3eef5]">
        <img src={p.img} alt={p.nombre} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
        <span className="absolute top-3 left-3 text-[11px] font-semibold tracking-wide uppercase bg-white/90 text-[#473d52] px-2.5 py-1 rounded-full">
          {p.categoria}
        </span>
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link to={`/producto/${p.id}`} className="font-display text-lg leading-snug text-[#1f1727] hover:text-[#82285f] transition">
          {p.nombre}
        </Link>
        <div className="mt-auto pt-4 flex items-center justify-between">
          <span className="text-lg font-bold text-[#1f1727]">${p.precio.toFixed(2)}</span>
          <button onClick={() => addToCart(p)} className="text-sm font-semibold bg-[#1f1727] text-white px-4 py-2 rounded-full hover:bg-[#82285f] transition">
            Añadir
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
