// Paginador reutilizable (mobile-first): Anterior / «Página X de Y» / Siguiente.
// Se alimenta del contrato estándar del backend: { data, page, limit, total }.
interface PaginadorProps {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}

const Paginador = ({ page, limit, total, onChange, disabled = false }: PaginadorProps) => {
  const totalPaginas = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  if (total <= limit) return null; // una sola página: nada que paginar

  const btn =
    "px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] border border-[#e6dfea] bg-white text-[#473d52] hover:bg-[#faf7fb] disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <nav
      className="flex items-center justify-between gap-2 mt-4"
      aria-label="Paginación"
    >
      <button
        type="button"
        className={btn}
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ← Anterior
      </button>
      <span className="text-sm text-[#5f536a] text-center">
        Página {page} de {totalPaginas}
        <span className="hidden sm:inline"> · {total} en total</span>
      </span>
      <button
        type="button"
        className={btn}
        disabled={disabled || page >= totalPaginas}
        onClick={() => onChange(page + 1)}
      >
        Siguiente →
      </button>
    </nav>
  );
};

export default Paginador;
