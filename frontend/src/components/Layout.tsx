import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useLayout } from '../context/LayoutContext';

const Layout = () => {
  // Estado global (LayoutContext) que controla el colapso del Sidebar
  const { isCollapsed, isMobileOpen, closeMobileSidebar } = useLayout();

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={closeMobileSidebar}
      />
      {/* Área de Contenido Principal (min-w-0 evita que el contenido ensanche la pantalla en móvil) */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
