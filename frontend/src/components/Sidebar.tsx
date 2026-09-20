import { NavLink } from 'react-router-dom';
import { CatalogIcon, CloseIcon, DashboardIcon, LogoIcon, NetworkIcon } from './Icons';

interface Props {
  /** Escritorio: true => ancho de 80px y solo iconos */
  isCollapsed: boolean;
  /** Móvil: true => el panel lateral está visible sobre el contenido */
  isMobileOpen?: boolean;
  /** Móvil: cierra el panel (fondo oscuro, botón X o al elegir una opción) */
  onCloseMobile?: () => void;
}

const enlaces = [
  { to: '/', label: 'Dashboard', Icono: DashboardIcon },
  { to: '/catalogo', label: 'Catálogo', Icono: CatalogIcon },
  { to: '/mi-red', label: 'Mi Red', Icono: NetworkIcon },
];

const Sidebar = ({ isCollapsed, isMobileOpen = false, onCloseMobile }: Props) => {
  return (
    <>
      {/* Fondo oscuro: solo existe en móvil, cierra el panel al tocarlo */}
      <div
        className={`fixed inset-0 z-30 bg-slate-900/50 transition-opacity duration-200 md:hidden ${
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/*
        Móvil (< md): panel fijo de 256px que se desliza desde la izquierda y siempre muestra texto.
        Escritorio (>= md): columna estática; 80px (w-20) si isCollapsed, 256px (w-64) si no.
      */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 bg-slate-500 text-white flex flex-col
          transition-[transform,width] duration-200
          md:static md:translate-x-0 ${isCollapsed ? 'md:w-20' : 'md:w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          className={`h-16 px-5 flex items-center gap-3 border-b border-slate-700 overflow-hidden ${
            isCollapsed ? 'md:justify-center md:px-0' : ''
          }`}
        >
          <LogoIcon className="w-7 h-7 shrink-0" />
          <span
            className={`text-xl font-bold whitespace-nowrap ${isCollapsed ? 'md:hidden' : ''}`}
          >
            MultiCatálogo
          </span>
          <button
            onClick={onCloseMobile}
            className="ml-auto p-2 -mr-2 rounded hover:bg-slate-600 md:hidden"
            aria-label="Cerrar menú"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {enlaces.map(({ to, label, Icono }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onCloseMobile}
              title={label}
              aria-label={label}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded transition ${
                  isActive ? 'bg-slate-800' : 'hover:bg-slate-800'
                } ${isCollapsed ? 'md:justify-center' : ''}`
              }
            >
              <Icono className="w-6 h-6 shrink-0" />
              <span className={`whitespace-nowrap ${isCollapsed ? 'md:hidden' : ''}`}>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
