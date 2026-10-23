import { createContext, useContext, useState, type ReactNode } from "react";
import { catalogos, type Catalogo } from "../data/catalogos";

const KEY = "multicatalogo_activo";
interface Ctx { activo: Catalogo; setActivo: (id: string) => void }
const CatalogCtx = createContext<Ctx | null>(null);

export const CatalogProvider = ({ children }: { children: ReactNode }) => {
  const [id, setId] = useState<string>(() => {
    try { return localStorage.getItem(KEY) ?? "todo"; } catch { return "todo"; }
  });
  const activo = catalogos.find((c) => c.id === id) ?? catalogos[0];
  const setActivo = (nuevo: string) => {
    setId(nuevo);
    try { localStorage.setItem(KEY, nuevo); } catch { /* sin almacenamiento */ }
  };
  return <CatalogCtx.Provider value={{ activo, setActivo }}>{children}</CatalogCtx.Provider>;
};

export const useCatalog = (): Ctx => {
  const ctx = useContext(CatalogCtx);
  if (!ctx) throw new Error("useCatalog debe usarse dentro de CatalogProvider");
  return ctx;
};
