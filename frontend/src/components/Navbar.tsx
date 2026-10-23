// Cabecera: menú, marca, buscador con sugerencias, carrito, usuario y selector de catálogo.
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import SearchSuggest from "./SearchSuggest";
import Logo from "./Logo";

interface NavbarProps { toggleSidebar: () => void }

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const { totalItems } = useCart();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const salir = () => { logout(); navigate("/login"); };

  return (
    <header className="relative z-40 bg-[#faf6fc]/90 backdrop-blur-md border-b border-[#e6dfea]/70">
      <div className="h-16 px-4 md:px-8 flex items-center gap-3 md:gap-6">
        <button onClick={toggleSidebar} aria-label="Alternar menú" className="p-2 -ml-2 rounded-full hover:bg-[#e6dfea]/70 text-[#473d52] transition">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h10M4 17h16" />
          </svg>
        </button>
        <Link to="/tienda" className="hidden sm:block"><Logo /></Link>

        <div className="flex-1 flex justify-center"><SearchSuggest /></div>

        <Link to="/carrito" aria-label="Carrito" className="relative p-2 rounded-full hover:bg-[#e6dfea]/70 transition">
          <svg className="w-6 h-6 text-[#473d52]" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 8h12l-1 11H7L6 8zM9 8a3 3 0 016 0" /></svg>
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-[#82285f] text-white text-[11px] font-bold min-w-5 h-5 px-1 flex items-center justify-center rounded-full">
              {totalItems}
            </span>
          )}
        </Link>

        <div className="relative group pb-2 -mb-2">
          <button className="w-9 h-9 rounded-full bg-[#1f1727] text-white font-semibold text-sm uppercase flex items-center justify-center" aria-label="Menú de usuario">
            {user?.email?.[0] ?? "?"}
          </button>
          <div className="absolute right-0 top-full w-56 bg-white ring-1 ring-[#e6dfea] rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f3eef5]">
              <p className="text-sm font-semibold text-[#31283b] truncate">{user?.email}</p>
              <p className="text-xs uppercase tracking-wide text-[#82285f] font-semibold">{user?.rol}</p>
            </div>
            <button onClick={salir} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-[#473d52] hover:bg-[#f8f3fc] transition">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
