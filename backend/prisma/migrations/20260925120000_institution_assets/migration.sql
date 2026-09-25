-- Imágenes de marca en la base (ver model InstitutionAsset).
CREATE TABLE "InstitutionAsset" (
    "kind" VARCHAR(16) NOT NULL,
    "mimeType" VARCHAR(32) NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionAsset_pkey" PRIMARY KEY ("kind")
);
