'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface UsuarioActual {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
}

const ROL_DASHBOARD_MAP: Record<string, string> = {
  coordinador: '/dashboard/coordinador',
  director: '/dashboard/director',
  admin: '/dashboard/admin',
  profesor: '/dashboard/profesor',
};

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [autorizado, setAutorizado] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('usuarioActual');
    if (!stored) {
      router.push('/login');
      return;
    }

    try {
      const usuario: UsuarioActual = JSON.parse(stored);
      const dashboardEsperado = ROL_DASHBOARD_MAP[usuario.rol] || '/dashboard/profesor';

      if (!pathname.startsWith(dashboardEsperado)) {
        router.push(dashboardEsperado);
        return;
      }

      setAutorizado(true);
    } catch {
      localStorage.removeItem('usuarioActual');
      router.push('/login');
    } finally {
      setCargando(false);
    }
  }, [pathname, router]);

  if (cargando) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div suppressHydrationWarning className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!autorizado) return null;

  return <>{children}</>;
}
