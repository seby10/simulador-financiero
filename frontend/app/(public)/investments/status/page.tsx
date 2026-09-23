import { redirect } from "next/navigation";

// La consulta pública por cédula exponía solicitudes ajenas; el estado ahora se
// ve con sesión iniciada en "Mis solicitudes".
export default function InvestmentStatusPage() {
  redirect("/my-applications");
}
