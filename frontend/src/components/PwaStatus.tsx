// src/components/PwaStatus.tsx
// UX de la PWA: indicador "Sin conexión" y aviso de nueva versión (la instalación es el botón de la barra: InstalarPwa).
import { useEffect, useState } from "react";
import { EVT_UPDATE, aplicarActualizacion } from "../pwa";

const PwaStatus = () => {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [hayUpdate, setHayUpdate] = useState(false);

  // Estado de red
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Nueva versión disponible
  useEffect(() => {
    const onUpdate = () => setHayUpdate(true);
    window.addEventListener(EVT_UPDATE, onUpdate);
    return () => window.removeEventListener(EVT_UPDATE, onUpdate);
  }, []);

  return (
    <>
      {!online && (
        <div
          role="status"
          className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-[#1f1727] text-center text-sm font-medium py-1"
          style={{ paddingTop: "max(0.25rem, env(safe-area-inset-top))" }}
        >
          Sin conexión — mostrando datos guardados
        </div>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {hayUpdate && (
          <div
            role="alert"
            className="pointer-events-auto w-full max-w-md bg-[#1f1727] text-white rounded-lg shadow-lg p-3 flex items-center justify-between gap-3"
          >
            <span className="text-sm">Hay una actualización disponible</span>
            <button
              type="button"
              onClick={aplicarActualizacion}
              className="bg-[#9c4a9e] hover:bg-[#b17fd3] text-[#1f1727] font-semibold text-sm px-4 py-2 rounded-lg min-h-[44px]"
            >
              Reiniciar
            </button>
          </div>
        )}

      </div>
    </>
  );
};

export default PwaStatus;
