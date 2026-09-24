import { Calculator, CheckCircle2, PiggyBank, ScanFace } from "lucide-react";
import { money } from "@/lib/format";

export type ShowcaseCredit = {
  name: string;
  amount: number;
  termMonths: number;
  annualRate: number;
};

/** Cuota fija del sistema francés y saldo pendiente al cierre de cada mes. */
function frenchSchedule({ amount, termMonths, annualRate }: ShowcaseCredit) {
  const i = annualRate / 100 / 12;
  const payment = i === 0 ? amount / termMonths : (amount * i) / (1 - (1 + i) ** -termMonths);
  const balanceAt = (month: number) =>
    i === 0 ? amount - payment * month : amount * (1 + i) ** month - (payment * ((1 + i) ** month - 1)) / i;
  return { payment, balanceAt };
}

const BAR_COUNT = 7;

/**
 * Ilustración del hero hecha con datos reales: una simulación del primer tipo de
 * crédito y la mejor tasa DPF vigente. Reemplaza la foto de stock.
 */
export default function HeroShowcase({
  credit,
  bestTea,
}: {
  credit: ShowcaseCredit;
  bestTea: number | null;
}) {
  const { payment, balanceAt } = frenchSchedule(credit);
  const bars = Array.from({ length: BAR_COUNT }, (_, index) => {
    const month = Math.round((credit.termMonths * index) / (BAR_COUNT - 1));
    return { month, ratio: Math.max(balanceAt(month), 0) / credit.amount };
  });
  const totalInterest = payment * credit.termMonths - credit.amount;

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      {/* Resplandor detrás de la tarjeta */}
      <div className="absolute -inset-6 bg-gradient-to-br from-amber-200/60 via-orange-200/40 to-transparent rounded-[48px] blur-2xl" />

      {/* Tarjeta principal: simulación */}
      <div
        className="relative bg-white rounded-[28px] shadow-2xl shadow-orange-900/10 border border-slate-100 p-6 sm:p-7 animate-fade-up"
        style={{ animationDelay: "250ms" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#f1a501] flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Simulación</p>
              <p className="text-sm font-bold text-[#14183e]">Crédito {credit.name}</p>
            </div>
          </div>
          <span className="hidden min-[420px]:inline text-[11px] font-semibold text-[#df6951] bg-orange-50 px-2.5 py-1 rounded-full whitespace-nowrap">
            Sistema francés
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400 font-medium">Monto</p>
            <p className="text-2xl font-extrabold text-[#14183e] tracking-tight">{money(credit.amount)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 font-medium">Cuota mensual</p>
            <p className="text-2xl font-extrabold text-[#df6951] tracking-tight">{money(payment, 2)}</p>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {credit.termMonths} meses · {credit.annualRate}% anual · interés total {money(totalInterest)}
        </p>

        {/* Saldo pendiente: barras que crecen al cargar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
            <span>Saldo pendiente</span>
            <span>mes</span>
          </div>
          <div className="h-28 flex items-end gap-2.5">
            {bars.map(({ month, ratio }, index) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#f1a501] to-[#df6951] animate-grow-bar"
                  style={{
                    height: `${Math.max(ratio * 100, 4)}%`,
                    opacity: 0.55 + ratio * 0.45,
                    animationDelay: `${600 + index * 90}ms`,
                  }}
                />
                <span className="text-[10px] font-medium text-slate-400">{month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chip flotante: verificación facial */}
      <div
        className="absolute -left-4 sm:-left-14 -top-14 animate-fade-up"
        style={{ animationDelay: "900ms" }}
      >
        <div className="animate-float bg-white rounded-2xl shadow-xl border border-slate-100 pl-3 pr-4 py-3 flex items-center gap-3">
          <div className="relative w-10 h-10">
            <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-pulse-ring" />
            <div className="relative w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center overflow-hidden">
              <ScanFace className="w-5 h-5" />
              <span className="absolute left-1.5 right-1.5 h-px bg-emerald-500/80 animate-scan" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#14183e] flex items-center gap-1">
              Identidad verificada <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </p>
            <p className="text-[11px] text-slate-500">Rostro + prueba de vida</p>
          </div>
        </div>
      </div>

      {/* Chip flotante: mejor tasa DPF */}
      {bestTea !== null && (
        <div
          className="absolute -right-3 sm:-right-10 -bottom-7 animate-fade-up"
          style={{ animationDelay: "1150ms" }}
        >
          <div className="animate-float-slow bg-[#14183e] text-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-amber-300 flex items-center justify-center">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-300">Pólizas DPF hasta</p>
              <p className="text-sm font-extrabold">{bestTea}% TEA</p>
            </div>
          </div>
        </div>
      )}

      {/* Monedas decorativas */}
      <img src="/assets/hero/plane.png" alt="" className="absolute -top-10 right-6 w-11 rotate-[15deg] animate-float pointer-events-none" />
      <img src="/assets/hero/plane.png" alt="" className="hidden sm:block absolute top-1/2 -right-14 w-9 rotate-[35deg] animate-float-slow opacity-80 pointer-events-none" />
      <img src="/assets/hero/plane.png" alt="" className="hidden sm:block absolute -bottom-12 left-6 w-8 rotate-[55deg] animate-float opacity-60 pointer-events-none" />
    </div>
  );
}
