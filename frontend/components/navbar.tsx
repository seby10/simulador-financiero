import Link from "next/link";
import { Building2 } from "lucide-react";
import NavLinks from "./nav-links";

export default async function Navbar() {
  let institution = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/institution`, { cache: 'no-store' });
    if (res.ok) {
      institution = await res.json();
    }
  } catch (err) {
    console.error("Error fetching institution for navbar", err);
  }

  return (
    <>
      <header className="bg-white sticky top-0 z-50 border-b border-slate-200 shadow-sm">
        <div className="w-full px-6 lg:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {institution?.logoUrl ? (
              <img src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || ''}${institution.logoUrl}`} alt="Logo" className="h-12 w-auto object-contain" />
            ) : (
              <div className="w-12 h-12 rounded bg-brand-primary flex items-center justify-center text-white shadow-md">
                <Building2 className="w-7 h-7" />
              </div>
            )}
            <div className="flex flex-col">
              {institution?.institutionName ? (
                <span className="font-extrabold text-xl tracking-tight text-brand-primary uppercase leading-none mt-1">
                  {institution.institutionName}
                </span>
              ) : (
                <>
                  <span className="font-bold text-xl tracking-tight text-brand-primary leading-none mt-1">
                    COOPERATIVA
                  </span>
                  <span className="font-extrabold text-2xl tracking-tighter text-brand-primary leading-none">
                    AMBATO
                  </span>
                </>
              )}
            </div>
          </Link>

          <NavLinks />
        </div>
      </header>
    </>
  );
}
