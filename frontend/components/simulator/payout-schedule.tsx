"use client";

import { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

export type PayoutRow = {
  period: number;
  /** Día del plazo en que se paga (base comercial de 360 días). */
  day: number;
  grossInterest: string;
  withholding: string;
  netInterest: string;
  capitalReturned: string;
  totalPayment: string;
};

export type InvestmentSimulation = {
  plan: { id: number; name: string };
  amount: string;
  teaPct: string;
  termDays: number;
  payoutMethod: "AT_MATURITY" | "MONTHLY";
  grossInterest: string;
  withholdingRatePct: string;
  withholding: string;
  netInterest: string;
  monthlyPayment: string | null;
  totalToReceive: string;
  payoutSchedule: PayoutRow[];
};

const PAYOUT_LABEL = {
  AT_MATURITY: "AL VENCIMIENTO",
  MONTHLY: "PAGO MENSUAL",
} as const;

/** Los importes llegan de la API con dos decimales fijos, no hay que reformatearlos. */
const usd = (value: string) => `$ ${value}`;

const dateEc = (date: Date) =>
  date
    .toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, "-");

export default function PayoutSchedule({
  result,
  onClose,
  onDownloadPdf,
  downloading = false,
  error,
}: {
  result: InvestmentSimulation;
  onClose: () => void;
  onDownloadPdf?: () => void;
  downloading?: boolean;
  error?: string;
}) {
  // Igual que la tabla de amortización: el fondo no se desplaza con el modal abierto.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const schedule = result.payoutSchedule;
  // Mismo criterio que el certificado en PDF: la emisión es hoy y cada pago cae en su día del plazo.
  const issued = new Date();
  const dayDate = (day: number) => dateEc(new Date(issued.getTime() + day * 86_400_000));
  const exempt = Number(result.withholdingRatePct) === 0;
  // Con un único pago la fila de totales solo repetiría esa misma fila.
  const showTotals = schedule.length > 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-primary/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-brand-card-bg w-full max-w-5xl max-h-[90vh] flex flex-col rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">

        {/* Modal Header */}
        <div className="bg-brand-primary px-6 md:px-8 py-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-serif-title text-xl font-bold text-white">Cronograma de Pagos</span>
          </div>
          <div className="flex items-center gap-3">
            {onDownloadPdf && (
              <button
                onClick={onDownloadPdf}
                disabled={downloading}
                className="bg-brand-accent hover:bg-brand-accent-dark text-white px-4 py-2 rounded-full transition-all text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {downloading ? "Generando..." : "Descargar PDF"}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 md:p-8 overflow-y-auto">

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm border border-red-200">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200/80">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">Capital invertido:</span>
              <div className="text-lg font-extrabold text-brand-primary">
                ${result.amount} USD
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">Plazo:</span>
              <div className="text-lg font-extrabold text-brand-primary">
                {result.termDays} días
              </div>
              <span className="text-xs text-[#5e6282]">Vence: {dayDate(result.termDays)}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">Tasa efectiva anual:</span>
              <div className="text-lg font-extrabold text-brand-accent">
                {Number(result.teaPct).toFixed(2)}%
              </div>
              <span className="text-xs text-[#5e6282]">{result.plan.name}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-1">Liquidación:</span>
              <div className="text-lg font-extrabold text-brand-primary">
                {PAYOUT_LABEL[result.payoutMethod]}
              </div>
            </div>
          </div>

          <h3 className="text-center text-brand-primary text-lg font-bold font-serif-title tracking-wide mb-6">
            DETALLE DE PAGOS DE INTERESES
          </h3>

          <p className="text-sm text-[#5e6282] text-center -mt-3 mb-6">
            {result.payoutMethod === "MONTHLY"
              ? "Los intereses se pagan cada 30 días y el capital se devuelve con el último pago. "
              : "Los intereses y el capital se pagan juntos al vencimiento. "}
            {exempt
              ? "Los plazos de 360 días o más están exentos de la retención en la fuente."
              : `Se retiene el ${Number(result.withholdingRatePct).toFixed(2)} % en la fuente sobre ${
                  result.payoutMethod === "MONTHLY" ? "cada pago de intereses" : "los intereses"
                }.`}
          </p>

          {/* Table Container */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center whitespace-nowrap">
                <thead className="text-brand-primary font-bold bg-slate-100/80 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-4 font-semibold">No.</th>
                    <th className="px-4 py-4 font-semibold">Día</th>
                    <th className="px-4 py-4 font-semibold">Fecha</th>
                    <th className="px-4 py-4 font-semibold">Interés<br />bruto</th>
                    <th className="px-4 py-4 font-semibold">Retención</th>
                    <th className="px-4 py-4 font-semibold">Interés<br />neto</th>
                    <th className="px-4 py-4 font-semibold">Capital<br />devuelto</th>
                    <th className="px-4 py-4 font-semibold">Total a<br />recibir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {schedule.map((row, idx) => (
                    <tr key={row.period} className={idx % 2 === 0 ? "bg-brand-card-bg" : "bg-cyan-50/30"}>
                      <td className="px-4 py-3">{row.period}</td>
                      <td className="px-4 py-3">{row.day}</td>
                      <td className="px-4 py-3">{dayDate(row.day)}</td>
                      <td className="px-4 py-3 text-right pr-6">{usd(row.grossInterest)}</td>
                      <td className="px-4 py-3 text-right pr-6">{usd(row.withholding)}</td>
                      <td className="px-4 py-3 text-right pr-6">{usd(row.netInterest)}</td>
                      <td className="px-4 py-3 text-right pr-6">{usd(row.capitalReturned)}</td>
                      <td className="px-4 py-3 text-right pr-6 font-medium text-slate-800">{usd(row.totalPayment)}</td>
                    </tr>
                  ))}

                  {/* Totales tomados del resumen de la API: son los mismos que imprime el certificado. */}
                  {showTotals && (
                    <tr className="bg-brand-card-bg font-bold text-slate-800 border-t-2 border-slate-200">
                      <td colSpan={3} className="px-4 py-4 text-center">TOTALES</td>
                      <td className="px-4 py-4 text-right pr-6">{usd(result.grossInterest)}</td>
                      <td className="px-4 py-4 text-right pr-6">{usd(result.withholding)}</td>
                      <td className="px-4 py-4 text-right pr-6">{usd(result.netInterest)}</td>
                      <td className="px-4 py-4 text-right pr-6">{usd(result.amount)}</td>
                      <td className="px-4 py-4 text-right pr-6 text-brand-accent">{usd(result.totalToReceive)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimers */}
          <div className="mt-8 space-y-4 text-xs text-slate-500 leading-relaxed max-w-5xl">
            <p>
              <strong className="text-slate-700">Nota:</strong> Los intereses se calculan con interés simple sobre una base comercial de 360 días. Las fechas se proyectan desde hoy ({dateEc(issued)}) y se confirmarán el día en que se acredite el capital.
            </p>
            <p>
              <strong className="text-slate-700">Importante:</strong> Los valores de este simulador son referenciales. Los definitivos constarán en el certificado de depósito a plazo fijo que emita la institución al aperturar la póliza.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
