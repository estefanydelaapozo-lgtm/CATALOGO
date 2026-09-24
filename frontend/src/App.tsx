import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Catalogo from './components/Catalogo';
import MiRed from './components/MiRed';
import Carrito from './components/Carrito';
import Login from './components/Login';
import Storefront from './components/Storefront';
import DetalleProducto from './components/DetalleProducto';
import Checkout from './components/Checkout';
import Confirmacion from './components/Confirmacion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LayoutProvider } from './context/LayoutContext';

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const AdminRoute = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.rol !== 'admin') {
    return <Navigate to="/tienda" replace />;
  }

  return <Outlet />;
};

const CartBoundary = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  return <CartProvider key={user?.email ?? 'anonimo'}>{children}</CartProvider>;
};

function App() {
  return (
    <AuthProvider>
      <CartBoundary>
        <LayoutProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Layout />}>
                  <Route element={<AdminRoute />}>
                    <Route index element={<Dashboard />} />
                    <Route path="mi-red" element={<MiRed />} />
                  </Route>

                  <Route path="tienda" element={<Storefront />} />
                  <Route path="catalogo" element={<Catalogo />} />
                  <Route path="producto/:id" element={<DetalleProducto />} />
                  <Route path="carrito" element={<Carrito />} />
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="confirmacion" element={<Confirmacion />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </LayoutProvider>
      </CartBoundary>
    </AuthProvider>
  );
}

export default App;
