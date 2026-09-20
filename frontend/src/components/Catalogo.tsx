import { useEffect, useState } from 'react';
import { useCart, type Producto } from '../context/CartContext';
import { getProductos } from '../services/api';

const Catalogo = () => {
  const { addToCart } = useCart();

  // Estados para consumir la API: datos, carga y error
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  // Contador para poder reintentar la carga sin recargar la página
  const [reintentos, setReintentos] = useState<number>(0);

  // GET /api/productos: se ejecuta al montar el componente y cada vez que se pulsa "Reintentar"
  useEffect(() => {
    let cancelado = false; // evita actualizar el estado si el componente ya se desmontó

    getProductos()
      .then((data) => {
        if (!cancelado) setProductos(data);
      })
      .catch((err: unknown) => {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos');
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [reintentos]);

  const handleReintentar = () => {
    setError('');
    setLoading(true);
    setReintentos((n) => n + 1);
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6">Catálogo de Productos</h1>

      {loading && (
        <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center">
          <p className="text-slate-500">Cargando productos...</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 text-red-600 p-6 rounded-lg border border-red-200 text-center">
          <p className="mb-4">{error}</p>
          <button
            onClick={handleReintentar}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && productos.length === 0 && (
        <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center">
          <p className="text-slate-500">No hay productos disponibles.</p>
        </div>
      )}

      {!loading && !error && productos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {productos.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm flex flex-col"
            >
              <img src={prod.img} alt={prod.nombre} className="w-full h-40 object-cover" />
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-slate-700">{prod.nombre}</h3>
                <p className="text-indigo-600 font-bold mt-2 mb-4">${prod.precio.toFixed(2)}</p>
                <button
                  onClick={() => addToCart(prod)}
                  className="mt-auto w-full bg-slate-900 text-white py-2 rounded text-sm hover:bg-indigo-600 transition"
                >
                  Añadir al Carrito
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalogo;
