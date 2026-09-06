'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { PERIODOS, ANIO_ESCOLAR } from '../../../lib/constants';

interface CursoAsignado {
  curso_id: number;
  cursos: {
    id: number;
    nombre_grado: string;
    seccion: string;
    nivel: string;
  };
}

export default function ProfesorDashboard() {
  const [cursos, setCursos] = useState<CursoAsignado[]>([]);
  const [usuario, setUsuario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const cargarMisCursos = async () => {
      try {
        setCargando(true);
        const stored = localStorage.getItem('usuarioActual');
        if (!stored) {
          router.push('/login');
          return;
        }
        const user = JSON.parse(stored);
        setUsuario(user);

        const { data, error } = await supabase
          .from('carga_academica')
          .select(`
            curso_id,
            cursos (id, nombre_grado, seccion, nivel)
          `)
          .eq('profesor_id', user.id);

        if (error) throw error;

        if (data) {
          const cursosUnicos = Array.from(
            new Map(data.map(item => [(item.cursos as any).id, item])).values()
          );
          setCursos(cursosUnicos as unknown as CursoAsignado[]);
        }
      } catch (error) {
        console.error("Error al cargar los cursos:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarMisCursos();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-amber-50/20 text-slate-800">
      
      {/* Barra de Navegación Institucional Escolar */}
      <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo y Nombre del Colegio */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 text-lg">
              🏫
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">U.E. COLEGIO SAN FRANCISCO</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30">
                  OFICIAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Portal Docente • Gestión de Boletines e Informes</p>
            </div>
          </div>

          {/* Información del Docente y Período */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">Prof. {usuario?.nombre} {usuario?.apellido}</span>
              <span className="text-[11px] text-slate-400">Docente Titular</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-inner border-2 border-slate-700">
              {usuario?.nombre?.charAt(0)}{usuario?.apellido?.charAt(0)}
            </div>
            <div className="pl-2 border-l border-slate-700">
              <button 
                onClick={() => { localStorage.removeItem('usuarioActual'); router.push('/login'); }}
                title="Cerrar sesión"
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Salir
              </button>
            </div>
          </div>

        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Banner de Bienvenida y Período Escolar */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-blue-950/10 border border-blue-800/40">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold text-amber-300">
                <span>📚</span>
                <span>Año Escolar {ANIO_ESCOLAR}</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-emerald-300">1er Momento Activo</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                ¡Bienvenido al Aula Virtual, Prof. {usuario?.nombre || ''}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Selecciona uno de tus salones asignados para registrar calificaciones por asignatura, generar informes cualitativos con apoyo de Inteligencia Artificial y emitir los boletines oficiales.
              </p>
            </div>

            {/* Ficha Resumen de Estado */}
            <div className="flex md:flex-col gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 min-w-[200px]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Salones Asignados</span>
                <span className="text-2xl font-black text-white">{cursos.length} {cursos.length === 1 ? 'Aula' : 'Aulas'}</span>
              </div>
              <div className="pt-2 border-t border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Estado de Registro</span>
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Periodo de Evaluación
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Sección de Aulas Asignadas */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <span>🎒</span> Mis Aulas de Clases
              </h2>
              <p className="text-xs text-slate-500">Grados y secciones bajo tu tutela pedagógica</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-white rounded-full border border-slate-200 text-slate-600 shadow-sm">
              {cursos.length} cursos activos
            </span>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
              <div className="animate-spin rounded-full h-9 w-9 border-3 border-blue-600 border-t-transparent"></div>
              <p className="text-xs font-semibold text-slate-500 mt-3">Cargando salones escolares...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursos.map((item) => {
                const isPrimaria = item.cursos.nivel?.toLowerCase() === 'primaria';
                return (
                  <div
                    key={item.cursos.id}
                    onClick={() => router.push(`/dashboard/profesor/clase/${item.cursos.id}`)}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-400/80 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* Franja de Acento Superior */}
                    <div className={`absolute top-0 left-0 right-0 h-2 ${
                      isPrimaria 
                        ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500' 
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500'
                    }`} />

                    <div>
                      {/* Nivel Escolar y Distintivo */}
                      <div className="flex justify-between items-center mb-4 mt-1">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          isPrimaria
                            ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                            : 'bg-blue-50 text-blue-800 border border-blue-200/80'
                        }`}>
                          <span>{isPrimaria ? '🖍️' : '📐'}</span>
                          {item.cursos.nivel}
                        </span>

                        <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors shadow-inner">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>

                      {/* Título del Grado */}
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                        {item.cursos.nombre_grado}
                      </h3>
                      <div className="inline-block mt-1 font-extrabold text-sm text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        Sección "{item.cursos.seccion}"
                      </div>

                      <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Ver lista de estudiantes y actas
                      </p>
                    </div>

                    {/* Botón Escolar de Acción */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-800">
                      <span>Ingresar al Salón</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                );
              })}

              {cursos.length === 0 && (
                <div className="col-span-full text-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-500 space-y-3">
                  <div className="text-4xl">📋</div>
                  <h3 className="font-bold text-slate-700 text-base">Sin salones asignados</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Aún no tienes grados o secciones asignadas en la carga académica para este período.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}