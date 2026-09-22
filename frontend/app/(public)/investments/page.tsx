"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Calculator, ChevronRight, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import Navbar from "@/components/navbar";
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

  const currentImage = activePlan?.imageUrl || "https://images.unsplash.com/photo-1579621970588-a3f5ce761694?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

  return (
    <div className="min-h-screen font-sans text-slate-800 flex flex-col transition-colors" style={{ backgroundColor: 'var(--brand-page-bg, #f8fafc)' }}>
      <Navbar />

      <main className="flex-1 pb-20">
        <div className="bg-brand-primary text-white pt-12 pb-24 px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">SIMULADOR DE PÓLIZAS</h1>
          <p className="text-lg text-blue-200 max-w-2xl mx-auto">
            Haz crecer tu dinero de forma segura. Calcula el rendimiento de tu inversión a plazo fijo (DPF).
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 -mt-12">
          <div 
            className="rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row border border-slate-200/60"
            style={{ backgroundColor: 'var(--brand-card-bg, #ffffff)' }}
          >
            
            {/* Left Image Section */}
            <div className="lg:w-5/12 relative min-h-[300px] lg:min-h-full">
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-brand-primary/80 via-transparent to-transparent"></div>
              <Image 
                src={currentImage} 
                alt="Inversión" 
                fill 
                className="object-cover"
              />
              {activePlan && (
                <div className="absolute bottom-6 left-6 z-20">
                  <div className="bg-brand-secondary text-white px-4 py-1.5 rounded-full font-bold text-sm inline-block shadow-lg uppercase tracking-wider mb-2">
                    {activePlan.name}
                  </div>
                  <h3 className="text-2xl font-bold text-white drop-shadow-md">Tasa Especial: {Number(activePlan.tea).toFixed(2)}%</h3>
                </div>
              )}
            </div>

            {/* Right Form Section */}
            <div className="lg:w-7/12 p-8 md:p-10">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {plans.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setActivePlanId(plan.id)}
                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                      activePlanId === plan.id 
                        ? "bg-brand-primary text-white shadow-md scale-105" 
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {plan.name}
                  </button>
                ))}
              </div>

              {activePlan ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">¿Cuánto dinero deseas invertir?</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-lg font-semibold transition-all"
                        placeholder={`Mínimo: ${activePlan.minAmount}`}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Monto permitido: ${Number(activePlan.minAmount)} - ${Number(activePlan.maxAmount)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Plazo en Días</label>
                    <input 
                      type="number" 
                      value={termDays}
                      onChange={(e) => setTermDays(e.target.value)}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-secondary outline-none text-lg font-semibold transition-all"
                      placeholder={`Ej: 360`}
                    />
                    <p className="text-xs text-slate-500 mt-2">Plazo permitido: {activePlan.termMinDays} - {activePlan.termMaxDays} días</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Modalidad de Pago de Intereses</label>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setPayoutMethod('AT_MATURITY')}
                        className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all ${payoutMethod === 'AT_MATURITY' ? 'border-brand-secondary bg-blue-50 text-brand-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                      >
                        Al Vencimiento
                      </button>
                      <button 
                        onClick={() => setPayoutMethod('MONTHLY')}
                        disabled={!activePlan.allowsMonthlyPayout}
                        className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${payoutMethod === 'MONTHLY' ? 'border-brand-secondary bg-blue-50 text-brand-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                      >
                        Pago Mensual
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3 text-sm border border-red-100">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <button 
                    onClick={handleSimulate}
                    disabled={loading}
                    className="w-full bg-brand-secondary hover:bg-brand-secondary/90 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                  >
                    {loading ? "Calculando..." : "Calcular Rendimiento"}
                    {!loading && <Calculator className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                  </button>

                  {result && (
                    <div className="mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                        <div className="flex items-start gap-4 mb-6">
                          <div className="bg-green-100 p-2 rounded-full shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h4 className="text-green-800 font-extrabold text-xl">Resultado de Simulación</h4>
                            <p className="text-green-700 text-sm">Estos valores son referenciales y ya incluyen la retención fiscal del {Number(result.withholdingRatePct)}%.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                          <div>
                            <p className="text-green-700 text-xs font-bold uppercase tracking-wider mb-1">Monto a Invertir</p>
                            <p className="text-2xl font-extrabold text-green-900">${Number(result.amount).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-green-700 text-xs font-bold uppercase tracking-wider mb-1">Tasa (TEA)</p>
                            <p className="text-2xl font-extrabold text-green-900">{Number(result.teaPct).toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-green-700 text-xs font-bold uppercase tracking-wider mb-1">Plazo</p>
                            <p className="text-2xl font-extrabold text-green-900">{result.termDays} días</p>
                          </div>
                          <div>
                            <p className="text-green-700 text-xs font-bold uppercase tracking-wider mb-1">Interés Neto Ganado</p>
                            <p className="text-2xl font-extrabold text-brand-secondary">+${Number(result.netInterest).toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-green-200">
                          <p className="text-green-700 text-xs font-bold uppercase tracking-wider mb-1">Total a Recibir al Vencimiento</p>
                          <p className="text-4xl font-black text-brand-primary">${Number(result.totalToReceive).toFixed(2)}</p>
                        </div>
                        
                        {result.monthlyPayment && (
                          <div className="mt-4 pt-4 border-t border-green-200">
                            <p className="text-green-700 text-xs font-bold uppercase tracking-wider mb-1">Pago Mensual Recurrente</p>
                            <p className="text-2xl font-black text-green-800">${Number(result.monthlyPayment).toFixed(2)} / mes</p>
                          </div>
                        )}
                      </div>

                      <button 
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
                        className="w-full mt-4 border-2 border-brand-primary text-brand-primary hover:bg-blue-50 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                        Abrir esta Poliza <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-500">
                  {loading ? "Cargando planes..." : "No hay planes de inversión disponibles en este momento."}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer is already present in layout or here */}
    </div>
  );
}
