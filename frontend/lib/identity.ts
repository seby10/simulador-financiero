/** Estado de la confirmación de identidad biométrica de la cuenta. */
export type IdentityStatus = "PENDING" | "VERIFIED" | "LOCKED";

/** Usuario de la sesión tal como lo devuelve `/auth/me`. */
export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  firstName: string | null;
  role: "ADMIN" | "CUSTOMER";
  identityStatus: IdentityStatus;
}

/** Pantalla donde el cliente confirma su identidad con su rostro. */
export const IDENTITY_PATH = "/verify-identity";

/** Código con el que la API rechaza operar a una cuenta sin identidad verificada. */
export const IDENTITY_REQUIRED = "IDENTITY_REQUIRED";

/** Un cliente sin identidad verificada todavía no puede operar (el personal sí). */
export const needsIdentity = (user: Pick<SessionUser, "role" | "identityStatus">) =>
  user.role === "CUSTOMER" && user.identityStatus !== "VERIFIED";

/** URL de la confirmación de identidad que al terminar vuelve a `redirect`. */
export const identityUrl = (redirect?: string) =>
  redirect && redirect !== "/"
    ? `${IDENTITY_PATH}?redirect=${encodeURIComponent(redirect)}`
    : IDENTITY_PATH;
