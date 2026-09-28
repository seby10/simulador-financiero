/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { fetchCreditTypes, fetchIndirectFees, simulateCredit, downloadAmortizationPdf } from "@/lib/api";
import AmortizationTable from "./amortization-table";
import FaqAccordion from "@/components/faq-accordion";

export default function CreditSimulatorForm() {
  const [creditTypes, setCreditTypes] = useState<any[]>([]);
  const [indirectFees, setIndirectFees] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [amount, setAmount] = useState<string>("");
  const [termMonths, setTermMonths] = useState<string>("");
  const [creditTypeId, setCreditTypeId] = useState<string>("");
  const [method, setMethod] = useState<"FRENCH" | "GERMAN">("FRENCH");
  const [optionalFeeIds, setOptionalFeeIds] = useState<number[]>([]);

  // Result State
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [loadingSimulation, setLoadingSimulation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [types, fees] = await Promise.all([
          fetchCreditTypes(),
          fetchIndirectFees()
        ]);
        setCreditTypes(types);
        setIndirectFees(fees.filter((f: any) => !f.isMandatory));
        if (types.length > 0) {
          setCreditTypeId(types[0].id.toString());
        }
      } catch (err) {
        console.error(err);
        setError("Error al cargar los datos del sistema.");
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoadingSimulation(true);
    setSimulationResult(null);

    try {
      const result = await simulateCredit({
        creditTypeId: Number(creditTypeId),
        amount: amount,
        termMonths: Number(termMonths),
        method: method,
        optionalFeeIds: optionalFeeIds,
      });
      setSimulationResult(result);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al calcular el crédito.");
    } finally {
      setLoadingSimulation(false);
    }
  };

  const handleClear = () => {
    setAmount("");
    setTermMonths("");
    setSimulationResult(null);
    setError(null);
    setOptionalFeeIds([]);
  };

  const activeCreditType = creditTypes.find(t => t.id.toString() === creditTypeId);

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center py-32 text-brand-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        <span className="ml-3 font-semibold">Cargando simulador...</span>
      </div>
    );
  }

  // Dynamic images mapping based on credit type name
  const getCreditImage = () => {
    if (activeCreditType?.imageUrl) {
      return activeCreditType.imageUrl;
    }

    const name = activeCreditType?.name;
    if (!name) return "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

    const lowerName = name.toLowerCase();
    if (lowerName.includes('consumo')) {
      return "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; // retail / shopping
    } else if (lowerName.includes('micro') || lowerName.includes('negocio')) {
      return "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; // small business
    } else if (lowerName.includes('hipotecario') || lowerName.includes('casa') || lowerName.includes('vivienda')) {
      return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; // house / real estate
    } else if (lowerName.includes('educa')) {
      return "https://plus.unsplash.com/premium_photo-1683887034491-f58b4c4fca72?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8ZXN0dWRpYW50ZXMlMjBxdWUlMjB0cmFiYWphbnxlbnwwfHwwfHx8MA%3D%3D"; // graduation / university
    }
    return "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; // generic office fallback
  };

  const currentImage = getCreditImage();

  return (
    <div className="w-full flex flex-col relative">
      {/* 1. Header Banner */}
      <div className="pt-10 pb-6 text-center max-w-3xl mx-auto px-4">
        <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#df6951] mb-2">
          HERRAMIENTA DE SIMULACIÓN
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#14183e] font-serif-title leading-tight mb-4">
          Simulador de Crédito
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Calcula tus cuotas mensuales, comparativa de sistemas de amortización y obtén tu desglose detallado al instante.
        </p>
      </div>

      {/* 2. Credit Types Filter Tabs (Pills) */}
      <div className="w-full flex flex-wrap justify-center items-center gap-2.5 sm:gap-3 px-4 mb-10">
        {creditTypes.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              setCreditTypeId(type.id.toString());
              setSimulationResult(null);
            }}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${creditTypeId === type.id.toString()
                ? "bg-[#df6951] text-white shadow-lg shadow-orange-500/25 scale-105"
                : "bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-sm"
              }`}
          >
            {type.name}
          </button>
        ))}
      </div>

      {/* 3. Main Form & Card Container */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Feature Image Card */}
          <div className="lg:col-span-5 relative group rounded-[32px] overflow-hidden shadow-xl border border-slate-100 bg-white">
            <div className="relative h-[340px] lg:h-[480px] w-full overflow-hidden">
              <img
                src={currentImage}
                alt={activeCreditType?.name || "Simulación"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14183e]/85 via-[#14183e]/20 to-transparent"></div>
            </div>

            {/* Floating Info Overlay */}
            <div className="absolute bottom-6 left-6 right-6 text-white p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <span className="text-xs font-bold uppercase tracking-widest text-[#f1a501] block mb-1">
                TASA REFERENCIAL
              </span>
              <h3 className="text-2xl font-bold font-serif-title text-white">
                {activeCreditType?.annualInterestRate}% <span className="text-sm font-normal opacity-90">Anual</span>
              </h3>
              <p className="text-xs text-slate-200 mt-1 line-clamp-2">
                {activeCreditType?.description || `Monto desde $${activeCreditType?.minAmount} hasta $${activeCreditType?.maxAmount}`}
              </p>
            </div>
          </div>

          {/* Right Form Container */}
          <div className="lg:col-span-7 bg-white rounded-[32px] p-6 sm:p-10 shadow-xl border border-slate-100">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#14183e] font-serif-title mb-2">
                {activeCreditType?.name}
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm">
                Ingresa los datos solicitados para calcular tu tabla de amortización.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCalculate} className="space-y-5">

              {/* Field 1: Amount */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                  ¿Cuánto dinero necesitas? (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min={activeCreditType?.minAmount || "0"}
                    max={activeCreditType?.maxAmount}
                    step="0.01"
                    className="w-full pl-9 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#df6951]/20 focus:border-[#df6951] outline-none text-slate-900 font-semibold text-base transition-all"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={`Min: $${activeCreditType?.minAmount} - Max: $${activeCreditType?.maxAmount}`}
                    required
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium">
                  <span>Mínimo: ${activeCreditType?.minAmount}</span>
                  <span>Máximo: ${activeCreditType?.maxAmount}</span>
                </div>
              </div>

              {/* Field 2: Term in Months */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                  Plazo en Meses
                </label>
                <input
                  type="number"
                  min={activeCreditType?.minTermMonths || "1"}
                  max={activeCreditType?.maxTermMonths}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#df6951]/20 focus:border-[#df6951] outline-none text-slate-900 font-semibold text-base transition-all"
                  value={termMonths}
                  onChange={e => setTermMonths(e.target.value)}
                  placeholder={`Ej: 24 (Máximo ${activeCreditType?.maxTermMonths} meses)`}
                  required
                />
              </div>

              {/* Field 3: Amortization System */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                  Sistema de Amortización
                </label>
                <select
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#df6951]/20 focus:border-[#df6951] outline-none text-slate-900 font-semibold text-base transition-all cursor-pointer"
                  value={method}
                  onChange={e => setMethod(e.target.value as any)}
                >
                  <option value="FRENCH">Sistema Francés (Cuotas Fijas)</option>
                  <option value="GERMAN">Sistema Alemán (Cuotas Decrecientes)</option>
                </select>
              </div>

              {/* Optional Indirect Fees selection */}
              {indirectFees.length > 0 && (
                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                    Servicios / Rubros Opcionales
                  </label>
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    {indirectFees.map((fee: any) => (
                      <label key={fee.id} className="flex items-center gap-3 text-xs text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={optionalFeeIds.includes(fee.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setOptionalFeeIds([...optionalFeeIds, fee.id]);
                            } else {
                              setOptionalFeeIds(optionalFeeIds.filter(id => id !== fee.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-[#df6951] focus:ring-[#df6951]"
                        />
                        <span>{fee.name} ({fee.feeType === 'PERCENTAGE' ? `${fee.value}%` : `$${fee.value}`})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loadingSimulation || !amount || !termMonths || !creditTypeId}
                  className="flex-1 bg-[#df6951] hover:bg-[#c85640] text-white font-bold py-4 px-8 rounded-full shadow-lg shadow-orange-500/25 hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{loadingSimulation ? "Calculando..." : "Calcular Cuotas"}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-4 px-6 rounded-full transition-all text-center"
                >
                  Limpiar
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* Result Table Modal */}
        {simulationResult && (
          <AmortizationTable
            result={simulationResult}
            onClose={() => setSimulationResult(null)}
            onDownloadPdf={async () => {
              await downloadAmortizationPdf({
                creditTypeId: Number(creditTypeId),
                amount,
                termMonths: Number(termMonths),
                method,
                optionalFeeIds,
              });
            }}
          />
        )}

      </div>

      {/* FAQ Section matching user screenshot */}
      <FaqAccordion
        items={[
          {
            question: "¿Para qué sirve el simulador?",
            answer: "Un simulador de crédito se utiliza para estimar las cuotas mensuales y el costo total de un préstamo, así puedes evaluar diferentes opciones antes de tomar una decisión."
          },
          {
            question: "¿Los valores son los finales?",
            answer: "Los valores calculados en el simulador son de carácter referencial e informativo. Los valores definitivos dependerán de la evaluación crediticia y la fecha exacta de desembolso."
          },
          {
            question: "¿Puedo simular más de una vez?",
            answer: "¡Sí, por supuesto! Puedes realizar todas las simulaciones que desees modificando el monto, plazo y tipo de tabla de amortización (Francés o Alemán)."
          }
        ]}
      />
    </div>
  );
}
