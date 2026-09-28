import { Check, X } from "lucide-react";

const DO = ["Toda la cédula dentro de la foto", "Enfocada y con buena luz", "El retrato bien visible"];
const AVOID = ["Reflejos o flash sobre la foto", "Dedos tapando el retrato", "Fotocopias o capturas de pantalla"];

/**
 * Silueta de cómo debe verse la foto de la cédula: el retrato a la izquierda es
 * lo que se compara con el rostro, así que debe verse completo y nítido.
 */
export function IdCardSilhouette({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 202" className={className} aria-hidden="true">
      {/* Esquinas de encuadre */}
      <g stroke="var(--brand-secondary)" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M6 32V10a4 4 0 0 1 4-4h22" />
        <path d="M288 6h22a4 4 0 0 1 4 4v22" />
        <path d="M314 170v22a4 4 0 0 1-4 4h-22" />
        <path d="M32 196H10a4 4 0 0 1-4-4v-22" />
      </g>
      {/* Tarjeta */}
      <rect x="18" y="18" width="284" height="166" rx="14" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="18" y="18" width="284" height="30" rx="14" fill="#e2e8f0" />
      <rect x="18" y="34" width="284" height="14" fill="#e2e8f0" />
      <rect x="112" y="27" width="110" height="10" rx="5" fill="#cbd5e1" />
      {/* Retrato: la zona que se compara */}
      <rect x="34" y="60" width="78" height="100" rx="8" fill="#fff" stroke="#10b981" strokeWidth="2.5" strokeDasharray="6 4" />
      <circle cx="73" cy="97" r="17" fill="#cbd5e1" />
      <path d="M45 152c4-20 16-30 28-30s24 10 28 30z" fill="#cbd5e1" />
      {/* Datos */}
      {[66, 84, 102, 120, 138].map((y, i) => (
        <rect key={y} x="128" y={y} width={i % 2 ? 110 : 150} height="9" rx="4.5" fill="#e2e8f0" />
      ))}
      <rect x="246" y="140" width="42" height="30" rx="6" fill="#e2e8f0" />
    </svg>
  );
}

/** Guía para tomar la foto de la cédula: silueta y qué hacer y evitar. */
export default function IdCardGuide() {
  return (
    <div className="rounded-[24px] bg-slate-50 border border-slate-100 p-5 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 items-center">
      <div className="text-center">
        <IdCardSilhouette className="w-full max-w-[200px] mx-auto" />
        <p className="text-[11px] text-slate-500 mt-2">
          El <span className="font-semibold text-emerald-600">retrato</span> es lo que comparamos con tu rostro
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 text-xs">
        <ul className="space-y-1.5">
          {DO.map((text) => (
            <li key={text} className="flex items-center gap-2 text-slate-700">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" strokeWidth={3} />
              </span>
              {text}
            </li>
          ))}
        </ul>
        <ul className="space-y-1.5">
          {AVOID.map((text) => (
            <li key={text} className="flex items-center gap-2 text-slate-500">
              <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                <X className="w-3 h-3" strokeWidth={3} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
