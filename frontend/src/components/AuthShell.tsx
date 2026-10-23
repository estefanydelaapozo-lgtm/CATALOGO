// Contenedor de Login y Registro: panel de marca a la izquierda, formulario a la derecha.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";

interface Props { titulo: string; subtitulo: string; children: ReactNode }

const AuthShell = ({ titulo, subtitulo, children }: Props) => (
  <div className="min-h-screen grid lg:grid-cols-2 bg-cream">
    <aside className="hidden lg:flex relative flex-col justify-between p-12 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 text-white overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-32 -left-20 w-[26rem] h-[26rem] rounded-full bg-amber-200/20 blur-3xl" />
      <Link to="/login" className="relative"><Logo claro /></Link>
      <div className="relative">
        <h2 className="font-display text-5xl xl:text-6xl leading-[1.05] mb-5">Cosmética que<br />se comparte.</h2>
        <p className="text-white/80 max-w-sm text-lg">Tres catálogos, fórmulas pensadas para tu rutina y una red que crece contigo.</p>
      </div>
      <p className="relative text-sm text-white/60">© 2026 SUGGE Cosmética</p>
    </aside>

    <main className="flex flex-col justify-center px-6 py-10 sm:px-12">
      <div className="w-full max-w-md mx-auto">
        <div className="lg:hidden mb-10"><Logo /></div>
        <h1 className="font-display text-4xl text-stone-900">{titulo}</h1>
        <p className="text-stone-500 mt-2 mb-8">{subtitulo}</p>
        {children}
      </div>
    </main>
  </div>
);

export default AuthShell;
