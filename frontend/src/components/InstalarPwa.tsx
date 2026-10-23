// Botón "Instalar" de la barra superior.
// - Android/escritorio (Chrome, Edge, Samsung Internet...): abre el diálogo de instalación del sistema.
// - iPhone/iPad: Apple no permite instalar con un botón, así que se muestran los pasos en Safari.
// - Si la app ya está instalada o el navegador no la puede instalar, no se muestra nada.
import { useEffect, useState } from "react";
import { EVT_INSTALL, esIOS, instalarApp, puedeInstalar, yaInstalada } from "../pwa";

const InstalarPwa = () => {
  const [disponible, setDisponible] = useState<boolean>(() => puedeInstalar());
  const [instalada, setInstalada] = useState<boolean>(() => yaInstalada());
  const [ayudaIOS, setAyudaIOS] = useState(false);
  const ios = esIOS();

  useEffect(() => {
    const sync = () => {
      setDisponible(puedeInstalar());
      setInstalada(yaInstalada());
    };
    window.addEventListener(EVT_INSTALL, sync);
    sync(); // el evento pudo llegar antes de montar este componente
    return () => window.removeEventListener(EVT_INSTALL, sync);
  }, []);

  if (instalada || (!disponible && !ios)) return null;

  const alPulsar = () => {
    if (ios) setAyudaIOS(true);
    else void instalarApp();
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

      {ayudaIOS && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="instalar-ios-titulo"
          onClick={() => setAyudaIOS(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="instalar-ios-titulo" className="text-lg font-bold text-[#31283b]">Instala MultiCatálogo en tu iPhone</h2>
            <ol className="mt-4 space-y-3 text-sm text-[#473d52] list-decimal list-inside">
              <li>Abre esta página en <strong>Safari</strong> (en otros navegadores de iPhone no se puede instalar).</li>
              <li>Toca el botón <strong>Compartir</strong> (el cuadrado con la flecha hacia arriba).</li>
              <li>Elige <strong>Añadir a pantalla de inicio</strong> y confirma con <strong>Añadir</strong>.</li>
            </ol>
            <button
              type="button"
              onClick={() => setAyudaIOS(false)}
              className="mt-6 w-full py-3 rounded-xl bg-[#82285f] text-white font-bold hover:bg-[#6a1f4d] transition"
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
