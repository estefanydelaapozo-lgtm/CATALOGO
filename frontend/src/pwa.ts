// src/pwa.ts — registro del Service Worker y utilidades de actualización/instalación.
// El SW solo se registra en producción (build + preview); en `npm run dev` se omite.

export const EVT_UPDATE = "pwa:update-available";

let waitingWorker: ServiceWorker | null = null;

function avisarActualizacion(sw: ServiceWorker) {
  waitingWorker = sw;
  window.dispatchEvent(new CustomEvent(EVT_UPDATE));
}

export function registerSW(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Ya había una versión nueva esperando (p. ej. se abrió la app tras un deploy)
        if (reg.waiting && navigator.serviceWorker.controller) avisarActualizacion(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const nuevo = reg.installing;
          if (!nuevo) return;
          nuevo.addEventListener("statechange", () => {
            // 'installed' con controller activo = es una actualización, no la primera instalación
            if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
              avisarActualizacion(nuevo);
            }
          });
        });

        // Buscar actualizaciones cada hora mientras la app está abierta
        setInterval(() => void reg.update(), 60 * 60 * 1000);
      })
      .catch((err) => console.error("No se pudo registrar el Service Worker:", err));
  });

  // Cuando el SW nuevo toma el control, recargamos una sola vez
  let recargando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recargando) return;
    recargando = true;
    window.location.reload();
  });
}

// Pide al SW en espera que se active; el evento `controllerchange` recarga la página.
export function aplicarActualizacion(): void {
  waitingWorker?.postMessage({ type: "SKIP_WAITING" });
}


// ---------- Instalación (botón "Instalar") ----------
// El navegador dispara `beforeinstallprompt` una sola vez y puede hacerlo ANTES de que React
// monte los componentes; por eso se captura aquí, a nivel de módulo, y se guarda.
export const EVT_INSTALL = "pwa:install-state";

// Evento no estándar de Chromium (no está en lib.dom)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let eventoInstalacion: BeforeInstallPromptEvent | null = null;

const avisarInstalacion = () => window.dispatchEvent(new CustomEvent(EVT_INSTALL));

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // guardamos el evento para lanzarlo desde nuestro botón
  eventoInstalacion = e as BeforeInstallPromptEvent;
  avisarInstalacion();
});

window.addEventListener("appinstalled", () => {
  eventoInstalacion = null;
  avisarInstalacion();
});

export function puedeInstalar(): boolean {
  return eventoInstalacion !== null;
}

// ¿Ya se está usando como app instalada? (Android/escritorio o iOS "pantalla de inicio")
export function yaInstalada(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iPhone/iPad (incluye iPadOS, que se identifica como Mac con pantalla táctil)
export function esIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

// Lanza el diálogo de instalación del sistema. Devuelve true si el usuario aceptó.
export async function instalarApp(): Promise<boolean> {
  if (!eventoInstalacion) return false;
  const evt = eventoInstalacion;
  await evt.prompt();
  const { outcome } = await evt.userChoice;
  eventoInstalacion = null; // el evento solo se puede usar una vez
  avisarInstalacion();
  return outcome === "accepted";
}
