// Isotipo: «M» de hombros redondeados (pétalos) con destello, sobre degradado lila → vino.
import { useId } from "react";

const LogoMark = ({ size = 42 }: { size?: number }) => {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0 drop-shadow-sm">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9fd7f1" />
          <stop offset="0.35" stopColor="#c9a6e4" />
          <stop offset="0.7" stopColor="#9c4a9e" />
          <stop offset="1" stopColor="#6a1f4d" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="13" fill={`url(#${id})`} />
      <path
        d="M10 29V17c0-3 4-4.2 5.6-1.6L20 22.5l4.4-8.1C26 11.8 30 13 30 17v12"
        fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M31.5 5.5l.9 2.5 2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9z" fill="#fff" />
    </svg>
  );
};

export default LogoMark;
