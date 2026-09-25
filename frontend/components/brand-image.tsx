"use client";

import { useState } from "react";

/**
 * Ruta de una imagen de marca (logo, portada) tal como la usa el navegador. Las
 * rutas relativas (/api/..., /uploads/...) pasan por los rewrites de Next, así
 * funcionan igual en local, en el túnel y en producción.
 */
export const brandImageSrc = (url: string) =>
  /^https?:\/\//.test(url) || url.startsWith("/") ? url : `/${url}`;

/**
 * Imagen configurable por el administrador que, si no carga (por ejemplo un
 * archivo que quedó en el disco de otra máquina), muestra el respaldo en vez
 * de un ícono roto.
 */
export default function BrandImage({
  url,
  alt,
  className,
  fallback,
}: {
  url: string | null | undefined;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || failedUrl === url) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- imagen dinámica servida por la API
    <img src={brandImageSrc(url)} alt={alt} className={className} onError={() => setFailedUrl(url)} />
  );
}
