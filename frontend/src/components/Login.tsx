// src/components/Login.tsx
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type Rol } from "../context/AuthContext";
import { API_URL } from "../config";
import Logo from "./Logo";
import LogoMark from "./LogoMark";

const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [ver, setVer] = useState<boolean>(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Consumo de API RESTful usando promesas (Tema 4)
    fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then(async (response) => {
        // La API devuelve errores con formato estandarizado: { status, message, details }
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message ?? "Error inesperado del servidor");
        }
        return data;
      })
      .then((data) => {
        setError("");
        // La API devuelve el rol (admin | cliente) junto al correo (Tema 5)
        const rol: Rol = data.rol === "admin" ? "admin" : "cliente";
        login({ email: data.email, rol, token: data.token });

        // Redirigimos según el rol: admin al Dashboard, cliente a la Tienda
        navigate(rol === "admin" ? "/" : "/tienda");
      })
      .catch((err) => {
        // TypeError = el navegador no pudo contactar al servidor (caído, CORS, red)
        setError(
          err instanceof TypeError
            ? "No se pudo conectar con el servidor"
            : err.message
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Rellena las credenciales de prueba con un clic
  const usar = (correo: string) => { setEmail(correo); setPassword("123456"); setError(""); };

  const campo =
    "w-full pl-11 pr-4 py-3.5 rounded-xl border border-[#d3c9d9] bg-white text-[#1f1727] placeholder:text-[#a99bb2] focus:ring-4 focus:ring-[#c9a6e4]/40 focus:border-[#9c4a9e] outline-none transition";

  const beneficios = [
    { t: "Catálogos para cada necesidad", d: "Piel, cabello y bienestar en un solo lugar.", i: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
    { t: "Tu red de referidos", d: "Sigue quién compra y cuánto genera tu equipo.", i: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    { t: "Comisiones claras", d: "Consulta tus pedidos y liquidaciones al día.", i: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1.05fr_1fr] bg-[#faf6fc]">
      {/* Panel de marca */}
      <aside className="relative overflow-hidden text-white bg-gradient-to-br from-[#4a1538] via-[#6a1f4d] to-[#82285f] px-6 py-8 sm:px-10 lg:px-14 lg:py-14 flex flex-col justify-between">
        {/* Círculos decorativos */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#b17fd3]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-[#4fa7d3]/25 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -right-40 w-[26rem] h-[26rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute top-1/2 -right-24 w-[20rem] h-[20rem] rounded-full border border-white/10" />

        <div className="relative flex items-center gap-3">
          <LogoMark size={44} />
          <div>
            <p className="font-bold text-lg leading-tight">MultiCatálogo</p>
            <p className="text-xs font-semibold tracking-wider text-[#9fd7f1]">Cosmética SUGGE</p>
          </div>
        </div>

        <div className="relative my-8 lg:my-0">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-[1.1] max-w-lg">
            Tu belleza y tu negocio, en un mismo lugar
          </h2>
          <p className="mt-4 text-[#efe5f8] text-base lg:text-lg max-w-md">
            Compra tus productos favoritos y haz crecer tu red de referidos desde cualquier dispositivo.
          </p>

          <ul className="hidden sm:block mt-8 space-y-4 max-w-md">
            {beneficios.map((b) => (
              <li key={b.t} className="flex items-start gap-4">
                <span className="w-11 h-11 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center shrink-0 text-[#c3e7f8]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={b.i} />
                  </svg>
                </span>
                <div>
                  <p className="font-semibold text-white">{b.t}</p>
                  <p className="text-sm text-[#efe5f8]">{b.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative hidden lg:block text-xs text-[#dfcbf0]">© 2026 MultiCatálogo · Cosmética SUGGE</p>
      </aside>

      {/* Formulario */}
      <main className="relative flex flex-col items-center justify-center px-4 py-10 sm:px-8 overflow-hidden bg-[linear-gradient(160deg,#faf6fc,#eef8fd)]">
        <div className="pointer-events-none absolute -bottom-32 -right-24 w-[26rem] h-[26rem] rounded-full bg-[#9fd7f1]/40 blur-3xl" />
        <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#c9a6e4]/30 blur-3xl" />

        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-[#6a1f4d]/10 ring-1 ring-[#efe5f8] p-8 sm:p-10 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#9fd7f1] via-[#c9a6e4] to-[#82285f]" />

          <div className="mb-8">
            <div className="lg:hidden mb-5"><Logo /></div>
            <h1 className="font-display text-3xl text-[#1f1727]">Bienvenido de nuevo</h1>
            <p className="text-[#5f536a] mt-1.5">Ingresa a tu cuenta para continuar</p>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 border border-red-200 font-medium">
              <svg className="w-5 h-5 shrink-0 mt-px" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-[#473d52] mb-2">Correo electrónico</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7d6f87] pointer-events-none" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>
                <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={campo} placeholder="tucorreo@ejemplo.com" required />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-[#473d52] mb-2">Contraseña</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7d6f87] pointer-events-none" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 11V8a5 5 0 0110 0v3M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z" /></svg>
                <input id="login-password" type={ver ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${campo} pr-24`} placeholder="Tu contraseña" required />
                <button type="button" onClick={() => setVer((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-xs font-bold text-[#82285f] hover:bg-[#f8f3fc] transition">
                  {ver ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#9c4a9e] to-[#6a1f4d] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#82285f]/30 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
              {loading ? "Validando..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="text-center text-sm text-[#5f536a] mt-6">
            ¿No tienes cuenta?{" "}
            <Link to="/registro" className="text-[#82285f] font-bold hover:underline">
              Crear cuenta
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-[#e6dfea]">
            <p className="text-sm font-semibold text-[#5f536a] mb-3">Cuentas de prueba (toca una para rellenar)</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <button type="button" onClick={() => usar("admin@upse.edu.ec")} className="text-left px-4 py-3 rounded-xl bg-[#f8f3fc] ring-1 ring-[#e0cdef] hover:ring-[#9c4a9e] hover:bg-white transition">
                <span className="block text-sm font-bold text-[#561a40]">Administrador</span>
                <span className="block text-xs text-[#5f536a] truncate">admin@upse.edu.ec</span>
              </button>
              <button type="button" onClick={() => usar("cliente@upse.edu.ec")} className="text-left px-4 py-3 rounded-xl bg-[#f2fafe] ring-1 ring-[#c3e7f8] hover:ring-[#3a89b3] hover:bg-white transition">
                <span className="block text-sm font-bold text-[#245f7e]">Cliente</span>
                <span className="block text-xs text-[#5f536a] truncate">cliente@upse.edu.ec</span>
              </button>
            </div>
          </div>
        </div>

        <p className="relative mt-6 text-xs text-[#5f536a] lg:hidden">© 2026 MultiCatálogo · Cosmética SUGGE</p>
      </main>
    </div>
  );
};

export default Login;
