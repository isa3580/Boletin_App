'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { IconMail, IconLock, IconEye, IconAlertCircle } from '../../components/Icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCargando(true);
    
    try {
      // Paso 1: Verificar que el correo existe y obtener datos del usuario
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id, rol, nombre, apellido, contrasena')
        .eq('correo', email.trim().toLowerCase())
        .single();

      if (error || !usuario) {
        setErrorMsg('El correo ingresado no está registrado en el sistema escolar.');
        return;
      }

      // Paso 2: Validar la contraseña contra la almacenada en la BD
      if (usuario.contrasena !== password) {
        setErrorMsg('Contraseña incorrecta. Verifica tus credenciales e intenta nuevamente.');
        return;
      }

      // Paso 3: Guardar sesión (sin incluir la contraseña en la sesión)
      const sesionSegura = {
        id: usuario.id,
        rol: usuario.rol,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
      };
      localStorage.setItem('usuarioActual', JSON.stringify(sesionSegura));

      // Paso 4: Establecer cookie de sesión para que el proxy proteja las rutas del dashboard
      document.cookie = `portalActivo=${encodeURIComponent(JSON.stringify(sesionSegura))}; path=/; SameSite=Strict; max-age=86400`;

      // Paso 5: Enrutamiento automático según el rol asignado
      switch (usuario.rol) {
        case 'coordinador':
          router.push('/dashboard/coordinador');
          break;
        case 'director':
          router.push('/dashboard/director');
          break;
        case 'profesor':
          router.push('/dashboard/profesor');
          break;
        case 'admin':
          router.push('/dashboard/admin');
          break;
        default:
          router.push('/dashboard/profesor'); 
          break;
      }
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setErrorMsg('Ocurrió un error inesperado al conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans text-slate-100 selection:bg-blue-600 selection:text-white">
      
      {/* Luces sutiles de ambiente */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Espaciador Superior */}
      <div className="w-full py-3"></div>

      {/* Contenedor Principal Centrado */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-8 my-auto flex flex-col items-center">
        
        {/* Tarjeta de Autenticación */}
        <div className="w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl shadow-slate-950/40 border border-slate-200/80 text-slate-800 space-y-7">
          
          {/* Cabecera Institucional y Logo */}
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <img 
                src="/logo.jpg" 
                alt="Logo Colegio San Francisco" 
                className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-full mx-auto shadow-md border-4 border-slate-100 bg-white" 
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                U.E. Colegio San Francisco
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Sistema Integral de Evaluación y Boletines
              </p>
            </div>
          </div>

          {/* Formulario de Inicio de Sesión */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Mensaje de Error */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl flex items-center gap-2.5 animate-fadeIn">
                <IconAlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium leading-tight">{errorMsg}</span>
              </div>
            )}

            {/* Campo Correo Institucional */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Correo Institucional
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <IconMail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@colegio.com"
                  className="w-full pl-10 pr-4 py-3 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarAyuda(!mostrarAyuda)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  ¿Problemas de acceso?
                </button>
              </div>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <IconLock className="w-4 h-4" />
                </span>
                <input
                  type={mostrarPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 text-sm focus:outline-none transition-colors"
                  title={mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  <IconEye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Botón de Ingreso */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 mt-3 flex items-center justify-center gap-2 cursor-pointer"
            >
              {cargando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Iniciando Sesión...</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </button>
          </form>

          {/* Panel de Ayuda Institucional */}
          {mostrarAyuda && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5 text-slate-600 animate-fadeIn">
              <p className="font-bold text-slate-800">Soporte y Restablecimiento de Credenciales:</p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Por favor, comuníquese con el departamento de <strong>Control de Estudios</strong> o la administración del plantel para gestionar el restablecimiento de su acceso institucional.
              </p>
            </div>
          )}

          {/* Pie de la Tarjeta */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Control de Estudios</span>
            <span>Acceso Seguro</span>
          </div>

        </div>

      </main>

      {/* Pie de Página */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-4 text-center text-[11px] text-slate-500 border-t border-white/5">
        <p>© 2026 U.E. Colegio San Francisco • Todos los derechos reservados.</p>
      </footer>

    </div>
  );
}
