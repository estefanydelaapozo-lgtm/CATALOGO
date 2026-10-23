// src/components/Checkout.tsx
// Flujo de checkout (Tema 5 + Fase 4):
// - Formulario de envío con validación básica
// - Resumen del pedido en tiempo real
// - Envía el pedido a POST /api/checkout y redirige a /confirmacion si el servidor lo confirma
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

interface DatosEnvio {
  nombre: string;
  email: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  metodoPago: string;
}

const METODOS_PAGO = ["Tarjeta de crédito", "Transferencia bancaria", "Efectivo contra entrega"];

const Checkout = () => {
  const { cart, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [datos, setDatos] = useState<DatosEnvio>({
    nombre: "",
    email: "",
    direccion: "",
    ciudad: "",
    telefono: "",
    metodoPago: METODOS_PAGO[0],
  });
  const [procesando, setProcesando] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Si el carrito está vacío, mostramos un aviso en lugar del formulario
  if (cart.length === 0) {
    return (
      <div className="bg-white p-10 rounded-lg border border-[#e6dfea] text-center">
        <p className="text-[#5f536a] text-lg mb-4">No tienes productos en el carrito.</p>
        <Link to="/catalogo" className="text-[#82285f] font-semibold hover:underline">
          ← Ir al catálogo
        </Link>
      </div>
    );
  }

  const handleChange = (campo: keyof DatosEnvio, valor: string) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  };

  // Fase 4: el pedido se envía a POST /api/checkout (transacción ACID en el backend).
  // El servidor calcula el total con los precios de la BD; aquí solo se mandan id y cantidad.
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProcesando(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token ?? ""}`,
        },
        body: JSON.stringify({
          cliente: {
            nombre: datos.nombre,
            email: datos.email,
            direccion: datos.direccion,
            ciudad: datos.ciudad,
            telefono: datos.telefono,
          },
          metodoPago: datos.metodoPago,
          items: cart.map((item) => ({ id: item.id, cantidad: item.cantidad })),
        }),
      });

      // Errores con formato estandarizado: { status, message, details }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message ?? "Error inesperado del servidor");
      }

      // Pedido confirmado por el servidor: vaciamos el carrito y mostramos el recibo
      const pedido = { ...data, fecha: new Date(data.fecha).toLocaleString("es-EC") };
      clearCart();
      navigate("/confirmacion", { state: { pedido } });
    } catch (err) {
      // TypeError = el navegador no pudo contactar al servidor (caído, CORS, red)
      setError(
        err instanceof TypeError
          ? "No se pudo conectar con el servidor"
          : (err as Error).message
      );
      setProcesando(false); // el carrito NO se vacía: el cliente puede reintentar
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#31283b] mb-6">Finalizar Compra</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== FORMULARIO DE ENVÍO ===== */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
          <div className="bg-white p-6 rounded-lg border border-[#e6dfea] shadow-sm">
            <h2 className="text-lg font-bold text-[#31283b] mb-4">Datos de Envío</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#473d52] mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  value={datos.nombre}
                  onChange={(e) => handleChange("nombre", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#d3c9d9] focus:ring-2 focus:ring-[#82285f] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#473d52] mb-1">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={datos.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#d3c9d9] focus:ring-2 focus:ring-[#82285f] outline-none transition"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#473d52] mb-1">
                  Dirección *
                </label>
                <input
                  type="text"
                  required
                  value={datos.direccion}
                  onChange={(e) => handleChange("direccion", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#d3c9d9] focus:ring-2 focus:ring-[#82285f] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#473d52] mb-1">
                  Ciudad *
                </label>
                <input
                  type="text"
                  required
                  value={datos.ciudad}
                  onChange={(e) => handleChange("ciudad", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#d3c9d9] focus:ring-2 focus:ring-[#82285f] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#473d52] mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  value={datos.telefono}
                  onChange={(e) => handleChange("telefono", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#d3c9d9] focus:ring-2 focus:ring-[#82285f] outline-none transition"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-[#e6dfea] shadow-sm">
            <h2 className="text-lg font-bold text-[#31283b] mb-4">Método de Pago</h2>
            <div className="space-y-3">
              {METODOS_PAGO.map((metodo) => (
                <label
                  key={metodo}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[#e6dfea] cursor-pointer hover:border-[#c9a6e4] transition"
                >
                  <input
                    type="radio"
                    name="metodoPago"
                    value={metodo}
                    checked={datos.metodoPago === metodo}
                    onChange={(e) => handleChange("metodoPago", e.target.value)}
                    className="accent-[#82285f]"
                  />
                  <span className="text-sm text-[#473d52]">{metodo}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={procesando}
            className="w-full bg-[#82285f] text-white py-3 rounded-lg font-semibold hover:bg-[#6a1f4d] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {procesando ? "Procesando pago..." : "Confirmar Pedido"}
          </button>
        </form>

        {/* ===== RESUMEN DEL PEDIDO ===== */}
        <div className="bg-white p-6 rounded-lg border border-[#e6dfea] shadow-sm h-fit">
          <h2 className="text-lg font-bold text-[#31283b] mb-4">Resumen del Pedido</h2>
          <div className="space-y-3 border-b border-[#f3eef5] pb-4 mb-4">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[#5f536a]">
                  {item.nombre} × {item.cantidad}
                </span>
                <span className="font-semibold text-[#31283b]">
                  ${(item.precio * item.cantidad).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#31283b] font-bold">Total</span>
            <span className="text-2xl font-bold text-[#82285f]">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
