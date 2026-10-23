// src/components/PwaStatus.tsx
// UX de la PWA: indicador "Sin conexión", banner "Instalar app" y aviso de nueva versión.
import { useEffect, useState } from "react";
import { EVT_UPDATE, aplicarActualizacion } from "../pwa";

// Evento no estándar de Chromium (no está en lib.dom)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "mc_install_dismissed";

const yaInstalada = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS Safari
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const PwaStatus = () => {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [descartado, setDescartado] = useState<boolean>(
    () => sessionStorage.getItem(DISMISS_KEY) === "1"
  );
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

  // Instalación
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // guardamos el evento para lanzarlo desde nuestro botón
      if (!yaInstalada()) setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Nueva versión disponible
  useEffect(() => {
    const onUpdate = () => setHayUpdate(true);
    window.addEventListener(EVT_UPDATE, onUpdate);
    return () => window.removeEventListener(EVT_UPDATE, onUpdate);
  }, []);

  const instalar = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null); // el evento solo se puede usar una vez
  };

  const descartar = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDescartado(true);
  };

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

        {installEvt && !descartado && (
          <div className="pointer-events-auto w-full max-w-md bg-white border border-[#e6dfea] rounded-lg shadow-lg p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1f1727]">Instala MultiCatálogo</p>
              <p className="text-xs text-[#7d6f87]">Ábrela como app, a pantalla completa.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={descartar}
                className="text-[#7d6f87] text-sm px-2 py-2 min-h-[44px] hover:text-[#473d52]"
              >
                Ahora no
              </button>
              <button
                type="button"
                onClick={() => void instalar()}
                className="bg-[#82285f] hover:bg-[#6a1f4d] text-white font-semibold text-sm px-4 py-2 rounded-lg min-h-[44px]"
              >
                Instalar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PwaStatus;
