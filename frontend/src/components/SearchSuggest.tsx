// Buscador con sugerencias en vivo: productos coincidentes (teclado: ↑ ↓ Enter Esc) y búsquedas populares.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getProductos } from "../services/productosService";
import { norm } from "../data/catalogos";
import type { Producto } from "../data/productos";

const POPULARES = ["Serum", "Retinol", "Hidratante", "Kit"];

const SearchSuggest = () => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(-1);
  const [todos, setTodos] = useState<Producto[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (open && todos.length === 0) getProductos().then(setTodos).catch(() => {});
  }, [open, todos.length]);

  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const res = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return [];
    return todos.filter((p) => norm(`${p.nombre} ${p.categoria} ${p.descripcion}`).includes(t)).slice(0, 5);
  }, [q, todos]);

  const buscar = (texto: string) => { setOpen(false); setI(-1); nav(`/catalogo?q=${encodeURIComponent(texto)}`); };
  const abrir = (p: Producto) => { setOpen(false); setI(-1); setQ(""); nav(`/producto/${p.id}`); };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, res.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, -1)); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Enter") { if (res[i]) abrir(res[i]); else if (q.trim()) buscar(q.trim()); }
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setI(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder="Buscar productos…"
        aria-label="Buscar productos"
        className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white ring-1 ring-[#e6dfea] shadow-sm focus:ring-2 focus:ring-[#9c4a9e] outline-none text-sm transition"
      />
      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a99bb2] pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M20 20l-3.5-3.5" /></svg>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl ring-1 ring-[#e6dfea] overflow-hidden z-50">
          {q.trim() === "" ? (
            <div className="p-4">
              <p className="text-xs uppercase tracking-wide text-[#a99bb2] mb-2">Búsquedas populares</p>
              <div className="flex flex-wrap gap-2">
                {POPULARES.map((t) => (
                  <button key={t} onClick={() => buscar(t)} className="text-sm px-3 py-1 rounded-full bg-[#f3eef5] hover:bg-[#efe5f8] transition">{t}</button>
                ))}
              </div>
            </div>
          ) : res.length === 0 ? (
            <p className="p-4 text-sm text-[#7d6f87]">Sin coincidencias para «{q}»</p>
          ) : (
            <ul>
              {res.map((p, k) => (
                <li key={p.id}>
                  <button
                    onClick={() => abrir(p)}
                    onMouseEnter={() => setI(k)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${k === i ? "bg-[#f8f3fc]" : ""}`}
                  >
                    <img src={p.img} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-[#31283b] truncate">{p.nombre}</span>
                      <span className="block text-xs text-[#7d6f87]">{p.categoria}</span>
                    </span>
                    <span className="text-sm font-bold text-[#31283b]">${p.precio.toFixed(2)}</span>
                  </button>
                </li>
              ))}
              <li>
                <button onClick={() => buscar(q.trim())} className="w-full px-4 py-2.5 text-sm font-semibold text-[#82285f] hover:bg-[#f8f3fc] text-left border-t border-[#f3eef5]">
                  Ver todos los resultados de «{q.trim()}»
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchSuggest;
