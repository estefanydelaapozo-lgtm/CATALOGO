// src/context/LayoutContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

interface LayoutContextType {
  /** Escritorio: true = Sidebar reducido a 80px (solo iconos) */
  isCollapsed: boolean;
  /** Móvil: true = Sidebar visible como panel deslizante */
  isMobileOpen: boolean;
  /** Botón "Toggle" del Navbar: colapsa (escritorio) o abre/cierra el panel (móvil) */
  toggleSidebar: () => void;
  closeMobileSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout debe ser usado dentro de un LayoutProvider');
  }
  return context;
};

// Debe coincidir con el breakpoint `md` de Tailwind (768px)
const DESKTOP_QUERY = '(min-width: 768px)';

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const toggleSidebar = () => {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      setIsCollapsed((prev) => !prev);
    } else {
      setIsMobileOpen((prev) => !prev);
    }
  };

  const closeMobileSidebar = () => setIsMobileOpen(false);

  return (
    <LayoutContext.Provider
      value={{ isCollapsed, isMobileOpen, toggleSidebar, closeMobileSidebar }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
