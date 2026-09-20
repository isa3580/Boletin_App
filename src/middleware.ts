import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mapa de rutas base según el rol del usuario
const RUTA_INICIO_POR_ROL: Record<string, string> = {
  profesor: '/dashboard/profesor',
  coordinador: '/dashboard/coordinador',
  director: '/dashboard/director',
  admin: '/dashboard/admin',
};

// Prefijos de ruta permitidos para cada rol
const RUTAS_PERMITIDAS: Record<string, string[]> = {
  profesor: ['/dashboard/profesor'],
  coordinador: ['/dashboard/coordinador'],
  director: ['/dashboard/director'],
  admin: ['/dashboard'], // El administrador puede supervisar todo el sistema
};

/**
 * Middleware de Autenticación y Control de Roles — Portal Escolar (Next.js)
 *
 * 1. Protege todas las rutas bajo /dashboard/* verificando la cookie de sesión activa.
 * 2. Si no hay sesión, redirige a /login.
 * 3. Si el usuario intenta acceder a una ruta que no corresponde a su rol,
 *    lo redirige a su panel asignado.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sesionCookie = request.cookies.get('portalActivo');

  // 1. Si no hay cookie de sesión, redirigir al login
  if (!sesionCookie || !sesionCookie.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirigir', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Validar estructura de la cookie de sesión
  let sesion: { id?: string; rol?: string } = {};
  try {
    sesion = JSON.parse(decodeURIComponent(sesionCookie.value));
    if (!sesion?.id || !sesion?.rol) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('portalActivo');
      return response;
    }
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('portalActivo');
    return response;
  }

  const rol = sesion.rol.toLowerCase();
  const rutaInicio = RUTA_INICIO_POR_ROL[rol] || '/login';
  const rutasValidas = RUTAS_PERMITIDAS[rol] || [];

  // 3. Si accede a la raíz de /dashboard a secas, redirigir a su pantalla principal
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return NextResponse.redirect(new URL(rutaInicio, request.url));
  }

  // 4. Control estricto de roles: ¿la ruta solicitada está dentro de sus rutas permitidas?
  const tienePermiso = rutasValidas.some((prefijo) => pathname.startsWith(prefijo));

  if (!tienePermiso) {
    return NextResponse.redirect(new URL(rutaInicio, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Intercepta todas las rutas dentro de /dashboard
  matcher: ['/dashboard/:path*'],
};

