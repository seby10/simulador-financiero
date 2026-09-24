import type { NextConfig } from "next";

/** Backend al que el servidor de Next reenvía /api y /uploads. */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  // En desarrollo, orígenes desde los que se abre el sitio además de localhost:
  // la IP de la red local o un túnel HTTPS para probar la cámara en el celular
  // (los navegadores móviles solo dan acceso a la cámara con HTTPS).
  // ALLOWED_DEV_ORIGINS="192.168.1.50,mi-tunel.trycloudflare.com"
  allowedDevOrigins: [
    "localhost:3000",
    "*.trycloudflare.com",
    ...(process.env.ALLOWED_DEV_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
