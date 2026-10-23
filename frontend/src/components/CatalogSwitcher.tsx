import { catalogos } from "../data/catalogos";
import { useCatalog } from "../context/CatalogContext";

const CatalogSwitcher = () => {
  const { activo, setActivo } = useCatalog();
  return (
    <div role="tablist" aria-label="Catálogos" className="inline-flex max-w-full gap-1 p-1 rounded-full bg-[#e6dfea]/60 overflow-x-auto no-scrollbar">
      {catalogos.map((c) => (
        <button
          key={c.id}
          role="tab"
          aria-selected={c.id === activo.id}
          onClick={() => setActivo(c.id)}
          className={`shrink-0 text-sm font-semibold px-4 py-1.5 rounded-full transition ${
            c.id === activo.id ? "bg-white text-[#1f1727] shadow-sm" : "text-[#7d6f87] hover:text-[#31283b]"
          }`}
        >
          {c.nombre}
        </button>
      ))}
    </div>
  );
};

export default CatalogSwitcher;
