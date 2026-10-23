// src/config.ts
// URL base de la API (backend Go/Fiber, puerto 3000).
// Usa el mismo host desde el que se abre el frontend, así funciona en localhost
// y también desde otra máquina de la red (ej. la IP del aula).
export const API_URL = `http://${window.location.hostname}:3000`;
