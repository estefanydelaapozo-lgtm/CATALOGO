// Logo MultiCatálogo · Cosmética SUGGE. `claro` ajusta el texto para fondos oscuros.
import LogoMark from "./LogoMark";

const Logo = ({ claro = false }: { claro?: boolean }) => (
  <span className="inline-flex items-center gap-3">
    <LogoMark />
    <span className="leading-none text-left">
      <span className={`block font-display text-[1.35rem] font-semibold tracking-tight ${claro ? "text-white" : "text-[#1f1727]"}`}>
        Multi<span className={claro ? "text-[#dfcbf0]" : "text-[#82285f]"}>Catálogo</span>
      </span>
      <span className={`block text-[10px] font-semibold tracking-[0.28em] uppercase mt-1.5 ${claro ? "text-[#c3e7f8]" : "text-[#3a89b3]"}`}>
        Cosmética SUGGE
      </span>
    </span>
  </span>
);

export default Logo;
