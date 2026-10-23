// Botón "Instalar" de la barra superior. Se muestra siempre que la app NO esté instalada,
// en celular, tablet, PC y laptop.
// - Si el navegador entregó el permiso de instalación (Chrome/Edge/Samsung...): abre el diálogo del sistema.
// - Si no (iPhone, Safari, Firefox, o el navegador no lo ofrece en ese momento): muestra los pasos
//   exactos para ese navegador.
import { useEffect, useState } from "react";
import { EVT_INSTALL, esIOS, instalarApp, puedeInstalar, yaInstalada } from "../pwa";

interface Ayuda {
  titulo: string;
  pasos: string[];
}

// Pasos de instalación según el navegador/dispositivo detectado.
const ayudaInstalacion = (): Ayuda => {
  const ua = navigator.userAgent;
  const movil = /Android|Mobi/i.test(ua);
  const edge = /Edg\//.test(ua);
  const opera = /OPR\//.test(ua);
  const firefox = /Firefox\//.test(ua);
  const chrome = /Chrome\//.test(ua) && !edge && !opera;
  const safariMac = /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);

  if (esIOS()) {
    return {
      titulo: "Instala MultiCatálogo en tu iPhone o iPad",
      pasos: [
        "Abre esta página en Safari (en otros navegadores de iPhone no se puede instalar).",
        "Toca el botón Compartir (el cuadrado con la flecha hacia arriba).",
        "Elige «Añadir a pantalla de inicio» y confirma con «Añadir».",
      ],
    };
  }
  if (movil) {
    return {
      titulo: "Instala MultiCatálogo en tu celular",
      pasos: [
        "Abre el menú del navegador (los tres puntos ⋮).",
        "Elige «Instalar aplicación» o «Añadir a pantalla de inicio».",
        "Confirma y la verás en tu pantalla de inicio como una app más.",
      ],
    };
  }
  if (edge) {
    return {
      titulo: "Instala MultiCatálogo en tu computadora",
      pasos: [
        "Mira al final de la barra de direcciones: aparece un icono para instalar la app.",
        "Haz clic y elige «Instalar».",
        "Si no lo ves: menú ⋯ → Aplicaciones → «Instalar este sitio como una aplicación».",
      ],
    };
  }
  if (chrome || opera) {
    return {
      titulo: "Instala MultiCatálogo en tu computadora",
      pasos: [
        "Mira al final de la barra de direcciones: aparece un icono de instalar (un monitor con una flecha).",
        "Haz clic y elige «Instalar».",
        "Si no lo ves: menú ⋮ y busca «Instalar MultiCatálogo» o «Instalar página como aplicación» (puede estar dentro de «Transmitir, guardar y compartir»).",
      ],
    };
  }
  if (safariMac) {
    return {
      titulo: "Instala MultiCatálogo en tu Mac",
      pasos: [
        "En el menú superior de Safari elige Archivo.",
        "Haz clic en «Añadir al Dock».",
        "Confirma y se abrirá como una app independiente (requiere Safari 17 o superior).",
      ],
    };
  }
  if (firefox) {
    return {
      titulo: "Firefox no instala apps web en computadora",
      pasos: [
        "Firefox de escritorio no permite instalar este tipo de apps.",
        "Abre esta misma dirección en Google Chrome o Microsoft Edge.",
        "Allí aparecerá el icono de instalar en la barra de direcciones.",
      ],
    };
  }
  return {
    titulo: "Instala MultiCatálogo",
    pasos: [
      "Abre el menú de tu navegador.",
      "Busca la opción «Instalar aplicación» o «Instalar este sitio como app».",
      "Si no existe, abre esta dirección en Google Chrome o Microsoft Edge.",
    ],
  };
};

const InstalarPwa = () => {
  const [, forzar] = useState(0);
  const [instalada, setInstalada] = useState<boolean>(() => yaInstalada());
  const [ayuda, setAyuda] = useState<Ayuda | null>(null);

  useEffect(() => {
    const sync = () => {
      setInstalada(yaInstalada());
      forzar((n) => n + 1);
    };
    window.addEventListener(EVT_INSTALL, sync);
    sync(); // el evento pudo llegar antes de montar este componente
    return () => window.removeEventListener(EVT_INSTALL, sync);
  }, []);

  // Dentro de la app ya instalada no tiene sentido mostrar el botón
  if (instalada) return null;

  const alPulsar = () => {
    if (puedeInstalar() && !esIOS()) void instalarApp();
    else setAyuda(ayudaInstalacion());
  };

  return (
    <>
      <button
        type="button"
        onClick={alPulsar}
        aria-label="Instalar aplicación"
        className="shrink-0 inline-flex items-center gap-2 h-10 px-3 xs:px-4 rounded-xl bg-gradient-to-r from-[#9c4a9e] to-[#6a1f4d] text-white text-sm font-bold shadow-md shadow-[#82285f]/25 hover:brightness-110 active:scale-95 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" />
        </svg>
        <span className="hidden xs:inline">Instalar</span>
      </button>

      {ayuda && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="instalar-titulo"
          onClick={() => setAyuda(null)}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 id="instalar-titulo" className="text-lg font-bold text-[#31283b]">{ayuda.titulo}</h2>
            <ol className="mt-4 space-y-3 text-sm text-[#473d52] list-decimal list-inside">
              {ayuda.pasos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-[#5f536a]">
              Si ya la instalaste, ábrela desde su icono (escritorio, menú Inicio o pantalla de inicio).
            </p>
            <button
              type="button"
              onClick={() => setAyuda(null)}
              className="mt-5 w-full py-3 rounded-xl bg-[#82285f] text-white font-bold hover:bg-[#6a1f4d] transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstalarPwa;
