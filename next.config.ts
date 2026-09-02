import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: true, // Le dice al navegador que esta ruta siempre debe ir al login
      },
    ];
  },
};

export default nextConfig;
