import LogoMark from "./LogoMark";
// src/components/Sidebar.tsx
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  closeMobileMenu: () => void;
}

interface NavItem {
  to: string;
  label: string;
  title: string;
  icon: string;
  soloAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    title: "Dashboard",
    soloAdmin: true,
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    to: "/tienda",
    label: "Tienda",
    title: "Tienda",
    icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
  },
  {
    to: "/catalogo",
    label: "Catálogo",
    title: "Catálogo",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  },
  {
    to: "/mi-red",
    label: "Mi Red",
    title: "Mi Red",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    to: "/mis-pedidos",
    label: "Mis pedidos",
    title: "Mis pedidos",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    to: "/admin/productos",
    label: "Gestionar productos",
    title: "Admin productos",
    soloAdmin: true,
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    to: "/admin/pedidos",
    label: "Gestionar pedidos",
    title: "Admin pedidos",
    soloAdmin: true,
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    to: "/admin/usuarios",
    label: "Usuarios",
    title: "Admin usuarios",
    soloAdmin: true,
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    to: "/admin/liquidaciones",
    label: "Liquidaciones",
    title: "Liquidaciones",
    soloAdmin: true,
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

const Sidebar = ({ isCollapsed, isMobileOpen, closeMobileMenu }: SidebarProps) => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const items = NAV_ITEMS.filter((item) => !item.soloAdmin || user?.rol === "admin");

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 flex flex-col
        bg-gradient-to-b from-[#4a1538] via-[#3d112f] to-[#2c0c22]
        text-white shadow-2xl
        transform transition-all duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        w-64
        md:relative md:translate-x-0
        ${isCollapsed ? "md:w-20" : "md:w-64"}
      `}
    >
      {/* Marca */}
      <div
        className={`
          px-4 py-5 border-b border-white/15
          flex items-center gap-3
          ${isCollapsed ? "md:justify-center md:px-2" : ""}
        `}
      >
        <LogoMark size={38} />
        <div className={`${isCollapsed ? "md:hidden" : ""}`}>
          <p className="font-bold text-base leading-tight text-white">MultiCatálogo</p>
          <p className="text-[11px] font-semibold tracking-wider text-[#9fd7f1]">Cosmética SUGGE</p>
        </div>
      </div>

      {/* Navegación: todo siempre visible (texto claro sobre fondo oscuro, el activo va en color, nunca en blanco) */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto" aria-label="Menú principal">
        {items.map((item) => {
          const esActivo =
            item.to === "/"
              ? pathname === "/"
              : pathname === item.to || pathname.startsWith(item.to + "/");

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={closeMobileMenu}
              title={item.title}
              aria-current={esActivo ? "page" : undefined}
              className={`
                group relative flex items-center gap-3
                min-h-[48px] px-3 py-2 rounded-xl
                text-[15px] font-semibold
                outline-none focus-visible:ring-2 focus-visible:ring-[#9fd7f1]
                transition-colors duration-200
                ${isCollapsed ? "md:justify-center md:px-2" : ""}
                ${
                  esActivo
                    ? "bg-gradient-to-r from-[#b17fd3] to-[#9c4a9e] !text-white shadow-lg shadow-black/30 ring-1 ring-white/25"
                    : "!text-[#f3e8f7] hover:bg-white/15 hover:!text-white"
                }
              `}
            >
              {/* Barra indicadora de página actual */}
              {esActivo && (
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-7 rounded-r-full bg-[#9fd7f1]" />
              )}
              <span
                className={`
                  flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0
                  transition-colors duration-200
                  ${
                    esActivo
                      ? "bg-white/25 text-white"
                      : "bg-white/15 text-[#c3e7f8] group-hover:bg-white/25 group-hover:text-white"
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </span>
              <span className={`whitespace-nowrap ${isCollapsed ? "md:hidden" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Usuario */}
      <div
        className={`
          m-3 p-3 rounded-xl
          bg-white/10 border border-white/15
          ${isCollapsed ? "md:p-2" : ""}
        `}
      >
        {isCollapsed ? (
          <p className="text-center text-[11px] font-bold uppercase tracking-wider text-[#9fd7f1]">
            {user?.rol}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#9fd7f1] to-[#b17fd3] flex items-center justify-center text-sm font-bold text-[#2c0c22] shadow">
              {(user?.email?.[0] ?? "U").toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[#f3e8f7] truncate">{user?.email}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#9fd7f1]">
                {user?.rol}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
