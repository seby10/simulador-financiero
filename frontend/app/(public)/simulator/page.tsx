import CreditSimulatorForm from "@/components/simulator/credit-simulator-form";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ShieldCheck, Building2 } from "lucide-react";
import { API_URL } from "@/lib/api";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Simulador de Crédito - Fiado",
};

export default async function SimulatorPage() {
  let config = null;
  try {
    const res = await fetch(`${API_URL}/institution`, { cache: 'no-store' });
    if (res.ok) {
      config = await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch config for simulator page", err);
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-transparent relative">
      <Navbar />

      <main className="flex-1 pb-20">
        <CreditSimulatorForm />
      </main>

      {/* Modern Jadoo-style Footer */}
      <Footer />
    </div>
  );
}
