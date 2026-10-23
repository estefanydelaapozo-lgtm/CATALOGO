// src/components/Layout.tsx
// Estructura base de la app: Sidebar + Navbar + contenido (Outlet).
// - Escritorio: el botón del Navbar alterna el Sidebar entre ancho completo (w-64) e iconos (w-20).
// - Móvil: el botón abre/cierra el Sidebar como drawer sobre un overlay oscuro.
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const MOBILE_BREAKPOINT = 768; // coincide con 'md' de Tailwind

const isMobile = (): boolean => window.innerWidth < MOBILE_BREAKPOINT;

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Un único botón: en móvil abre/cierra el drawer, en escritorio colapsa el sidebar
  const toggleSidebar = () => {
    if (isMobile()) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  const closeMobileMenu = () => setIsMobileOpen(false);

  // Si se achica la ventana o se gira el dispositivo, cerramos el drawer
  useEffect(() => {
    const onResize = () => {
      if (!isMobile()) setIsMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Cerrar el drawer con la tecla Escape
  useEffect(() => {
    if (!isMobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobileOpen]);

  return (
    <div className="flex h-[100dvh] bg-gradient-to-br from-[#faf6fc] via-[#faf6fc] to-[#f2fafe] overflow-hidden">
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        closeMobileMenu={closeMobileMenu}
      />

      {/* Overlay oscuro: solo en móvil, cuando el drawer está abierto */}
      {isMobileOpen && (
        <div
          onClick={closeMobileMenu}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Área de contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
