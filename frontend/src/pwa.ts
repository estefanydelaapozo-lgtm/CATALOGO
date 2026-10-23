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
