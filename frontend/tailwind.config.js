/** @type {import('tailwindcss').Config} */
// Paleta lila → vino. "teal" y "brand" son la misma escala, así todo el sitio (admin incluido) se recolorea.
const brand = { 50:"#f8f3fc",100:"#efe5f8",200:"#dfcbf0",300:"#c9a6e4",400:"#b17fd3",500:"#9c4a9e",600:"#82285f",700:"#6a1f4d",800:"#561a40",900:"#451635" };
// Celeste pastel: tercer color de la marca
const celeste = { 50:"#f2fafe",100:"#e0f3fc",200:"#c3e7f8",300:"#9fd7f1",400:"#78c1e6",500:"#4fa7d3",600:"#3a89b3" };
// Neutros con un toque lila (reemplazan al gris azulado y al gris cálido)
const neutro = { 50:"#faf7fb",100:"#f3eef5",200:"#e6dfea",300:"#d3c9d9",400:"#a99bb2",500:"#7d6f87",600:"#5f536a",700:"#473d52",800:"#31283b",900:"#1f1727" };
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      screens: { xs: "480px" },
      colors: { teal: brand, brand, celeste, slate: neutro, stone: neutro, cream: "#faf6fc" },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
