// src/components/Confirmacion.tsx
// Pantalla de confirmación de pedido (Tema 5):
// - Lee los datos del pedido enviados desde Checkout (location.state)
// - Muestra el número de pedido y el resumen
import { Link, useLocation } from 'react-router-dom';

interface PedidoConfirmado {
  numero: string;
  items: { nombre: string; cantidad: number; precio: number }[];
  total: number;
  cliente: { nombre: string; email: string; ciudad: string };
  fecha: string;
}

const Confirmacion = () => {
  const location = useLocation();
  const pedido = (location.state as { pedido?: PedidoConfirmado } | null)?.pedido;

  // Si no hay datos de pedido (acceso directo a la URL), mostramos un mensaje genérico
  if (!pedido) {
    return (
      <div className="bg-white p-10 rounded-lg border border-[#e6dfea] text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-[#31283b] mb-2">¡Gracias por tu compra!</h1>
        <p className="text-[#7d6f87] mb-6">Tu pedido ha sido registrado correctamente.</p>
        <Link
          to="/tienda"
          className="inline-block bg-[#82285f] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#6a1f4d] transition"
        >
          Volver a la Tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-[#e6dfea] shadow-sm overflow-hidden">
        <div className="bg-green-600 text-white p-8 text-center">
          <div className="text-5xl mb-3">✓</div>
          <h1 className="text-2xl font-bold">¡Pedido confirmado!</h1>
          <p className="text-green-100 mt-1">
            Número de pedido: <span className="font-mono font-bold">{pedido.numero}</span>
          </p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-[#7d6f87]">Cliente</p>
              <p className="font-semibold text-[#31283b]">{pedido.cliente.nombre}</p>
            </div>
            <div>
              <p className="text-[#7d6f87]">Fecha</p>
              <p className="font-semibold text-[#31283b]">{pedido.fecha}</p>
            </div>
            <div>
              <p className="text-[#7d6f87]">Correo</p>
              <p className="font-semibold text-[#31283b]">{pedido.cliente.email}</p>
            </div>
            <div>
              <p className="text-[#7d6f87]">Ciudad</p>
              <p className="font-semibold text-[#31283b]">{pedido.cliente.ciudad}</p>
            </div>
          </div>

          <h2 className="font-bold text-[#31283b] mb-3">Detalle del pedido</h2>
          <div className="space-y-2 border-b border-[#f3eef5] pb-4 mb-4">
            {pedido.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-[#5f536a]">
                  {item.nombre} × {item.cantidad}
                </span>
                <span className="font-semibold">
                  ${(item.precio * item.cantidad).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mb-8">
            <span className="font-bold text-[#31283b]">Total pagado</span>
            <span className="text-2xl font-bold text-green-600">
              ${pedido.total.toFixed(2)}
            </span>
          </div>

          <div className="flex gap-4">
            <Link
              to="/tienda"
              className="flex-1 text-center bg-[#82285f] text-white font-semibold py-3 rounded-lg hover:bg-[#6a1f4d] transition"
            >
              Seguir Comprando
            </Link>
            <Link
              to="/catalogo"
              className="flex-1 text-center border border-[#d3c9d9] text-[#473d52] font-semibold py-3 rounded-lg hover:bg-[#faf7fb] transition"
            >
              Ver Catálogo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Confirmacion;
