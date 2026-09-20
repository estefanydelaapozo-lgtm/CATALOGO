import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { CartIcon, LogoutIcon, MenuIcon } from './Icons';

const Navbar = () => {
  const { totalItems } = useCart();
  const { logout, userEmail } = useAuth();
  const { toggleSidebar } = useLayout();
  const navigate = useNavigate();

  // Menú de usuario: se abre con clic/toque (el "hover" no existe en celulares)
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cerrarSiEsFuera = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', cerrarSiEsFuera);
    document.addEventListener('touchstart', cerrarSiEsFuera);
    return () => {
      document.removeEventListener('mousedown', cerrarSiEsFuera);
      document.removeEventListener('touchstart', cerrarSiEsFuera);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between gap-2 px-4 md:px-8">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Botón de Toggle: colapsa/expande el Sidebar (en móvil abre/cierra el panel) */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-full hover:bg-slate-100 transition text-slate-600"
          title="Mostrar u ocultar menú"
          aria-label="Mostrar u ocultar menú"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        <h2 className="text-slate-600 font-medium text-base md:text-lg truncate">
          Panel de Administración
        </h2>
      </div>

      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        <Link
          to="/carrito"
          className="relative p-2 hover:bg-slate-100 rounded-full transition text-slate-600"
          aria-label="Carrito de compras"
        >
          <CartIcon className="w-6 h-6" />
          {totalItems > 0 && (
            <span className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full transform translate-x-1 -translate-y-1">
              {totalItems}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-4">
          {/* El correo se oculta en pantallas pequeñas (aparece dentro del menú de usuario) */}
          <span className="hidden md:inline text-sm text-slate-500">{userEmail}</span>

          <div ref={menuRef} className="relative">
            {/* Círculo del usuario / Avatar */}
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300 flex items-center justify-center"
              aria-label="Menú de usuario"
              aria-expanded={menuOpen}
            >
              {/*
                NOTA PARA LA API:
                Aquí reemplazarás el 'src' quemado por la variable de tu estado,
                por ejemplo: src={userAvatar || defaultImage}
              */}
              <img
                src="https://fastly.picsum.photos/id/64/4326/2884.jpg?hmac=9_SzX666YRpR_fOyYStXpfSiJ_edO3ghlSRnH2w09Kg"
                alt="Avatar del usuario"
                className="w-full h-full object-cover"
              />
            </button>

            {/* Menú desplegable */}
            <div
              className={`absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg transition-all duration-200 z-50 ${
                menuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
              }`}
            >
              <p className="md:hidden px-4 py-2 text-xs text-slate-500 truncate border-b border-slate-100">
                {userEmail}
              </p>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-red-600 font-semibold hover:bg-red-50 rounded-md transition-colors"
              >
                <LogoutIcon className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
