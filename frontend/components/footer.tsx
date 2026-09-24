import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-transparent pt-16 pb-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 items-start mb-16">

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

          {/* Col 3: Help */}
          <div className="space-y-4">
            <h4 className="text-[#080809] font-bold text-lg">Ayuda</h4>
            <ul className="space-y-2.5 text-[#5e6282] text-sm font-medium">
              <li>
                <Link href="/simulator#preguntas-frecuentes" className="hover:text-[#df6951] transition-colors">Preguntas frecuentes</Link>
              </li>
              <li>
                <Link href="/forgot-password" className="hover:text-[#df6951] transition-colors">Recuperar contraseña</Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#df6951] transition-colors">Iniciar sesión</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Customers */}
          <div className="space-y-4">
            <h4 className="text-[#080809] font-bold text-lg">Clientes</h4>
            <ul className="space-y-2.5 text-[#5e6282] text-sm font-medium">
              <li>
                <Link href="/investments/request" className="hover:text-[#df6951] transition-colors">Solicitar inversión</Link>
              </li>
              <li>
                <Link href="/my-applications" className="hover:text-[#df6951] transition-colors">Mis solicitudes</Link>
              </li>
              <li>
                <Link href="/investments#preguntas-frecuentes" className="hover:text-[#df6951] transition-colors">Dudas sobre DPF</Link>
              </li>
            </ul>
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
