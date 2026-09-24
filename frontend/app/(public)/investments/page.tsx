"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Calculator, ChevronRight, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import FaqAccordion from "@/components/faq-accordion";
import { API_URL } from "@/lib/api";

type InvestmentPlan = {
  id: number;
  name: string;
  minAmount: string;
  maxAmount: string;
  termMinDays: number;
  termMaxDays: number;
  tea: string;
  allowsMonthlyPayout: boolean;
  requiredDocuments: string[];
  imageUrl?: string;
};

type SimulationResult = {
  plan: { id: number; name: string };
  amount: string;
  teaPct: string;
  termDays: number;
  payoutMethod: 'AT_MATURITY' | 'MONTHLY';
  grossInterest: string;
  withholdingRatePct: string;
  withholding: string;
  netInterest: string;
  monthlyPayment: string | null;
  totalToReceive: string;
  payoutSchedule: any[];
};

export const dynamic = 'force-dynamic';

export default function InvestmentsSimulatorPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);

  // Form State
  const [amount, setAmount] = useState<string>("1000");
  const [termDays, setTermDays] = useState<string>("360");
  const [payoutMethod, setPayoutMethod] = useState<'AT_MATURITY' | 'MONTHLY'>('AT_MATURITY');

  // Simulation State
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/investment/plans`)
      .then(r => r.json())
      .then((data: InvestmentPlan[]) => {
        setPlans(data);
        if (data.length > 0) setActivePlanId(data[0].id);
      })
      .catch(e => console.error(e));
  }, []);

  const activePlan = plans.find(p => p.id === activePlanId);

  const handleSimulate = async () => {
    if (!activePlanId) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/investment/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: activePlanId,
          amount,
          termDays: parseInt(termDays),
          payoutMethod,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Error al simular. Verifica los montos y plazos permitidos.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentImage = activePlan?.imageUrl || "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=1000&auto=format&fit=crop";

  return (
    <div className="min-h-screen font-sans text-slate-800 flex flex-col bg-transparent relative">
      <Navbar />

      <main className="flex-1 pb-20 relative z-10">
        {/* Header Banner */}
        <div className="pt-10 pb-6 text-center max-w-3xl mx-auto px-4">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#f1a501] mb-2">
            INVERSIONES A PLAZO FIJO (DPF)
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#14183e] font-serif-title leading-tight mb-4">
            Simulador de Pólizas
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Haz crecer tu patrimonio con rendimiento garantizado de hasta el 11.25% anual de forma 100% digital y segura.
          </p>
        </div>

        {/* Plan Selector Pills */}
        <div className="w-full flex flex-wrap justify-center items-center gap-2.5 sm:gap-3 px-4 mb-10">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => {
                setActivePlanId(plan.id);
                setResult(null);
              }}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${activePlanId === plan.id
                  ? "bg-[#f1a501] text-white shadow-lg shadow-amber-500/25 scale-105"
                  : "bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-sm"
                }`}
            >
              {plan.name}
            </button>
          ))}
        </div>

        {/* Main Form & Image Section */}
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Feature Image Card */}
            <div className="lg:col-span-5 relative group rounded-[32px] overflow-hidden shadow-xl border border-slate-100 bg-white">
              <div className="relative h-[340px] lg:h-[500px] w-full overflow-hidden">
                <Image
                  src={currentImage}
                  alt="Inversión DPF"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#14183e]/85 via-[#14183e]/20 to-transparent"></div>
              </div>

              {/* Overlay info */}
              {activePlan && (
                <div className="absolute bottom-6 left-6 right-6 text-white p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#f1a501] block mb-1">
                    TASA DE RENDIMIENTO (TEA)
                  </span>
                  <h3 className="text-3xl font-extrabold font-serif-title text-white">
                    {Number(activePlan.tea).toFixed(2)}% <span className="text-sm font-normal opacity-90">Anual</span>
                  </h3>
                  <p className="text-xs text-slate-200 mt-1">
                    Modalidad: {activePlan.allowsMonthlyPayout ? "Pago al vencimiento o mensual" : "Solo al vencimiento"}
                  </p>
                </div>
              )}
            </div>

            {/* Right Form Card */}
            <div className="lg:col-span-7 bg-white rounded-[32px] p-6 sm:p-10 shadow-xl border border-slate-100">
              {activePlan ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#14183e] font-serif-title mb-2">
                      {activePlan.name}
                    </h2>
                    <p className="text-slate-500 text-xs sm:text-sm">
                      Ingresa el monto a invertir y el plazo deseado para calcular tu rentabilidad.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                      ¿Cuánto dinero deseas invertir? (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-9 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#f1a501]/30 focus:border-[#f1a501] outline-none text-slate-900 font-semibold text-base transition-all"
                        placeholder={`Mínimo: $${activePlan.minAmount}`}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium">
                      <span>Mínimo: ${Number(activePlan.minAmount)}</span>
                      <span>Máximo: ${Number(activePlan.maxAmount)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                      Plazo en Días
                    </label>
                    <input
                      type="number"
                      value={termDays}
                      onChange={(e) => setTermDays(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#f1a501]/30 focus:border-[#f1a501] outline-none text-slate-900 font-semibold text-base transition-all"
                      placeholder="Ej: 360"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium">
                      <span>Plazo min: {activePlan.termMinDays} días</span>
                      <span>Plazo máx: {activePlan.termMaxDays} días</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5e6282] mb-2">
                      Modalidad de Pago de Intereses
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPayoutMethod('AT_MATURITY')}
                        className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all ${payoutMethod === 'AT_MATURITY'
                            ? 'border-[#f1a501] bg-amber-50/50 text-[#14183e] shadow-sm'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                      >
                        Al Vencimiento
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayoutMethod('MONTHLY')}
                        disabled={!activePlan.allowsMonthlyPayout}
                        className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${payoutMethod === 'MONTHLY'
                            ? 'border-[#f1a501] bg-amber-50/50 text-[#14183e] shadow-sm'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                      >
                        Pago Mensual
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm border border-red-200">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSimulate}
                    disabled={loading}
                    className="w-full bg-[#f1a501] hover:bg-amber-600 text-white py-4 rounded-full font-bold text-base shadow-lg shadow-amber-500/25 hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? "Calculando..." : "Calcular Rendimiento"}
                    {!loading && <Calculator className="w-5 h-5" />}
                  </button>

                  {/* Simulation Result Details */}
                  {result && (
                    <div className="mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                      <div className="bg-[#fefcf9] border border-amber-200/80 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-start gap-3 mb-6">
                          <div className="bg-amber-100 p-2 rounded-full shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-[#f1a501]" />
                          </div>
                          <div>
                            <h4 className="text-[#14183e] font-bold text-lg font-serif-title">Resultado de Simulación</h4>
                            <p className="text-slate-500 text-xs">Valores referenciales. Incluye retención fiscal del {Number(result.withholdingRatePct)}%.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                            <p className="text-[#5e6282] text-[11px] font-bold uppercase tracking-wider mb-1">Monto a Invertir</p>
                            <p className="text-xl font-extrabold text-[#14183e]">${Number(result.amount).toFixed(2)}</p>
                          </div>
                          <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                            <p className="text-[#5e6282] text-[11px] font-bold uppercase tracking-wider mb-1">Tasa TEA</p>
                            <p className="text-xl font-extrabold text-[#f1a501]">{Number(result.teaPct).toFixed(2)}%</p>
                          </div>
                          <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                            <p className="text-[#5e6282] text-[11px] font-bold uppercase tracking-wider mb-1">Plazo</p>
                            <p className="text-xl font-extrabold text-[#14183e]">{result.termDays} días</p>
                          </div>
                          <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                            <p className="text-[#5e6282] text-[11px] font-bold uppercase tracking-wider mb-1">Interés Neto</p>
                            <p className="text-xl font-extrabold text-emerald-600">+${Number(result.netInterest).toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-amber-200/60 flex items-center justify-between">
                          <div>
                            <p className="text-[#5e6282] text-xs font-bold uppercase tracking-wider">Total a Recibir</p>
                            <p className="text-3xl font-black text-[#14183e]">${Number(result.totalToReceive).toFixed(2)}</p>
                          </div>
                          {result.monthlyPayment && (
                            <div className="text-right">
                              <p className="text-[#5e6282] text-xs font-bold uppercase tracking-wider">Pago Mensual</p>
                              <p className="text-lg font-bold text-amber-700">${Number(result.monthlyPayment).toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!result || !activePlanId) return;
                          const params = new URLSearchParams({
                            planId: String(activePlanId),
                            amount: result.amount,
                            termDays: String(result.termDays),
                            payoutMethod: result.payoutMethod,
                          });
                          const requestPath = `/investments/request?${params.toString()}`;

                          try {
                            const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
                            if (res.ok) {
                              router.push(requestPath);
                            } else {
                              router.push(`/login?redirect=${encodeURIComponent(requestPath)}`);
                            }
                          } catch {
                            router.push(`/login?redirect=${encodeURIComponent(requestPath)}`);
                          }
                        }}
                        className="w-full mt-4 bg-[#14183e] hover:bg-slate-800 text-white py-4 rounded-full font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                      >
                        Abrir esta Póliza <ChevronRight className="w-5 h-5 text-[#f1a501]" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-500 font-medium">
                  {loading ? "Cargando planes de inversión..." : "No hay planes de inversión disponibles en este momento."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <FaqAccordion
          items={[
            {
              question: "¿Para qué sirve el simulador?",
              answer: "Un simulador de inversiones a plazo fijo te permite estimar el rendimiento neto y los intereses exactos que ganará tu dinero en función del plazo en días y el monto invertido."
            },
            {
              question: "¿Los valores son los finales?",
              answer: "Los valores calculados incluyen la retención fiscal legal y corresponden a una simulación referencial. Los valores definitivos se confirmarán en tu certificado digital al aperturar la póliza."
            },
            {
              question: "¿Puedo simular más de una vez?",
              answer: "¡Sí, por supuesto! Puedes probar todas las combinaciones de plazos, montos y modalidades de pago (mensual o al vencimiento) que desees sin compromiso."
            }
          ]}
        />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
