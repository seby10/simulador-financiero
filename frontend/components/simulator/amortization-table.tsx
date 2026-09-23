/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { useEffect } from "react";

export default function AmortizationTable({ 
  result, 
  onClose,
  onDownloadPdf
}: { 
  result: any, 
  onClose: () => void,
  onDownloadPdf?: () => void
}) {
  const { summary, schedule } = result;

  // Prevent scrolling on body when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Calculate dates based on today
  const today = new Date();
  const getFormattedDate = (addMonths: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + addMonths);
    return d.toLocaleDateString("es-EC", { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  // Add Period 0
  const periodZero = {
    period: 0,
    date: getFormattedDate(0),
    principal: "",
    interest: "",
    feesTotal: "",
    totalPayment: "",
    closingBalance: summary.principal
  };

  const enhancedSchedule = schedule.map((row: any) => ({
    ...row,
    date: getFormattedDate(row.period)
  }));

  // Calculate Totals
  const totalPrincipal = schedule.reduce((sum: number, row: any) => sum + parseFloat(row.principal), 0).toFixed(2);
  const totalInterest = schedule.reduce((sum: number, row: any) => sum + parseFloat(row.interest), 0).toFixed(2);
  const totalFees = schedule.reduce((sum: number, row: any) => sum + parseFloat(row.feesTotal), 0).toFixed(2);
  const totalPayments = schedule.reduce((sum: number, row: any) => sum + parseFloat(row.totalPayment), 0).toFixed(2);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] flex flex-col rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-brand-secondary px-6 py-4 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white">Simulador de Crédito</h2>
          <div className="flex items-center gap-4">
            {onDownloadPdf && (
              <button 
                onClick={onDownloadPdf}
                className="text-white hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors text-sm font-semibold border border-white/30"
              >
                Descargar PDF
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-white hover:bg-white/20 p-1 rounded-md transition-colors"
              title="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 md:p-8 overflow-y-auto">
          
          {/* Summary Grid */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-8 mb-10 max-w-3xl mx-auto">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800 mb-1">Monto a solicitar:</span>
              <div className="text-slate-500 pb-1 border-b border-brand-secondary">
                {summary.principal} USD
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800 mb-1">Plazo:</span>
              <div className="text-slate-500 pb-1 border-b border-brand-secondary">
                {summary.termMonths} meses
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800 mb-1">Tasa efectiva:</span>
              <div className="text-slate-500 pb-1 border-b border-brand-secondary">
                {Number(summary.nominalAnnualRatePct).toFixed(2)} %
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800 mb-1">Tipo de Cuota:</span>
              <div className="text-slate-500 pb-1 border-b border-brand-secondary uppercase">
                {summary.method === 'FRENCH' ? 'FIJA' : 'VARIABLE'}
              </div>
            </div>
          </div>

          <h3 className="text-center text-brand-primary text-lg font-medium tracking-wide mb-6">
            TABLA DE AMORTIZACIÓN
          </h3>

          {/* Table Container */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead className="text-brand-primary font-bold bg-white border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-4 font-semibold">No.</th>
                    <th className="px-4 py-4 font-semibold">Fecha</th>
                    <th className="px-4 py-4 font-semibold">Abono al<br/>Capital</th>
                    <th className="px-4 py-4 font-semibold">Interés</th>
                    <th className="px-4 py-4 font-semibold">Seguro</th>
                    <th className="px-4 py-4 font-semibold">Cuota</th>
                    <th className="px-4 py-4 font-semibold">Saldo Capital</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {/* Period 0 */}
                  <tr className="bg-cyan-50/30">
                    <td className="px-4 py-3">{periodZero.period}</td>
                    <td className="px-4 py-3">{periodZero.date}</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right pr-6">$ {periodZero.closingBalance}</td>
                  </tr>
                  
                  {/* Periods 1..N */}
                  {enhancedSchedule.map((row: any, idx: number) => (
                    <tr key={row.period} className={idx % 2 === 0 ? "bg-white" : "bg-cyan-50/30"}>
                      <td className="px-4 py-3 text-brand-secondary">{row.period}</td>
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3 text-right pr-6">$ {row.principal}</td>
                      <td className="px-4 py-3 text-right pr-6">$ {row.interest}</td>
                      <td className="px-4 py-3 text-right pr-6">$ {row.feesTotal}</td>
                      <td className="px-4 py-3 text-right pr-6 font-medium text-slate-800">$ {row.totalPayment}</td>
                      <td className="px-4 py-3 text-right pr-6">$ {row.closingBalance}</td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="bg-white font-bold text-slate-800 border-t-2 border-slate-200">
                    <td colSpan={2} className="px-4 py-4 text-center">TOTALES</td>
                    <td className="px-4 py-4 text-right pr-6">$ {totalPrincipal}</td>
                    <td className="px-4 py-4 text-right pr-6">$ {totalInterest}</td>
                    <td className="px-4 py-4 text-right pr-6">$ {totalFees}</td>
                    <td className="px-4 py-4 text-right pr-6 text-brand-primary">$ {totalPayments}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Disclaimers */}
          <div className="mt-8 space-y-4 text-xs text-slate-500 leading-relaxed max-w-5xl">
            <p>
              <strong className="text-slate-700">Nota:</strong> Los resultados de este simulador son referenciales, y no representan cotizaciones ni precalificaciones para un crédito. Nuestros asesores están prestos a atender tus dudas. Los detalles específicos de tu crédito te serán proporcionados con la firma del contrato.
            </p>
            <p>
              <strong className="text-slate-700">Importante:</strong> Los valores calculados corresponden a una simulación, la cuota calculada está redondeada por lo que es aproximada y podría variar una vez que se incluyan tasas de seguro y otros valores relacionados.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
