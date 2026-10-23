// src/components/Registro.tsx — alta pública de clientes (+ código de referido)
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, type Rol } from "../context/AuthContext";
import { API_URL } from "../config";

const Registro = () => {
  const [params] = useSearchParams();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ref, setRef] = useState(params.get("ref") ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    fetch(`${API_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password, ref: ref || undefined }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.message ?? "Error al registrar");
        return data;
      })
      .then((data) => {
        const rol: Rol = data.rol === "admin" ? "admin" : "cliente";
        login({ email: data.email, rol, token: data.token });
        navigate(rol === "admin" ? "/" : "/tienda");
      })
      .catch((err) =>
        setError(err instanceof TypeError ? "No se pudo conectar con el servidor" : err.message)
      )
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3eef5] px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 border border-[#e6dfea]">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#1f1727]">Crear cuenta</h2>
          <p className="text-[#7d6f87] mt-2">Únete a la red MultiCatálogo</p>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center border border-red-200">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#473d52] mb-1">Nombre</label>
            <input
              className="w-full border border-[#d3c9d9] rounded-lg px-3 py-3 text-base min-h-[44px]"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#473d52] mb-1">Correo</label>
            <input
              type="email"
              className="w-full border border-[#d3c9d9] rounded-lg px-3 py-3 text-base min-h-[44px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#473d52] mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full border border-[#d3c9d9] rounded-lg px-3 py-3 text-base min-h-[44px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#473d52] mb-1">
              Código de referido (opcional)
            </label>
            <input
              className="w-full border border-[#d3c9d9] rounded-lg px-3 py-3 text-base min-h-[44px]"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Ej. LUIS"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#82285f] text-white font-semibold rounded-lg py-3 min-h-[44px] hover:bg-[#6a1f4d] disabled:opacity-60"
          >
            {loading ? "Creando…" : "Registrarme"}
          </button>
        </form>
        <p className="text-center text-sm text-[#7d6f87] mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-[#82285f] font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Registro;
