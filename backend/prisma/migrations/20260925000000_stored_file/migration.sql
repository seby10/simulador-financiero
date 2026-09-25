-- Archivos subidos en la base en vez del disco: el contenedor de la API se
-- reinicia con el disco vacío y la selfie de referencia (recuperación de clave)
-- no puede perderse en cada despliegue.
CREATE TABLE IF NOT EXISTS "StoredFile" (
    "path" TEXT NOT NULL,
    "mimeType" VARCHAR(32) NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("path")
);
