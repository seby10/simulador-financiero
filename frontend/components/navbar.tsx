"use client";

import Link from "next/link";
import NavLinks from "./nav-links";
import { API_URL } from "@/lib/api";
import { useEffect, useState } from "react";

type Institution = { logoUrl?: string | null };

export default function Navbar() {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/institution`)
      .then(res => res.json())
      .then(data => setInstitution(data))
      .catch(err => console.error("Error fetching institution for navbar", err));
  }, []);

  // Al bajar, la barra se vuelve compacta y translúcida para no tapar el contenido.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "bg-white/80 backdrop-blur-lg shadow-[0_1px_0_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.15)]" : "bg-transparent"
      }`}
    >
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between transition-all duration-300 ${
          scrolled ? "h-16" : "h-24"
        }`}
      >
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          {institution?.logoUrl ? (
            <img
              src={`${API_URL?.replace('/api', '') || ''}${institution.logoUrl}`}
              alt="Logo"
              className="h-9 w-auto object-contain"
            />
          ) : (
            <span className="text-3xl font-extrabold text-[#181e2b] tracking-tight font-serif-title flex items-center">
              Fiado<span className="inline-block w-2.5 h-2.5 rounded-full bg-[#df6951] ml-0.5 transition-transform group-hover:scale-125" />
            </span>
          )}
        </Link>

        {/* Header Links */}
        <NavLinks />
      </div>
    </header>
  );
}
