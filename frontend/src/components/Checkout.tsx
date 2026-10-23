// src/components/Checkout.tsx
// Flujo de checkout (Tema 5 + Fase 4):
// - Formulario de envío con validación básica
// - Resumen del pedido en tiempo real
// - Método de pago con datos propios: tarjeta (sin enviar número ni CVV), voucher de transferencia
//   y datos de entrega para efectivo contra entrega
// - Envía el pedido a POST /api/checkout y redirige a /confirmacion si el servidor lo confirma
import { useState, type ChangeEvent, type FormEvent } from 'react';
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

const TARJETA = "Tarjeta de crédito";
const TRANSFERENCIA = "Transferencia bancaria";
const EFECTIVO = "Efectivo contra entrega";
const METODOS_PAGO = [TARJETA, TRANSFERENCIA, EFECTIVO];

// TODO: reemplaza por los datos reales de la cuenta que recibe las transferencias.
const DATOS_TRANSFERENCIA = {
  banco: "Banco Pichincha",
  tipo: "Cuenta de ahorros",
  numero: "0000000000",
  titular: "MultiCatálogo",
  identificacion: "0000000000001",
};

const BANCOS = ["Banco Pichincha", "Banco del Pacífico", "Banco de Guayaquil", "Produbanco", "Banco Bolivariano", "Cooperativa", "Otro"];
const FRANJAS = ["Mañana (8h-12h)", "Tarde (12h-18h)", "Noche (18h-21h)"];
const MAX_COMPROBANTE_BYTES = 2 * 1024 * 1024; // 2 MB
const TIPOS_COMPROBANTE = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

const INPUT_CLS =
  "w-full px-4 py-2.5 rounded-lg border border-[#d3c9d9] focus:ring-2 focus:ring-[#82285f] outline-none transition";
const LABEL_CLS = "block text-sm font-medium text-[#473d52] mb-1";

interface DatosTarjeta { numero: string; titular: string; vencimiento: string; cvv: string }
interface DatosTransferencia { banco: string; referencia: string; archivo: File | null }
interface DatosEfectivo { quienRecibe: string; franja: string; pagaCon: string; referencia: string }

const soloDigitos = (v: string) => v.replace(/\D/g, "");

// Marca según el prefijo (BIN) del número
const detectarMarca = (numero: string): string => {
  const n = soloDigitos(numero);
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "American Express";
  if (/^3(0[0-5]|[68])/.test(n)) return "Diners Club";
  return "Otra";
};

// Formato visual: grupos de 4 (Amex: 4-6-5)
const formatearNumero = (v: string): string => {
  const n = soloDigitos(v).slice(0, 19);
  if (/^3[47]/.test(n)) return [n.slice(0, 4), n.slice(4, 10), n.slice(10, 15)].filter(Boolean).join(" ");
  return n.replace(/(.{4})/g, "$1 ").trim();
};

const formatearVencimiento = (v: string): string => {
  const n = soloDigitos(v).slice(0, 4);
  return n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n;
};

// Algoritmo de Luhn: detecta números de tarjeta mal digitados
const luhnValido = (numero: string): boolean => {
  const n = soloDigitos(numero);
  let suma = 0;
  let doble = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (doble) { d *= 2; if (d > 9) d -= 9; }
    suma += d;
    doble = !doble;
  }
  return n.length >= 13 && suma % 10 === 0;
};

const vencimientoValido = (v: string): boolean => {
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(v);
  if (!m) return false;
  const hoy = new Date();
  const anio = 2000 + Number(m[2]);
  const mes = Number(m[1]);
  return anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes >= hoy.getMonth() + 1);
};

const archivoADataUrl = (archivo: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error("No se pudo leer el archivo del voucher"));
    lector.readAsDataURL(archivo);
  });

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
  const [tarjeta, setTarjeta] = useState<DatosTarjeta>({ numero: "", titular: "", vencimiento: "", cvv: "" });
  const [transf, setTransf] = useState<DatosTransferencia>({ banco: "", referencia: "", archivo: null });
  const [efectivo, setEfectivo] = useState<DatosEfectivo>({ quienRecibe: "", franja: "", pagaCon: "", referencia: "" });
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

  const handleComprobante = (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0] ?? null;
    if (archivo && !TIPOS_COMPROBANTE.includes(archivo.type)) {
      setError("El voucher debe ser una imagen (PNG, JPG, WEBP) o un PDF");
      e.target.value = "";
      return;
    }
    if (archivo && archivo.size > MAX_COMPROBANTE_BYTES) {
      setError("El voucher no puede pesar más de 2 MB");
      e.target.value = "";
      return;
    }
    setError("");
    setTransf((prev) => ({ ...prev, archivo }));
  };

  // Valida los datos del método elegido; devuelve el mensaje de error o "" si todo está bien.
  const validarPago = (): string => {
    if (datos.metodoPago === TARJETA) {
      if (tarjeta.titular.trim().length < 3) return "Escribe el nombre del titular de la tarjeta";
      if (!luhnValido(tarjeta.numero)) return "El número de la tarjeta no es válido";
      if (!vencimientoValido(tarjeta.vencimiento)) return "El vencimiento no es válido o la tarjeta está vencida (MM/AA)";
      const largoCvv = detectarMarca(tarjeta.numero) === "American Express" ? 4 : 3;
      if (soloDigitos(tarjeta.cvv).length !== largoCvv) return `El CVV debe tener ${largoCvv} dígitos`;
    } else if (datos.metodoPago === TRANSFERENCIA) {
      if (!transf.banco) return "Indica el banco desde el que transferiste";
      if (!transf.referencia.trim()) return "Escribe el número de referencia o comprobante";
      if (!transf.archivo) return "Adjunta el voucher de la transferencia";
    } else if (datos.metodoPago === EFECTIVO) {
      if (!efectivo.quienRecibe.trim()) return "Indica quién recibirá el pedido";
      if (!efectivo.franja) return "Elige una franja horaria de entrega";
      const pagaCon = Number(efectivo.pagaCon);
      if (!pagaCon || pagaCon <= 0) return "Indica con cuánto vas a pagar";
      if (pagaCon < totalPrice) return `El monto con el que pagas debe cubrir el total ($${totalPrice.toFixed(2)})`;
    }
    return "";
  };

  // Fase 4: el pedido se envía a POST /api/checkout (transacción ACID en el backend).
  // El servidor calcula el total con los precios de la BD; aquí solo se mandan id y cantidad.
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const problema = validarPago();
    if (problema) {
      setError(problema);
      return;
    }
    setProcesando(true);

    try {
      // SEGURIDAD: de la tarjeta solo viajan titular, marca, últimos 4 y vencimiento.
      // El número completo y el CVV se quedan en el navegador y no se guardan.
      let pago: Record<string, unknown> = {};
      if (datos.metodoPago === TARJETA) {
        pago = {
          titular: tarjeta.titular.trim(),
          marca: detectarMarca(tarjeta.numero),
          ultimos4: soloDigitos(tarjeta.numero).slice(-4),
          vencimiento: tarjeta.vencimiento,
        };
      } else if (datos.metodoPago === TRANSFERENCIA && transf.archivo) {
        pago = {
          bancoOrigen: transf.banco,
          numeroReferencia: transf.referencia.trim(),
          comprobanteNombre: transf.archivo.name,
          comprobante: await archivoADataUrl(transf.archivo),
        };
      } else if (datos.metodoPago === EFECTIVO) {
        pago = {
          quienRecibe: efectivo.quienRecibe.trim(),
          franjaEntrega: efectivo.franja,
          pagaCon: Number(efectivo.pagaCon),
          referencia: efectivo.referencia.trim(),
        };
      }

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
          pago,
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

            {/* ===== Datos según el método elegido ===== */}
            {datos.metodoPago === TARJETA && (
              <div className="mt-5 pt-5 border-t border-[#f3eef5] space-y-4">
                <h3 className="text-sm font-bold text-[#31283b]">Datos de la tarjeta</h3>
                <div>
                  <label className={LABEL_CLS}>Número de tarjeta *</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="1234 5678 9012 3456"
                      value={tarjeta.numero}
                      onChange={(e) => setTarjeta((p) => ({ ...p, numero: formatearNumero(e.target.value) }))}
                      className={`${INPUT_CLS} pr-32`}
                    />
                    {tarjeta.numero && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#82285f]">
                        {detectarMarca(tarjeta.numero)}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Nombre del titular *</label>
                  <input
                    type="text"
                    autoComplete="cc-name"
                    placeholder="Como aparece en la tarjeta"
                    value={tarjeta.titular}
                    onChange={(e) => setTarjeta((p) => ({ ...p, titular: e.target.value }))}
                    className={INPUT_CLS}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLS}>Vencimiento *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/AA"
                      value={tarjeta.vencimiento}
                      onChange={(e) => setTarjeta((p) => ({ ...p, vencimiento: formatearVencimiento(e.target.value) }))}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>CVV *</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="•••"
                      maxLength={4}
                      value={tarjeta.cvv}
                      onChange={(e) => setTarjeta((p) => ({ ...p, cvv: soloDigitos(e.target.value) }))}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
                <p className="text-xs text-[#7d6f87]">
                  🔒 Por seguridad solo guardamos los últimos 4 dígitos; el número completo y el CVV no se almacenan.
                </p>
              </div>
            )}

            {datos.metodoPago === TRANSFERENCIA && (
              <div className="mt-5 pt-5 border-t border-[#f3eef5] space-y-4">
                <div className="bg-[#faf7fc] border border-[#e6dfea] rounded-lg p-4 text-sm text-[#473d52] space-y-1">
                  <p className="font-bold text-[#31283b] mb-1">Transfiere ${totalPrice.toFixed(2)} a:</p>
                  <p><span className="text-[#7d6f87]">Banco:</span> {DATOS_TRANSFERENCIA.banco}</p>
                  <p><span className="text-[#7d6f87]">Tipo:</span> {DATOS_TRANSFERENCIA.tipo}</p>
                  <p><span className="text-[#7d6f87]">N.º de cuenta:</span> <span className="font-mono">{DATOS_TRANSFERENCIA.numero}</span></p>
                  <p><span className="text-[#7d6f87]">Titular:</span> {DATOS_TRANSFERENCIA.titular}</p>
                  <p><span className="text-[#7d6f87]">RUC / C.I.:</span> {DATOS_TRANSFERENCIA.identificacion}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLS}>Banco desde el que transferiste *</label>
                    <select
                      value={transf.banco}
                      onChange={(e) => setTransf((p) => ({ ...p, banco: e.target.value }))}
                      className={INPUT_CLS}
                    >
                      <option value="">Selecciona un banco</option>
                      {BANCOS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>N.º de referencia / comprobante *</label>
                    <input
                      type="text"
                      value={transf.referencia}
                      onChange={(e) => setTransf((p) => ({ ...p, referencia: e.target.value }))}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLS}>Voucher de la transferencia *</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={handleComprobante}
                    className="block w-full text-sm text-[#473d52] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#f3eef5] file:text-[#82285f] file:font-semibold hover:file:bg-[#eadff0] file:cursor-pointer"
                  />
                  <p className="text-xs text-[#7d6f87] mt-1">
                    {transf.archivo
                      ? `Archivo: ${transf.archivo.name} (${(transf.archivo.size / 1024).toFixed(0)} KB)`
                      : "Imagen (PNG, JPG, WEBP) o PDF, máximo 2 MB."}
                  </p>
                </div>
              </div>
            )}

            {datos.metodoPago === EFECTIVO && (
              <div className="mt-5 pt-5 border-t border-[#f3eef5] space-y-4">
                <h3 className="text-sm font-bold text-[#31283b]">Datos para la entrega</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLS}>¿Quién recibe el pedido? *</label>
                    <input
                      type="text"
                      placeholder={datos.nombre || "Nombre de quien recibe"}
                      value={efectivo.quienRecibe}
                      onChange={(e) => setEfectivo((p) => ({ ...p, quienRecibe: e.target.value }))}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Franja horaria de entrega *</label>
                    <select
                      value={efectivo.franja}
                      onChange={(e) => setEfectivo((p) => ({ ...p, franja: e.target.value }))}
                      className={INPUT_CLS}
                    >
                      <option value="">Selecciona una franja</option>
                      {FRANJAS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>¿Con cuánto vas a pagar? ($) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={totalPrice.toFixed(2)}
                      value={efectivo.pagaCon}
                      onChange={(e) => setEfectivo((p) => ({ ...p, pagaCon: e.target.value }))}
                      className={INPUT_CLS}
                    />
                    {Number(efectivo.pagaCon) >= totalPrice && totalPrice > 0 && (
                      <p className="text-xs text-[#7d6f87] mt-1">
                        Cambio a devolver: ${(Number(efectivo.pagaCon) - totalPrice).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className={LABEL_CLS}>Referencia / indicaciones para el repartidor</label>
                    <textarea
                      rows={2}
                      maxLength={300}
                      placeholder="Ej.: casa azul frente al parque, tocar el timbre"
                      value={efectivo.referencia}
                      onChange={(e) => setEfectivo((p) => ({ ...p, referencia: e.target.value }))}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
                <p className="text-xs text-[#7d6f87]">💵 Pagas en efectivo al recibir tu pedido.</p>
              </div>
            )}
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
