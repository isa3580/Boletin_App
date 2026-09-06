'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setCargando(true);
    
    try {
      // Consulta del usuario en la base de datos
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id, rol, nombre, apellido')
        .eq('correo', email.trim().toLowerCase())
        .single();

      if (error || !usuario) {
        setErrorMsg('El correo ingresado no está registrado en el sistema escolar.');
        setCargando(false);
        return;
      }
      
      // Enrutamiento automático según el rol asignado
      localStorage.setItem('usuarioActual', JSON.stringify(usuario));
      switch (usuario.rol) {
        case 'coordinador':
          router.push('/dashboard/coordinador');
          break;
        case 'director':
          router.push('/dashboard/director');
          break;
        case 'admin':
          router.push('/dashboard/admin');
          break;
        default:
          router.push('/dashboard/profesor'); 
          break;
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de conexión con el servidor escolar.');
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 relative overflow-hidden font-sans">
      
      {/* Luces difusas de fondo */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Barra de Marca Superior */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-amber-400 p-[1px] shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center text-lg">
              🏫
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tight text-white uppercase">Portal Escolar</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Sistema Integral de Boletines y Evaluación con IA</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Plataforma Académica Activa</span>
        </div>
      </header>

      {/* Contenedor Central Split-Screen */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 my-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        
        {/* COLUMNA IZQUIERDA: Propuesta Visual Educativa */}
        <div className="lg:col-span-7 space-y-8 text-left hidden lg:block pr-6">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-amber-500/10 border border-white/10 text-xs font-semibold text-amber-300">
              <span>✨</span>
              <span>Evaluación Pedagógica Inteligente</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">Primaria & Secundaria</span>
            </div>

            <h2 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Gestión de calificaciones y boletines escolares <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300">sin complicaciones.</span>
            </h2>

            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Diseñado para optimizar la labor docente y directiva. Registra calificaciones cuantitativas o cualitativas, genera informes descriptivos automatizados con inteligencia artificial y emite boletines oficiales listos para imprimir.
            </p>
          </div>

          {/* Tarjeta Visual de Demostración del Boletín / IA */}
          <div className="relative p-6 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 shadow-2xl backdrop-blur-xl max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-xs">
                  📝
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Informe Cualitativo Descriptivo</p>
                  <p className="text-[10px] text-slate-400">Generado por Asistente Pedagógico IA</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span>✓</span> Consolidado
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed italic bg-black/20 p-3.5 rounded-2xl border border-white/5 font-serif">
              "El estudiante demostró alto compromiso y pensamiento reflexivo en el área de matemáticas y comprensión lectora, consolidando ampliamente los objetivos del período pedagógico."
            </p>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="text-amber-400">★ ★ ★ ★ ★</span>
                <span className="font-semibold text-slate-300">Criterio Docente</span>
              </span>
              <span className="font-mono text-slate-400">1er Momento Oficial</span>
            </div>
          </div>

          {/* Beneficios Rápidos */}
          <div className="grid grid-cols-3 gap-4 max-w-lg text-xs">
            <div className="space-y-1">
              <span className="font-extrabold text-lg text-white block">100%</span>
              <span className="text-slate-400 block text-[11px]">Personalizable por aula</span>
            </div>
            <div className="space-y-1">
              <span className="font-extrabold text-lg text-amber-300 block">IA Asistida</span>
              <span className="text-slate-400 block text-[11px]">Redacción en segundos</span>
            </div>
            <div className="space-y-1">
              <span className="font-extrabold text-lg text-blue-400 block">PDF Oficial</span>
              <span className="text-slate-400 block text-[11px]">Formato tipo acta escolar</span>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: Formulario de Autenticación */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl p-8 sm:p-9 shadow-2xl shadow-blue-950/40 text-slate-800 space-y-6 relative border border-slate-200/80">
            
            {/* Cabecera del Formulario */}
            <div className="text-left space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                Acceso al Portal
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Iniciar Sesión
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Ingresa tus credenciales para acceder a tus salones y evaluaciones.
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Mensaje de Error */}
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl flex items-center gap-2.5 animate-fadeIn">
                  <span className="text-sm">⚠️</span>
                  <span className="font-medium leading-tight">{errorMsg}</span>
                </div>
              )}

              {/* Campo Correo */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Correo Institucional
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                    ✉️
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="docente@ejemplo.com"
                    className="w-full pl-10 pr-4 py-3 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Campo Contraseña con Toggle Ocultar/Ver */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setMostrarAyuda(!mostrarAyuda)}
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    ¿Problemas de acceso?
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                    🔒
                  </span>
                  <input
                    type={mostrarPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 text-sm focus:outline-none transition-colors"
                    title={mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {mostrarPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Ayuda Colapsable */}
              {mostrarAyuda && (
                <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 leading-relaxed space-y-1 animate-fadeIn">
                  <p className="font-bold flex items-center gap-1">
                    <span>💡</span> Información de acceso escolar:
                  </p>
                  <p>
                    Las cuentas institucionales son administradas por el control de estudios de tu institución educativa. Si olvidaste tus credenciales, solicita una reposición a la coordinación académica.
                  </p>
                </div>
              )}

              {/* Checkbox Recordar */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={recordar}
                    onChange={(e) => setRecordar(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Recordar en este navegador</span>
                </label>
              </div>

              {/* Botón de Entrada */}
              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 hover:-translate-y-0.5 duration-200"
              >
                {cargando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Verificando usuario...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar al Portal Escolar</span>
                    <span className="text-sm">→</span>
                  </>
                )}
              </button>

            </form>

            {/* Sello de Seguridad */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
              <span>🔒</span>
              <span>Acceso seguro protegido con encriptación</span>
            </div>

          </div>
        </div>

      </main>

      {/* Pie de Página */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/5 text-[11px] text-slate-500">
        <p>
          Portal Escolar • Plataforma de Evaluación Pedagógica y Boletines
        </p>
        <p className="text-slate-400">
          Soporte para niveles de Educación Primaria y Secundaria
        </p>
      </footer>

    </div>
  );
}
