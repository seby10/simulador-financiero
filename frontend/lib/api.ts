export const API_URL = typeof window === 'undefined'
  ? (process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001/api')
  : '/api';

export const UPLOADS_URL = typeof window === 'undefined'
  ? (process.env.INTERNAL_API_URL ? process.env.INTERNAL_API_URL.replace('/api', '/uploads') : 'http://127.0.0.1:3001/uploads')
  : '/uploads';

const API_BASE_URL = API_URL;

/** Mensaje legible de una respuesta de error de la API (Nest devuelve string o string[]). */
export async function readApiError(res: Response, fallback: string) {
  const data: unknown = await res.json().catch(() => null);
  const message = (data as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" ? message : fallback;
}

/** Texto de un error capturado en un `catch`, sea o no una instancia de Error. */
export const errorMessage = (err: unknown, fallback = "Ocurrió un error inesperado") =>
  err instanceof Error ? err.message : fallback;

export async function fetchCreditTypes() {
  const res = await fetch(`${API_BASE_URL}/credit/types`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch credit types");
  return res.json();
}

export async function fetchIndirectFees() {
  const res = await fetch(`${API_BASE_URL}/credit/fees`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch indirect fees");
  return res.json();
}

export async function simulateCredit(data: {
  creditTypeId: number;
  amount: string;
  termMonths: number;
  method: "FRENCH" | "GERMAN";
  optionalFeeIds?: number[];
}) {
  const res = await fetch(`${API_BASE_URL}/credit/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || "Failed to simulate credit");
  }
  return res.json();
}

export async function downloadAmortizationPdf(data: {
  creditTypeId: number;
  amount: string;
  termMonths: number;
  method: "FRENCH" | "GERMAN";
  optionalFeeIds?: number[];
}) {
  const res = await fetch(`${API_BASE_URL}/credit/simulate/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || "Failed to generate PDF");
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tabla-amortizacion.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
