import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-transparent pt-16 pb-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 items-start mb-16">

          {/* Col 1: Brand & Tagline */}
          <div className="lg:col-span-1 space-y-4">
            <Link href="/" className="inline-block">
              <span className="font-serif-title text-3xl font-extrabold text-[#14183e] tracking-tight">
                Fiado<span className="text-[#df6951]">.</span>
              </span>
            </Link>
            <p className="text-[#5e6282] text-xs sm:text-sm leading-relaxed max-w-[210px]">
              Calcula tu crédito e inversiones en minutos, obtén control financiero total.
            </p>
          </div>

          {/* Col 2: Company */}
          <div className="space-y-4">
            <h4 className="text-[#080809] font-bold text-lg">Empresa</h4>
            <ul className="space-y-2.5 text-[#5e6282] text-sm font-medium">
              <li>
                <Link href="/" className="hover:text-[#df6951] transition-colors">Sobre Nosotros</Link>
              </li>
              <li>
                <Link href="/simulator" className="hover:text-[#df6951] transition-colors">Simulador</Link>
              </li>
              <li>
                <Link href="/investments" className="hover:text-[#df6951] transition-colors">Pólizas DPF</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact */}
          <div className="space-y-4">
            <h4 className="text-[#080809] font-bold text-lg">Contacto</h4>
            <ul className="space-y-2.5 text-[#5e6282] text-sm font-medium">
              <li>
                <Link href="#" className="hover:text-[#df6951] transition-colors">Ayuda / FAQ</Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#df6951] transition-colors">Prensa</Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#df6951] transition-colors">Afiliados</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: More */}
          <div className="space-y-4">
            <h4 className="text-[#080809] font-bold text-lg">Más</h4>
            <ul className="space-y-2.5 text-[#5e6282] text-sm font-medium">
              <li>
                <Link href="#" className="hover:text-[#df6951] transition-colors">Tasas y Tarifas</Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#df6951] transition-colors">Seguridad Pólizas</Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#df6951] transition-colors">Educación Financiera</Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Social & App Store Badges */}
          <div className="space-y-5">
            {/* Social Icons */}
            <div className="flex items-center gap-4">
              {/* Facebook */}
              <a
                href="#"
                className="w-11 h-11 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center text-[#080809] hover:text-[#df6951] transition-all hover:scale-110"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H7.5v-3H10V9.5C10 7.01 11.49 5.6 13.78 5.6c1.1 0 2.25.2 2.25.2v2.47h-1.27c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 3h-2.33v6.8c4.56-.93 8-4.96 8-9.8z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="#"
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-md hover:shadow-lg flex items-center justify-center text-white transition-all hover:scale-110"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* Twitter / X */}
              <a
                href="#"
                className="w-11 h-11 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center text-[#080809] hover:text-[#df6951] transition-all hover:scale-110"
                aria-label="Twitter"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>

            <p className="text-[#5e6282] font-medium text-sm">
              Descubre nuestra app
            </p>

            {/* App Store buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Google Play */}
              <a
                href="#"
                className="bg-[#080809] hover:bg-slate-800 text-white px-3.5 py-2 rounded-full flex items-center gap-2 transition-all shadow-md"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L18.81,13.96C20.13,13.19 20.13,10.81 18.81,10.04L16.81,8.88L14.69,11L16.81,15.12M4.54,1.44L14.9,11.8L12.9,13.8L4.54,22.16C4.19,22.03 3.91,21.75 3.84,21.39L4.54,1.44Z" />
                </svg>
                <div className="text-left leading-none">
                  <span className="text-[7px] uppercase tracking-wider block text-slate-300">DISPONIBLE EN</span>
                  <span className="text-[11px] font-bold">Google Play</span>
                </div>
              </a>

              {/* Apple Store */}
              <a
                href="#"
                className="bg-[#080809] hover:bg-slate-800 text-white px-3.5 py-2 rounded-full flex items-center gap-2 transition-all shadow-md"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
                </svg>
                <div className="text-left leading-none">
                  <span className="text-[7px] uppercase tracking-wider block text-slate-300">CONSIGUELO EN EL</span>
                  <span className="text-[11px] font-bold">Apple Store</span>
                </div>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="text-center text-[#5e6282] text-xs sm:text-sm font-medium pt-8 border-t border-slate-200/60">
          Todos los derechos reservados@fiado.ec
        </div>
      </div>
    </footer>
  );
}
