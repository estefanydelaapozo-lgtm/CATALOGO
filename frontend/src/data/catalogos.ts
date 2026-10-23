// Multicatálogo: cada catálogo es una colección con identidad propia que agrupa categorías.
// Se resuelve en el frontend, así la API de productos no cambia.
import type { Producto } from "./productos";

export interface Catalogo {
  id: string;
  nombre: string;
  lema: string;
  emoji: string;
  categorias: string[]; // vacío = todas
  grad: string;         // clases literales para que Tailwind las detecte
}

export const catalogos: Catalogo[] = [
  { id: "todo", nombre: "Todo", lema: "Toda la colección", emoji: "✦", categorias: [], grad: "from-[#e6dfea] to-[#f3eef5]" },
  { id: "glow", nombre: "Glow", lema: "Luminosidad y antiedad", emoji: "☀️", categorias: ["Serum", "Crema", "Solar"], grad: "from-[#dfcbf0] to-rose-100" },
  { id: "pure", nombre: "Pure", lema: "Limpieza y renovación", emoji: "🌿", categorias: ["Tónico", "Mascarilla", "Limpiador"], grad: "from-[#c3e7f8] to-[#efe5f8]" },
  { id: "sets", nombre: "Sets", lema: "Rutinas y regalos", emoji: "🎁", categorias: ["Kit"], grad: "from-[#c9a6e4] to-[#e0f3fc]" },
];

export const enCatalogo = (c: Catalogo, p: Producto): boolean =>
  c.categorias.length === 0 || c.categorias.includes(p.categoria);

// Normaliza texto (sin tildes, minúsculas) para búsquedas tolerantes
export const norm = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
