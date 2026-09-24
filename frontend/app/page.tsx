import Link from "next/link";
import {
  Calculator,
  ArrowRight,
  ShieldCheck,
  PiggyBank,
  ScanFace,
  Building2,
  Play,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Send,
  Star,
  Lock,
  ChevronRight,
  BadgeCheck,
  Zap,
  DollarSign,
  Navigation
} from "lucide-react";
import Navbar from "@/components/navbar";
import NewsletterForm from "@/components/newsletter-form";
import Footer from "@/components/footer";
import { API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Simulador Financiero & Onboarding Biométrico | Inicio",
  description: "Simula créditos, inversiones a plazo fijo (DPF) y realiza tu verificación biométrica en vivo."
};

export default async function Home() {
  let config = null;
  try {
    const res = await fetch(`${API_URL}/institution`, { cache: 'no-store' });
    if (res.ok) {
      config = await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch config for home page", err);
  }

  const institutionName = config?.institutionName || "FinanzApp Institucional";
  const heroImage = config?.heroImageUrl || "https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop";
  const heroTitle = config?.heroTitle || "Simula, invierte y alcanza tu libertad financiera";
  const heroSubtitle = config?.heroSubtitle || "Transparencia total. Calcula tus cuotas de crédito (Sistema Francés y Alemán), haz crecer tus ahorros en DPF y solicita en 3 minutos con verificación facial en vivo.";

  return (
    <div className="min-h-screen flex flex-col font-sans bg-transparent text-slate-800 overflow-x-hidden selection:bg-amber-100 selection:text-amber-900 relative">
      <Navbar />

      <main className="flex-1 relative z-10">
        <section className="relative pt-2 pb-16 lg:pt-6 lg:pb-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center min-h-[540px]">

              {/* Left Column: Text & Action Buttons */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left relative">

                {/* Decorative Plane 3 (Floating near left text area) */}
                <img
                  src="/assets/hero/plane.png"
                  alt="Plane 3"
                  className="hidden sm:block absolute -top-8 -left-12 lg:-left-16 w-14 lg:w-18 rotate-[-15deg] z-10 animate-float opacity-75"
                />

                {/* Category Subhead */}
                <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#df6951]">
                  TU RESPALDO FINANCIERO
                </p>

                {/* Hero Title */}
                <h1 className="text-4xl sm:text-6xl lg:text-[76px] xl:text-[84px] font-bold text-[#181e2b] leading-[1.05] font-serif-title tracking-tight max-w-3xl">
                  Calcula,{" "}
                  <span className="relative inline-block text-[#181e2b]">
                    invierte
                    {/* Orange Underline Brush Stroke Accent */}
                    <svg className="absolute -bottom-1.5 left-0 w-full h-4 text-[#df6951] pointer-events-none" viewBox="0 0 285 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 28C64 12 180 4 281 12" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                    </svg>
                  </span>{" "}
                  y fía tus sueños.
                </h1>

                {/* Hero Subtitle */}
                <p className="text-sm sm:text-base text-[#5e6282] max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
                  Transparencia total para tus decisiones. Simula tus cuotas de crédito en minutos con los Sistemas Francés y Alemán, haz crecer tu capital a plazo fijo y solicita con verificación facial en vivo.
                </p>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
                  <Link
                    href="/simulator"
                    className="w-full sm:w-auto bg-[#f1a501] hover:bg-amber-500 text-white font-medium py-4 px-8 rounded-[10px] shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all text-center text-sm sm:text-base"
                  >
                    Simular Crédito
                  </Link>

                  <Link
                    href="/simulator"
                    className="flex items-center gap-4 py-2 px-2 text-[#686d77] hover:text-[#181e2b] font-medium text-sm sm:text-base transition-colors group"
                  >
                    <div className="w-13 h-13 rounded-full bg-[#df6951] text-white flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform shrink-0">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                    <span>Ver Demo</span>
                  </Link>
                </div>

              </div>

              {/* Right Column: Hero Person Image & Multiple Decorative Planes */}
              <div className="lg:col-span-5 relative flex justify-center lg:justify-end items-center">
                <div className="relative w-full max-w-[280px] sm:max-w-[340px] lg:max-w-[380px]">

                  {/* Decorative Plane 1 (Top Left of Person) */}
                  <img
                    src="/assets/hero/plane.png"
                    alt="Plane 1"
                    className="absolute -top-4 -left-4 lg:-left-8 w-12 lg:w-16 rotate-[15deg] z-20 animate-float"
                  />

                  {/* Decorative Plane 2 (Top Right near screen edge) */}
                  <img
                    src="/assets/hero/plane.png"
                    alt="Plane 2"
                    className="absolute top-2 -right-4 lg:-right-8 w-10 lg:w-14 rotate-[35deg] z-20 animate-float-slow opacity-95"
                  />

                  {/* Decorative Plane 4 (Background depth plane) */}
                  <img
                    src="/assets/hero/plane.png"
                    alt="Plane 4"
                    className="absolute bottom-8 right-4 w-8 lg:w-10 rotate-[55deg] z-0 opacity-50 animate-float"
                  />

                  {/* Main Hero Person Image */}
                  <img
                    src="/assets/hero/hero-person.png"
                    alt="Hero Person"
                    className="w-full max-h-[520px] sm:max-h-[560px] lg:max-h-[580px] object-contain relative z-10 drop-shadow-xl"
                  />

                </div>
              </div>

            </div>
          </div>
        </section>

        <section className="py-20 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#df6951]">
                NUESTROS SERVICIOS
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif-title mt-2">
                Te ofrecemos la mejor experiencia bancaria digital
              </h2>
            </div>

            {/* Grid of 2 Cards (Compact & Centered) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 max-w-[640px] mx-auto gap-6 sm:gap-8">

              {/* Service Card 1 */}
              <div className="group relative bg-white p-7 rounded-[28px] transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 border border-slate-100 hover:-translate-y-2 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-[20px] bg-amber-50 text-[#f1a501] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Calculator className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 font-serif-title">
                  Simulación de Créditos
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-6">
                  Calcula tus cuotas exactas con los sistemas Francés y Alemán. Descarga tu tabla de amortización oficial en PDF.
                </p>
                <Link
                  href="/simulator"
                  className="mt-auto w-full bg-[#df6951] hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-1.5"
                >
                  Ver más información <ChevronRight className="w-4 h-4" />
                </Link>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-[#df6951] rounded-full group-hover:w-16 transition-all duration-300" />
              </div>

              {/* Service Card 2 */}
              <div className="group relative bg-white p-7 rounded-[28px] transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 border border-slate-100 hover:-translate-y-2 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-[20px] bg-amber-50 text-[#f1a501] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <PiggyBank className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 font-serif-title">
                  Simulación de Inversiones
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-6">
                  Haz crecer tus ahorros a plazo fijo con rendimiento garantizado de hasta el 11.25% anual y certificado digital.
                </p>
                <Link
                  href="/investments"
                  className="mt-auto w-full bg-[#f1a501] hover:bg-amber-600 text-white font-semibold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-1.5"
                >
                  Ver más información <ChevronRight className="w-4 h-4" />
                </Link>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-[#f1a501] rounded-full group-hover:w-16 transition-all duration-300" />
              </div>

            </div>
          </div>
        </section>


        {/* ========================================================================= */}
        {/* 3. FEATURED PRODUCTS / DESTINATIONS EQUIVALENT */}
        {/* ========================================================================= */}
        <section className="py-20 bg-[#fefcf9] relative overflow-hidden">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

            <div className="text-center max-w-2xl sm:max-w-3xl mx-auto mb-16">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#df6951] mb-2">
                PRODUCTOS DESTACADOS
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#14183e] font-serif-title leading-tight">
                Encuentra el plan financiero perfecto para ti
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 relative">

              {/* Product 1 */}
              <Link href="/simulator" className="bg-white rounded-[24px] overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col relative z-10">
                <div className="relative h-[320px] sm:h-[360px] lg:h-[380px] w-full overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1000&auto=format&fit=crop"
                    alt="Crédito Consumo"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between font-medium text-lg sm:text-[19px] text-[#5e6282]">
                    <span>Crédito Consumo</span>
                    <span className="font-semibold text-[#14183e]">$20,000</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#5e6282] font-medium">
                    <Navigation className="w-4 h-4 text-[#14183e] fill-current shrink-0" />
                    <span>12 a 60 Meses - Tasa 12.5%</span>
                  </div>
                </div>
              </Link>

              {/* Product 2 */}
              <Link href="/simulator" className="bg-white rounded-[24px] overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col relative z-10">
                <div className="relative h-[320px] sm:h-[360px] lg:h-[380px] w-full overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1000&auto=format&fit=crop"
                    alt="Crédito Vehicular"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between font-medium text-lg sm:text-[19px] text-[#5e6282]">
                    <span>Crédito Vehicular</span>
                    <span className="font-semibold text-[#14183e]">$45,000</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#5e6282] font-medium">
                    <Navigation className="w-4 h-4 text-[#14183e] fill-current shrink-0" />
                    <span>Hasta 80% Financiado</span>
                  </div>
                </div>
              </Link>

              {/* Product 3 */}
              <Link href="/investments" className="bg-white rounded-[24px] overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col relative z-10">
                <div className="relative h-[320px] sm:h-[360px] lg:h-[380px] w-full overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=1000&auto=format&fit=crop"
                    alt="Inversión DPF"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between font-medium text-lg sm:text-[19px] text-[#5e6282]">
                    <span>DPF Rendimiento</span>
                    <span className="font-semibold text-[#14183e]">11.25% EA</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#5e6282] font-medium">
                    <Navigation className="w-4 h-4 text-[#14183e] fill-current shrink-0" />
                    <span>Desde 30 días a Plazo Fijo</span>
                  </div>
                </div>
              </Link>

              {/* Decorative Spiral Asset on Right side of 3rd Card */}
              <img
                src="/assets/hero/spiral.png"
                alt="Spiral decore"
                className="hidden xl:block absolute -right-10 top-1/2 -translate-y-1/2 w-32 opacity-70 pointer-events-none z-0"
              />

            </div>
          </div>
        </section>
        <section className="py-20 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

              {/* Left Column: Steps */}
              <div className="lg:col-span-6 space-y-8">
                <div>
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#df6951]">
                    FÁCIL Y RÁPIDO
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif-title mt-2 leading-tight">
                    Solicita tu crédito o inversión en 3 sencillos pasos
                  </h2>
                </div>

                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-[#f1a501] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md shadow-amber-500/20">
                      <Calculator className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">1. Simula y elige tus condiciones</h3>
                      <p className="text-slate-600 text-sm mt-1">
                        Ajusta el monto deseado, el plazo y compara las cuotas mensuales entre el Sistema Francés y Alemán.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-[#df6951] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md shadow-orange-500/20">
                      <ScanFace className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">2. Verifica tu identidad con tu rostro</h3>
                      <p className="text-slate-600 text-sm mt-1">
                        Utiliza tu cámara web o móvil para una validación biométrica facial rápida en tiempo real sin papeleos.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md shadow-emerald-500/20">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">3. Firma digital y desembolso</h3>
                      <p className="text-slate-600 text-sm mt-1">
                        Recibe la aprobación en tiempo récord y el dinero transferido directamente a tu cuenta registrada.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Floating Interactive Application Widget */}
              <div className="lg:col-span-6 relative flex justify-center">
                <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 relative">

                  {/* Card Header Image */}
                  <div className="relative h-48 rounded-2xl overflow-hidden mb-6">
                    <img
                      src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1000&auto=format&fit=crop"
                      alt="Proceso de solicitud"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/20" />
                    <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BadgeCheck className="w-4 h-4 text-emerald-500" /> Solicitud en Línea
                    </span>
                  </div>

                  {/* Application Info */}
                  <h4 className="text-lg font-bold text-slate-900 font-serif-title">
                    Solicitud de Crédito Personal
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">12-24 meses | Amortización Francés</p>

                  <div className="my-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/50 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600">Progreso de Validación</span>
                      <span className="text-[#df6951]">85% Completado</span>
                    </div>
                    <div className="w-full h-2.5 bg-amber-200/60 rounded-full overflow-hidden">
                      <div className="w-[85%] h-full bg-gradient-to-r from-[#f1a501] to-[#df6951] rounded-full" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-emerald-600" /> Cuota: $342.50 / mes
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                      <ShieldCheck className="w-4 h-4" /> Biometría Ok
                    </span>
                  </div>

                  {/* Mini Floating Overlay Widget */}
                  <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 animate-float">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold">Estado</p>
                      <p className="text-xs font-extrabold text-slate-900">Aprobado en 2 min</p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>


        {/* ========================================================================= */}
        {/* 5. TESTIMONIALS & INSTITUTIONAL TRUST */}
        {/* ========================================================================= */}
        <section className="py-20 bg-[#fefcf9]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

              {/* Left Column: Heading */}
              <div className="lg:col-span-5 space-y-4">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#df6951]">
                  TESTIMONIOS & RESPALDO
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif-title leading-tight">
                  Lo que dicen nuestros socios y clientes
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Miles de familias e instituciones confían en nuestra plataforma por su rapidez, transparencia y seguridad en cada transacción.
                </p>
              </div>

              {/* Right Column: Testimonial Card */}
              <div className="lg:col-span-7 relative">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative">
                  <div className="flex gap-1 text-amber-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-700 italic text-base leading-relaxed mb-6 font-serif-title">
                    &ldquo;El simulador de crédito me permitió entender exactamente cuánto pagaría mes a mes sin sorpresas. La verificación facial con la cámara tomó menos de 1 minuto y la atención fue insuperable.&rdquo;
                  </p>
                  <div className="flex items-center gap-4">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                      alt="Cliente"
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-400"
                    />
                    <div>
                      <p className="font-bold text-slate-900 text-sm">María Fernanda Torres</p>
                      <p className="text-xs text-slate-500">Socia Activa — Quito, Ecuador</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>


        {/* ========================================================================= */}
        {/* 6. NEWSLETTER / ADVISORY BANNER (Jadoo Purple Box Banner) */}
        {/* ========================================================================= */}
        <section className="py-12 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-[40px] p-8 sm:p-14 overflow-hidden text-center text-white shadow-2xl">

              {/* Decorative background shapes */}
              <div className="absolute -top-24 -right-24 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl" />

              <div className="relative z-10 max-w-3xl mx-auto space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto text-amber-400 shadow-inner">
                  <Send className="w-8 h-8" />
                </div>

                <h2 className="text-2xl sm:text-4xl font-extrabold font-serif-title leading-tight">
                  Recibe asesoría financiera personalizada y las mejores promociones
                </h2>

                <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
                  Déjanos tu correo electrónico y un asesor certificado se pondrá en contacto contigo para guiarte en tu solicitud.
                </p>

                <NewsletterForm />
              </div>

            </div>
          </div>
        </section>
      </main>


      {/* ========================================================================= */}
      {/* 7. INSTITUTIONAL FOOTER */}
      {/* ========================================================================= */}
      <Footer />
    </div>
  );
}
