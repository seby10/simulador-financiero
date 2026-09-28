"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Pause, Play } from "lucide-react";

export type Promo = {
  id: string;
  tag: string;
  title: string;
  rate: number;
  rateLabel: string;
  highlights: string[];
  href: string;
  cta: string;
  photo: string;
  badge?: string;
};

/** Duración de cada anuncio; la barra de progreso marca el cambio al siguiente. */
const SLIDE_MS = 6500;

/**
 * Panel publicitario rotativo: un anuncio grande a la vez, con barras de progreso
 * que funcionan como pestañas. Se pausa al pasar el mouse o con el botón.
 */
export default function PromoBillboard({ promos }: { promos: Promo[] }) {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [stopped, setStopped] = useState(false);
  const paused = hovered || stopped;
  const next = () => setActive((index) => (index + 1) % promos.length);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-roledescription="carrusel"
      aria-label="Productos destacados"
    >
      {/* Cartelera */}
      <div className="relative h-[520px] sm:h-[460px] lg:h-[480px] rounded-[32px] overflow-hidden shadow-2xl shadow-slate-900/20 bg-brand-primary">
        {promos.map((promo, index) => {
          const isActive = index === active;
          return (
            <div
              key={promo.id}
              className={`absolute inset-0 transition-opacity duration-700 ${isActive ? "opacity-100 z-10" : "opacity-0 z-0"}`}
              aria-hidden={!isActive}
              role="group"
              aria-roledescription="anuncio"
              aria-label={`${index + 1} de ${promos.length}: ${promo.title}`}
            >
              <img
                src={promo.photo}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover ${isActive ? "animate-kenburns" : ""}`}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/95 via-brand-primary/80 to-brand-primary/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/70 via-transparent to-transparent sm:hidden" />

              {isActive && (
                <div className="relative h-full flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 p-7 sm:p-12 lg:p-14 text-white">
                  <div className="flex-1 max-w-xl space-y-5">
                    <div className="flex flex-wrap items-center gap-2 animate-fade-up">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">
                        {promo.tag}
                      </span>
                      {promo.badge && (
                        <span className="text-[11px] font-extrabold uppercase tracking-wider bg-brand-secondary text-white px-2.5 py-1 rounded-full shadow-lg shadow-brand-secondary/40">
                          {promo.badge}
                        </span>
                      )}
                    </div>
                    <h3
                      className="text-3xl sm:text-5xl font-extrabold font-serif-title leading-[1.05] animate-fade-up"
                      style={{ animationDelay: "90ms" }}
                    >
                      {promo.title}
                    </h3>
                    <ul className="space-y-2 animate-fade-up" style={{ animationDelay: "180ms" }}>
                      {promo.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-center gap-2 text-sm sm:text-base text-slate-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2 animate-fade-up" style={{ animationDelay: "270ms" }}>
                      <Link
                        href={promo.href}
                        tabIndex={isActive ? 0 : -1}
                        className="group inline-flex items-center gap-2 bg-brand-accent hover:bg-brand-accent-dark text-brand-primary font-bold text-sm sm:text-base py-3.5 px-7 rounded-2xl shadow-xl shadow-brand-accent/30 hover:-translate-y-0.5 transition-all"
                      >
                        {promo.cta}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>

                  {/* Sello con la tasa */}
                  <div
                    className="sm:ml-auto self-start sm:self-center animate-fade-up"
                    style={{ animationDelay: "220ms" }}
                  >
                    <div className="relative w-36 h-36 sm:w-48 sm:h-48">
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-300/60 animate-spin-slow" />
                      <div className="absolute inset-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-center shadow-2xl">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-300">
                          {promo.rateLabel}
                        </span>
                        <span className="text-4xl sm:text-6xl font-extrabold leading-none text-white">
                          {promo.rate}
                          <span className="text-xl sm:text-3xl text-amber-300">%</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setStopped((value) => !value)}
          className="absolute top-5 right-5 z-20 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center transition-colors"
          aria-label={stopped ? "Reanudar anuncios" : "Pausar anuncios"}
        >
          {stopped ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
      </div>

      {/* Pestañas con barra de progreso */}
      <div
        className="mt-5 grid gap-3"
        style={{ gridTemplateColumns: `repeat(${promos.length}, minmax(0, 1fr))` }}
        role="tablist"
      >
        {promos.map((promo, index) => {
          const isActive = index === active;
          return (
            <button
              key={promo.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(index)}
              className="group text-left"
            >
              <span className="block h-1 rounded-full bg-slate-200 overflow-hidden">
                <span
                  key={isActive ? `on-${active}` : "off"}
                  className={`block h-full rounded-full bg-gradient-to-r from-brand-accent to-brand-secondary ${
                    isActive ? "animate-progress" : index < active ? "w-full opacity-40" : "w-0"
                  }`}
                  style={
                    isActive
                      ? { animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? "paused" : "running" }
                      : undefined
                  }
                  onAnimationEnd={isActive ? next : undefined}
                />
              </span>
              <span className="hidden sm:flex items-baseline justify-between gap-2 mt-2.5">
                <span className={`text-sm font-semibold truncate transition-colors ${isActive ? "text-brand-primary" : "text-slate-400 group-hover:text-slate-600"}`}>
                  {promo.title}
                </span>
                <span className={`text-xs font-bold ${isActive ? "text-brand-secondary" : "text-slate-300"}`}>
                  {promo.rate}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
