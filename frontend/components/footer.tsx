"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { API_URL } from "@/lib/api";

type Institution = {
  institutionName?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

const COLUMNS = [
  {
    title: "Productos",
    links: [
      ["/simulator", "Simulador de créditos"],
      ["/investments", "Pólizas DPF"],
      ["/investments/request", "Solicitar inversión"],
    ],
  },
  {
    title: "Ayuda",
    links: [
      ["/simulator#preguntas-frecuentes", "Preguntas frecuentes"],
      ["/investments#preguntas-frecuentes", "Dudas sobre DPF"],
      ["/forgot-password", "Recuperar contraseña"],
    ],
  },
  {
    title: "Mi cuenta",
    links: [
      ["/login", "Iniciar sesión"],
      ["/my-applications", "Mis solicitudes"],
    ],
  },
] as const;

export default function Footer() {
  const [institution, setInstitution] = useState<Institution | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/institution`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setInstitution(data))
      .catch(() => setInstitution(null));
  }, []);

  const contact = [
    { icon: MapPin, value: institution?.address, href: null },
    { icon: Phone, value: institution?.phone, href: institution?.phone ? `tel:${institution.phone.replace(/\s/g, "")}` : null },
    { icon: Mail, value: institution?.email, href: institution?.email ? `mailto:${institution.email}` : null },
  ].filter((item) => item.value);

  return (
    <footer className="w-full bg-transparent border-t border-slate-200/60 pt-10 pb-6 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-8 items-start mb-10">

          {/* Marca y contacto */}
          <div className="col-span-2 lg:col-span-4 space-y-4">
            <Link href="/" className="inline-block group">
              <span className="font-serif-title text-2xl font-extrabold text-[#14183e] tracking-tight">
                Fiado<span className="inline-block text-[#df6951] transition-transform group-hover:scale-125">.</span>
              </span>
            </Link>
            <p className="text-[#5e6282] text-sm leading-relaxed max-w-xs">
              Calcula tu crédito e inversiones en minutos y toma el control de tus finanzas.
            </p>
            {contact.length > 0 && (
              <ul className="space-y-2 text-sm text-[#5e6282]">
                {contact.map(({ icon: Icon, value, href }) => (
                  <li key={value} className="flex items-start gap-2">
                    <Icon className="w-4 h-4 mt-0.5 text-[#df6951] shrink-0" />
                    {href ? (
                      <a href={href} className="hover:text-[#df6951] transition-colors">{value}</a>
                    ) : (
                      <span>{value}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {COLUMNS.map(({ title, links }, index) => (
            <div key={title} className={`lg:col-span-2 space-y-3 ${index === 0 ? "lg:col-start-7" : ""}`}>
              <h4 className="text-[#080809] font-bold text-sm uppercase tracking-wide">{title}</h4>
              <ul className="space-y-2 text-[#5e6282] text-sm font-medium">
                {links.map(([href, label]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-block hover:text-[#df6951] hover:translate-x-0.5 transition-all"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[#5e6282] text-xs pt-6 border-t border-slate-200/60">
          <span>
            © {new Date().getFullYear()} {institution?.institutionName ?? "Fiado"}. Todos los derechos reservados.
          </span>
          <span className="text-slate-400">Simulaciones referenciales, sin valor contractual.</span>
        </div>
      </div>
    </footer>
  );
}
