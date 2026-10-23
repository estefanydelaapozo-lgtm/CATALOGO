// src/config.ts
// URL base de la API (backend Go/Fiber).
// - En producción (Render) se define con la variable VITE_API_URL al compilar, ej. https://multicatalogo-api.onrender.com
// - En desarrollo se usa el mismo host desde el que se abre el frontend, puerto 3000
//   (así funciona en localhost y también desde otra máquina de la red).
const desdeEntorno = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, "");
export const API_URL = desdeEntorno || `http://${window.location.hostname}:3000`;

// Nombre que aparece debajo de "MultiCatálogo" (menú lateral, barra superior y login).
// Para cambiarlo, edita solo esta línea.
export const AUTOR = "Estefany de la A";
