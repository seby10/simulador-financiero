"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ThemeSync() {
  const router = useRouter();

  useEffect(() => {
    // Escucha cambios en el localStorage desde otras pestañas
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'institutionUpdated') {
        // Al detectar que se guardó la configuración en otra pestaña,
        // recargamos automáticamente para aplicar los nuevos colores y datos.
        window.location.reload();
      }
    };
    
    window.addEventListener('storage', handleStorage);
    
    return () => window.removeEventListener('storage', handleStorage);
  }, [router]);

  return null;
}
