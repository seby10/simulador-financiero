/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { fetchCreditTypes, fetchIndirectFees, simulateCredit, downloadAmortizationPdf } from "@/lib/api";
import AmortizationTable from "./amortization-table";

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
      return "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; // graduation / university
    }
    return "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"; // generic office fallback
  };

  const currentImage = getCreditImage();

  return (
    <div className="w-full flex flex-col">
      {/* 1. Tabs Menu - Aligned Right first */}
      <div className="w-full flex justify-end">
        <div className="bg-brand-secondary text-white flex flex-wrap justify-center md:justify-end items-center text-sm md:text-base py-3 px-6 md:px-8 md:rounded-bl-3xl shadow-sm">
          {creditTypes.map((type, index) => (
            <div key={type.id} className="flex items-center">
              <button 
                type="button"
                onClick={() => {
                  setCreditTypeId(type.id.toString());
                  setSimulationResult(null);
                }}
                className={`px-2 md:px-3 py-1 transition-colors ${
                  creditTypeId === type.id.toString() ? "font-bold underline decoration-2 underline-offset-4" : "hover:text-white/80"
                }`}
              >
                {type.name}
              </button>
              {index < creditTypes.length - 1 && <span className="text-white/50 mx-1 md:mx-2">|</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Title centered below it */}
      <div className="w-full text-center mt-10 mb-4">
        <h1 className="text-3xl font-bold text-brand-primary uppercase tracking-wide">
          SIMULADOR DE CRÉDITO
        </h1>
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 mt-12 mb-20">
        <div className="flex flex-col lg:flex-row gap-12 items-start justify-center">
          
          {/* Left Image Section */}
          <div className="relative w-full lg:w-[450px] shrink-0 mt-4">
            {/* The decorative frame behind */}
            <div className="absolute inset-0 bg-[#e6e2df] rounded-[40px] transform rotate-3 scale-105 -z-10"></div>
            
            <img 
              src={currentImage} 
              alt={activeCreditType?.name || "Asesoramiento"} 
              className="w-full h-[450px] object-cover rounded-[30px] shadow-lg transition-opacity duration-500"
            />
            
            {/* Blue Label over image */}
            <div className="absolute bottom-6 right-[-20px] bg-brand-primary text-white py-3 px-8 rounded-l-xl shadow-xl z-10 font-bold tracking-wider text-sm uppercase">
              {activeCreditType?.name || "CRÉDITO"}
            </div>
          </div>

          {/* Right Form Section */}
          <div className="w-full lg:w-[500px] flex flex-col pl-4">
            <h2 className="text-3xl font-normal text-brand-primary mb-2">
              {activeCreditType?.name}
            </h2>
            <p className="text-slate-500 text-sm mb-6 border-b border-slate-200 pb-6">
              {activeCreditType?.description || `Destinado para capital de trabajo y adquisición de activos desde $${activeCreditType?.minAmount} hasta $${activeCreditType?.maxAmount}`}
            </p>

            <h3 className="text-brand-primary font-semibold mb-6">Ingrese los Datos</h3>

            {error && (
              <div className="mb-6 p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCalculate} className="space-y-4">
              
              {/* Tipo de Crédito Read-Only Block */}
              <div className="flex w-full">
                <div className="bg-brand-primary text-white text-sm font-semibold px-4 py-3 w-56 flex items-center border border-brand-primary">
                  Tipo de Crédito <span className="ml-auto font-bold text-brand-secondary pl-2">|</span>
                </div>
                <div className="flex-1 px-4 py-3 border-y border-r border-slate-300 bg-white text-slate-800 text-sm flex items-center justify-between">
                  <span>{activeCreditType?.name}</span>
                  <span className="text-xs font-bold text-brand-primary bg-slate-100 px-2 py-1 rounded">
                    Tasa: {activeCreditType?.annualInterestRate}%
                  </span>
                </div>
              </div>

              {/* Custom Input Block */}
              <div className="flex w-full">
                <div className="bg-brand-primary text-white text-sm font-semibold px-4 py-3 w-56 flex items-center border border-brand-primary">
                  Cuánto dinero necesita? <span className="ml-auto font-bold text-brand-secondary pl-2">|</span>
                </div>
                <input 
                  type="number"
                  min={activeCreditType?.minAmount || "0"}
                  max={activeCreditType?.maxAmount}
                  step="0.01"
                  className="flex-1 px-4 py-3 border-y border-r border-slate-300 outline-none focus:ring-1 focus:ring-brand-secondary bg-white text-slate-800 text-sm min-w-0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`mín: ${activeCreditType?.minAmount} - máx: ${activeCreditType?.maxAmount}`}
                  required
                />
              </div>

              {/* Custom Input Block */}
              <div className="flex w-full">
                <div className="bg-brand-primary text-white text-sm font-semibold px-4 py-3 w-56 flex items-center border border-brand-primary">
                  Plazo en Meses <span className="ml-auto font-bold text-brand-secondary pl-2">|</span>
                </div>
                <input 
                  type="number"
                  min={activeCreditType?.minTermMonths || "1"}
                  max={activeCreditType?.maxTermMonths}
                  className="flex-1 px-4 py-3 border-y border-r border-slate-300 outline-none focus:ring-1 focus:ring-brand-secondary bg-white text-slate-800 text-sm min-w-0"
                  value={termMonths}
                  onChange={e => setTermMonths(e.target.value)}
                  placeholder={`máx: ${activeCreditType?.maxTermMonths}`}
                  required
                />
              </div>

              {/* Custom Select Block */}
              <div className="flex w-full">
                <div className="bg-brand-primary text-white text-sm font-semibold px-4 py-3 w-56 flex items-center border border-brand-primary">
                  Tipo de Amortización <span className="ml-auto font-bold text-brand-secondary pl-2">|</span>
                </div>
                <select 
                  className="flex-1 px-4 py-3 border-y border-r border-slate-300 outline-none focus:ring-1 focus:ring-brand-secondary bg-white text-slate-800 text-sm appearance-none min-w-0 cursor-pointer"
                  value={method}
                  onChange={e => setMethod(e.target.value as any)}
                >
                  <option value="FRENCH">Francés (Cuota Fija)</option>
                  <option value="GERMAN">Alemán (Cuota Variable)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-6 pt-6">
                <button 
                  type="submit"
                  disabled={loadingSimulation || !amount || !termMonths || !creditTypeId}
                  className="flex items-center group relative overflow-hidden rounded-full shadow-md border border-slate-200 bg-gradient-to-b from-white to-slate-100 pl-6 pr-1 py-1 hover:border-brand-primary hover:text-brand-primary transition-colors disabled:opacity-50"
                >
                  <span className="italic font-semibold text-slate-500 group-hover:text-brand-primary mr-4 transition-colors">
                    {loadingSimulation ? "Calculando..." : "Calcular"}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-inner">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>

                <button 
                  type="button"
                  onClick={handleClear}
                  className="flex items-center group relative overflow-hidden rounded-full shadow-md border border-slate-200 bg-gradient-to-b from-white to-slate-100 pl-6 pr-1 py-1 hover:border-brand-primary hover:text-brand-primary transition-colors"
                >
                  <span className="italic font-semibold text-slate-500 group-hover:text-brand-primary mr-4 transition-colors">Limpiar</span>
                  <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-inner">
                    <ChevronRight className="w-5 h-5" />
                  </div>
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
    </div>
  );
}
