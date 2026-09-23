"use client";

import Link from "next/link";
import NavLinks from "./nav-links";
import { API_URL } from "@/lib/api";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [institution, setInstitution] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_URL}/institution`)
      .then(res => res.json())
      .then(data => setInstitution(data))
      .catch(err => console.error("Error fetching institution for navbar", err));
  }, []);

  return (
    <header className="relative z-50 w-full bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-24 flex items-center justify-between">

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
              Fiado<span className="inline-block w-2.5 h-2.5 rounded-full bg-[#df6951] ml-0.5" />
            </span>
          )}
        </Link>

        {/* Header Links */}
        <NavLinks />
      </div>
    </header>
  );
}


