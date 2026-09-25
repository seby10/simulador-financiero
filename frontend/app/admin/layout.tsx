import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import AdminShell from "@/components/admin-shell";

/** Usuario de la sesión si es administrador; null en cualquier otro caso. */
async function adminSession(): Promise<{ fullName?: string; email?: string } | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;
  
  if (!accessToken && !refreshToken) {
    return null;
  }

  // Build cookie string to forward
  const cookieHeader = [
    accessToken ? `access_token=${accessToken}` : '',
    refreshToken ? `refresh_token=${refreshToken}` : ''
  ].filter(Boolean).join('; ');

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }
    const user = await res.json();
    return user.role === "ADMIN" ? user : null;
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await adminSession();

  if (!user) {
    redirect("/login");
  }

  let config = null;
  try {
    const res = await fetch(`${API_URL}/institution`, { cache: 'no-store' });
    if (res.ok) {
      config = await res.json();
    }
  } catch (error) {
    console.error("Failed to fetch institution config", error);
  }

  return (
    <AdminShell
      logoUrl={config?.logoUrl}
      institutionName={config?.institutionName}
      user={{ fullName: user.fullName, email: user.email }}
    >
      {children}
    </AdminShell>
  );
}
