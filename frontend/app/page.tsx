import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  Lock,
  PiggyBank,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import BrandImage from "@/components/brand-image";
import HeroShowcase, { type ShowcaseCredit } from "@/components/landing/hero-showcase";
import PromoBillboard, { type Promo } from "@/components/landing/promo-billboard";
import Reveal from "@/components/landing/reveal";
import { API_URL } from "@/lib/api";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Simulador Financiero & Onboarding Biométrico | Inicio",
  description: "Simula créditos, inversiones a plazo fijo (DPF) y realiza tu verificación biométrica en vivo."
};

type InstitutionConfig = {
  institutionName?: string;
  heroImageUrl?: string | null;
  heroTitle?: string;
  heroSubtitle?: string;
  disclaimerText?: string | null;
};

type CreditType = {
  id: number;
  name: string;
  description?: string | null;
  minAmount: string;
  maxAmount: string;
  minTermMonths: number;
  maxTermMonths: number;
  annualInterestRate: string;
};

type InvestmentPlan = {
  id: number;
  name: string;
  minAmount: string;
  termMinDays: number;
  tea: string;
};

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as T) : null;
  } catch (err) {
    console.error(`Failed to fetch ${path} for home page`, err);
    return null;
  }
}

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?q=80&w=1600&auto=format&fit=crop`;

/** Foto por tipo de crédito; los tipos nuevos usan la genérica. */
const CREDIT_PHOTOS: Record<string, string> = {
  hipotecario: unsplash("1560518883-ce09059eeffa"),
  consumo: unsplash("1549317661-bd32c8ce0db2"),
  microcredito: unsplash("1573164713988-8665fc963095"),
};
const GENERIC_CREDIT_PHOTO = unsplash("1554224155-8d04cb21cd6c");
const DPF_PHOTO = unsplash("1559526324-4b87b5e36e44");

const photoFor = (name: string) =>
  CREDIT_PHOTOS[name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()] ?? GENERIC_CREDIT_PHOTO;

/** Separa la última palabra del título para subrayarla con el trazo de pincel. */
function splitTitle(title: string) {
  const trimmed = title.trimEnd();
  const cut = Math.max(trimmed.lastIndexOf(" "), trimmed.lastIndexOf("\n"));
  return cut < 0 ? { head: "", last: trimmed } : { head: trimmed.slice(0, cut + 1), last: trimmed.slice(cut + 1) };
}

export default async function Home() {
  const [config, creditTypes, plans] = await Promise.all([
    getJson<InstitutionConfig>("/institution"),
    getJson<CreditType[]>("/credit/types"),
    getJson<InvestmentPlan[]>("/investment/plans"),
  ]);

  const institutionName = config?.institutionName || "Tu respaldo financiero";
  const heroTitle = config?.heroTitle || "Simula, invierte y alcanza tu libertad financiera";
  const heroSubtitle = config?.heroSubtitle || "Transparencia total. Calcula tus cuotas de crédito (Sistema Francés y Alemán), haz crecer tus ahorros en DPF y solicita en minutos con verificación facial en vivo.";
  const { head: titleHead, last: titleLast } = splitTitle(heroTitle);

  const credits = creditTypes ?? [];
  const bestPlan = (plans ?? []).reduce<InvestmentPlan | null>(
    (best, plan) => (!best || Number(plan.tea) > Number(best.tea) ? plan : best),
    null,
  );
  const cheapestPlan = (plans ?? []).reduce<InvestmentPlan | null>(
    (low, plan) => (!low || Number(plan.minAmount) < Number(low.minAmount) ? plan : low),
    null,
  );
  const shortestTerm = plans?.length ? Math.min(...plans.map((plan) => plan.termMinDays)) : null;
  const bestTea = bestPlan ? Number(bestPlan.tea) : null;

  // Simulación de ejemplo del hero: el primer tipo de crédito, con monto y plazo dentro de sus límites.
  const sample = credits.find((credit) => credit.name.toLowerCase().includes("consumo")) ?? credits[0];
  const showcaseCredit: ShowcaseCredit = sample
    ? {
        name: sample.name,
        amount: Math.min(10000, Number(sample.maxAmount)),
        termMonths: Math.min(Math.max(36, sample.minTermMonths), sample.maxTermMonths),
        annualRate: Number(sample.annualInterestRate),
      }
    : { name: "Consumo", amount: 10000, termMonths: 36, annualRate: 16 };

  // Anuncios: cada tipo de crédito y las pólizas DPF, con datos reales de la API.
  const lowestRate = credits.length ? Math.min(...credits.map((credit) => Number(credit.annualInterestRate))) : null;
  const promos: Promo[] = [
    ...credits.map((credit) => ({
      id: `credit-${credit.id}`,
      tag: "Crédito",
      title: /cr[eé]dito/i.test(credit.name) ? credit.name : `Crédito ${credit.name}`,
      rate: Number(credit.annualInterestRate),
      rateLabel: "Tasa anual",
      highlights: [
        credit.description || "Cuotas fijas o decrecientes, tú eliges",
        `De ${money(Number(credit.minAmount))} a ${money(Number(credit.maxAmount))}`,
        `Plazos de ${credit.minTermMonths} a ${credit.maxTermMonths} meses`,
      ],
      href: "/simulator",
      cta: "Simular mi cuota",
      photo: photoFor(credit.name),
      badge: Number(credit.annualInterestRate) === lowestRate ? "Tasa más baja" : undefined,
    })),
    ...(bestPlan
      ? [{
          id: "dpf",
          tag: "Inversión a plazo fijo",
          title: "Pólizas DPF",
          rate: Number(bestPlan.tea),
          rateLabel: "Hasta TEA",
          highlights: [
            `${plans!.length} planes según el plazo que elijas`,
            `Desde ${shortestTerm} días${cheapestPlan ? ` y desde ${money(Number(cheapestPlan.minAmount))}` : ""}`,
            "Solicitud en línea con verificación facial",
          ],
          href: "/investments",
          cta: "Ver pólizas",
          photo: DPF_PHOTO,
          badge: "Mejor rendimiento",
        }]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-transparent text-slate-800 overflow-x-clip selection:bg-amber-100 selection:text-amber-900 relative">
      <Navbar />

      <main className="flex-1 relative z-10">
        {/* ============================== 1. HERO ============================== */}
        <section className="relative pt-4 pb-20 lg:pt-8 lg:pb-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center min-h-[540px]">

              <div className="lg:col-span-7 space-y-7 text-center lg:text-left relative">
                <p
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-widest text-[#df6951] animate-fade-up"
                  style={{ animationDelay: "0ms" }}
                >
                  <span className="w-6 h-px bg-[#df6951]" />
                  {institutionName}
                </p>

                <h1
                  className="text-4xl sm:text-6xl lg:text-[68px] xl:text-[76px] font-bold text-[#181e2b] leading-[1.08] font-serif-title tracking-tight max-w-3xl whitespace-pre-line animate-fade-up"
                  style={{ animationDelay: "80ms" }}
                >
                  {titleHead}
                  <span className="relative inline-block whitespace-nowrap">
                    {titleLast}
                    <svg
                      className="absolute -bottom-2 left-0 w-full h-4 text-[#df6951] pointer-events-none"
                      viewBox="0 0 285 36"
                      fill="none"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path className="animate-draw" d="M4 28C64 12 180 4 281 12" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                    </svg>
                  </span>
                </h1>

                <p
                  className="text-base sm:text-lg text-[#5e6282] max-w-xl mx-auto lg:mx-0 leading-relaxed animate-fade-up"
                  style={{ animationDelay: "160ms" }}
                >
                  {heroSubtitle}
                </p>

                <div
                  className="pt-1 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 animate-fade-up"
                  style={{ animationDelay: "240ms" }}
                >
                  <Link
                    href="/simulator"
                    className="group w-full sm:w-auto bg-[#f1a501] hover:bg-amber-500 text-white font-semibold py-4 px-8 rounded-[12px] shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/35 hover:-translate-y-0.5 transition-all text-center text-sm sm:text-base inline-flex items-center justify-center gap-2"
                  >
                    Simular crédito
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <a
                    href="#como-funciona"
                    className="flex items-center gap-4 py-2 px-2 text-[#686d77] hover:text-[#181e2b] font-medium text-sm sm:text-base transition-colors group"
                  >
                    <span className="relative w-12 h-12 rounded-full bg-[#df6951] text-white flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform shrink-0">
                      <span className="absolute inset-0 rounded-full bg-[#df6951]/40 animate-pulse-ring" />
                      <ArrowDown className="relative w-5 h-5" />
                    </span>
                    Cómo funciona
                  </a>
                </div>

                <ul
                  className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm text-[#5e6282] font-medium animate-fade-up"
                  style={{ animationDelay: "320ms" }}
                >
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Francés y Alemán</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Tabla en PDF</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Verificación facial en vivo</li>
                </ul>
              </div>

              <div className="lg:col-span-5 relative flex justify-center lg:justify-end items-center px-4 sm:px-0">
                <BrandImage
                  url={config?.heroImageUrl}
                  alt=""
                  className="w-full max-w-[420px] max-h-[560px] object-contain relative z-10 drop-shadow-xl animate-fade-up [animation-delay:250ms]"
                  fallback={<HeroShowcase credit={showcaseCredit} bestTea={bestTea} />}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ============================ 2. SERVICIOS ============================ */}
        <section className="py-20 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center max-w-3xl mx-auto mb-14">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#df6951]">
                Nuestros servicios
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif-title mt-2">
                Te ofrecemos la mejor experiencia bancaria digital
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 max-w-[700px] mx-auto gap-6 sm:gap-8">
              {[
                {
                  icon: Calculator,
                  title: "Simulación de créditos",
                  text: "Calcula tus cuotas exactas con los sistemas Francés y Alemán, con cargos incluidos. Descarga tu tabla de amortización en PDF.",
                  href: "/simulator",
                  cta: "Simular crédito",
                  button: "bg-[#df6951] hover:bg-orange-600 shadow-orange-500/20",
                },
                {
                  icon: PiggyBank,
                  title: "Inversiones a plazo fijo",
                  text: bestTea !== null
                    ? `Haz crecer tus ahorros con pólizas DPF de hasta ${bestTea}% de tasa efectiva anual, con plazos desde ${shortestTerm} días.`
                    : "Haz crecer tus ahorros con pólizas DPF a plazo fijo y conoce tu rendimiento antes de invertir.",
                  href: "/investments",
                  cta: "Ver pólizas",
                  button: "bg-[#f1a501] hover:bg-amber-500 shadow-amber-500/20",
                },
              ].map(({ icon: Icon, title, text, href, cta, button }, index) => (
                <Reveal key={title} delay={index * 120}>
                  <div className="group relative h-full bg-white p-7 rounded-[28px] transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 border border-slate-100 hover:-translate-y-2 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-[20px] bg-amber-50 text-[#f1a501] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 font-serif-title">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">{text}</p>
                    <Link
                      href={href}
                      className={`mt-auto w-full text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 ${button}`}
                    >
                      {cta} <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-[#df6951] rounded-full group-hover:w-16 transition-all duration-300" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ 3. PRODUCTOS ============================ */}
        {promos.length > 0 && (
          <section className="py-20 bg-[#fefcf9] relative overflow-hidden">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative">
              <Reveal className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
                <div className="max-w-2xl">
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#df6951] mb-2">
                    Productos destacados
                  </p>
                  <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#14183e] font-serif-title leading-tight">
                    Encuentra el plan financiero perfecto para ti
                  </h2>
                </div>
                <Link
                  href="/simulator"
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-[#14183e] hover:text-[#df6951] transition-colors shrink-0"
                >
                  Comparar todos <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Reveal>

              <Reveal delay={120}>
                <PromoBillboard promos={promos} />
              </Reveal>

              <img
                src="/assets/hero/spiral.png"
                alt=""
                className="hidden xl:block absolute -right-16 top-24 w-32 opacity-60 pointer-events-none"
              />
            </div>
          </section>
        )}

        {/* ========================== 4. CÓMO FUNCIONA ========================== */}
        <section id="como-funciona" className="py-20 bg-white relative overflow-hidden scroll-mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 items-center">

              <div className="lg:col-span-6 space-y-8">
                <Reveal>
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#df6951]">
                    Fácil y seguro
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif-title mt-2 leading-tight">
                    Abre tu inversión en 3 pasos
                  </h2>
                </Reveal>

                <ol className="relative space-y-7">
                  <span className="absolute left-7 top-10 bottom-10 w-px bg-gradient-to-b from-[#f1a501] via-[#df6951] to-emerald-500 opacity-40" aria-hidden="true" />
                  {[
                    {
                      icon: Calculator,
                      color: "bg-[#f1a501] shadow-amber-500/25",
                      title: "Simula y elige tu póliza",
                      text: "Compara montos, plazos y tasas, y mira cuánto recibirás al vencimiento antes de decidir.",
                    },
                    {
                      icon: ScanFace,
                      color: "bg-[#df6951] shadow-orange-500/25",
                      title: "Confirma tu identidad",
                      text: "Sube tu cédula y haz una verificación facial en vivo con prueba de vida, desde tu computadora o tu celular.",
                    },
                    {
                      icon: BadgeCheck,
                      color: "bg-emerald-500 shadow-emerald-500/25",
                      title: "Sigue tu solicitud",
                      text: "Un asesor revisa tus documentos y ves cada cambio de estado en «Mis solicitudes».",
                    },
                  ].map(({ icon: Icon, color, title, text }, index) => (
                    <Reveal key={title} delay={index * 140}>
                      <li className="relative flex items-start gap-5">
                        <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-md ${color}`}>
                          <Icon className="w-7 h-7" />
                        </div>
                        <div className="pt-1">
                          <h3 className="text-lg font-bold text-slate-900">
                            <span className="text-slate-300 mr-1.5">0{index + 1}</span>
                            {title}
                          </h3>
                          <p className="text-slate-600 text-sm mt-1 leading-relaxed">{text}</p>
                        </div>
                      </li>
                    </Reveal>
                  ))}
                </ol>

                <Reveal delay={420}>
                  <Link
                    href="/investments/request"
                    className="group inline-flex items-center gap-2 text-[#df6951] font-semibold text-sm hover:gap-3 transition-all"
                  >
                    Empezar mi solicitud <ArrowRight className="w-4 h-4" />
                  </Link>
                </Reveal>
              </div>

              {/* Tarjeta ilustrativa del seguimiento de una solicitud */}
              <Reveal delay={150} className="lg:col-span-6 relative flex justify-center px-4 sm:px-0">
                <div className="absolute inset-10 bg-gradient-to-tr from-emerald-100 via-amber-50 to-orange-100 rounded-full blur-3xl" />
                <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Solicitud de inversión</p>
                      <h4 className="text-lg font-bold text-slate-900 font-serif-title mt-0.5">
                        {bestPlan?.name ?? "Póliza a plazo fijo"}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> En revisión
                    </span>
                  </div>

                  <ul className="mt-6 space-y-4">
                    {[
                      { label: "Documentos cargados", detail: "Cédula y planilla de servicios", done: true },
                      { label: "Identidad verificada", detail: "Rostro coincide con la cédula · prueba de vida", done: true },
                      { label: "Revisión del asesor", detail: "Te avisaremos cuando termine", done: false },
                    ].map(({ label, detail, done }) => (
                      <li key={label} className="flex items-start gap-3">
                        {done ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                        ) : (
                          <span className="relative w-6 h-6 shrink-0 flex items-center justify-center">
                            <span className="absolute w-3 h-3 rounded-full bg-amber-400/50 animate-pulse-ring" />
                            <span className="w-3 h-3 rounded-full bg-amber-400" />
                          </span>
                        )}
                        <div>
                          <p className={`text-sm font-semibold ${done ? "text-slate-900" : "text-amber-700"}`}>{label}</p>
                          <p className="text-xs text-slate-500">{detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {bestPlan && (
                    <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-slate-400 font-medium">Tasa efectiva</p>
                        <p className="text-base font-extrabold text-[#14183e]">{Number(bestPlan.tea)}% TEA</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-slate-400 font-medium">Desde</p>
                        <p className="text-base font-extrabold text-[#14183e]">{money(Number(bestPlan.minAmount))}</p>
                      </div>
                    </div>
                  )}

                  <div className="absolute -bottom-6 -right-4 sm:-right-8 bg-white p-3.5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 animate-float">
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-[#df6951] flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold">¿Sin cámara?</p>
                      <p className="text-xs font-extrabold text-slate-900">Continúa en tu celular</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===================== 5. SEGURIDAD Y TRANSPARENCIA ===================== */}
        <section className="py-20 bg-[#fefcf9]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center max-w-3xl mx-auto mb-14">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#df6951]">
                Seguridad y transparencia
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-serif-title mt-2 leading-tight">
                Tu dinero y tus datos, bien cuidados
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {[
                {
                  icon: ShieldCheck,
                  title: "Tu rostro es tu firma",
                  text: "Comparamos tu cara con la foto de tu cédula y te pedimos gestos en vivo, así una foto impresa o un video no pasan.",
                },
                {
                  icon: Lock,
                  title: "Documentos privados",
                  text: "Tu cédula y tus selfies no son públicas: solo tú y el personal autorizado pueden verlas.",
                },
                {
                  icon: FileSpreadsheet,
                  title: "Cálculos a la vista",
                  text: "Ves la tabla de amortización completa, cuota por cuota y con cargos incluidos, antes de comprometerte.",
                },
              ].map(({ icon: Icon, title, text }, index) => (
                <Reveal key={title} delay={index * 120}>
                  <div className="group h-full bg-white p-7 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-[#14183e] text-amber-300 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 font-serif-title">{title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mt-2">{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {config?.disclaimerText && (
              <Reveal>
                <p className="mt-10 text-center text-xs text-slate-400 max-w-3xl mx-auto leading-relaxed">
                  {config.disclaimerText}
                </p>
              </Reveal>
            )}
          </div>
        </section>

        {/* ============================= 6. LLAMADO ============================= */}
        <section className="py-14 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="relative bg-gradient-to-br from-[#14183e] via-[#1d2250] to-[#2a1f3d] rounded-[40px] p-8 sm:p-14 overflow-hidden text-center text-white shadow-2xl">
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#df6951]/25 rounded-full blur-3xl animate-glow" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl animate-glow" style={{ animationDelay: "-4s" }} />

                <div className="relative z-10 max-w-3xl mx-auto space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto text-amber-300 shadow-inner">
                    <Sparkles className="w-8 h-8" />
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-extrabold font-serif-title leading-tight">
                    Empieza hoy: simula tu crédito o abre tu inversión a plazo fijo
                  </h2>

                  <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
                    Calcula tus cuotas sin compromiso o solicita tu póliza en minutos con verificación facial en vivo.
                  </p>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                    <Link
                      href="/simulator"
                      className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#f1a501] hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-500/30 hover:-translate-y-0.5 transition-all text-center"
                    >
                      Simular crédito
                    </Link>
                    <Link
                      href="/investments/request"
                      className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/25 hover:-translate-y-0.5 transition-all text-center"
                    >
                      Solicitar inversión
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

