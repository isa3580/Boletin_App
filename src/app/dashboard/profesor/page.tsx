'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { PERIODOS } from '../../../lib/constants';
import { useAnioEscolar } from '../../../lib/config';
import { 
  IconBook, 
  IconUsers, 
  IconShield, 
  IconChevronRight, 
  IconDocument 
} from '../../../components/Icons';

interface CursoAsignado {
  id: number;
  nombre_grado: string;
  seccion: string;
  nivel: string;
  esEncargado: boolean;
  rolPedagogico: string;
}

export default function ProfesorDashboard() {
  const [cursos, setCursos] = useState<CursoAsignado[]>([]);
  const [usuario, setUsuario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const { anioEscolar } = useAnioEscolar();
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

        // Cursos donde es Docente Titular (Primaria) o Profesor Guía (Secundaria)
        const { data: cursosEncargado } = await supabase
          .from('cursos')
          .select('id, nombre_grado, seccion, nivel, profesor_encargado_id')
          .eq('profesor_encargado_id', user.id);

        const mapaCursos = new Map<number, CursoAsignado>();

        (cursosEncargado || []).forEach((c: any) => {
          const isPrimaria = c.nivel?.toLowerCase() === 'primaria';
          mapaCursos.set(c.id, {
            id: c.id,
            nombre_grado: c.nombre_grado,
            seccion: c.seccion,
            nivel: c.nivel,
            esEncargado: true,
            rolPedagogico: isPrimaria ? 'Docente de Aula Titular' : 'Profesor Guía de Sección'
          });
        });

        setCursos(Array.from(mapaCursos.values()));
      } catch (error) {
        console.error("Error al cargar los cursos:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarMisCursos();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      
      {/* Barra de Navegación Institucional */}
      <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3.5">
            <img 
              src="/logo.jpg" 
              alt="Logo Colegio San Francisco" 
              className="w-13 h-13 sm:w-14 sm:h-14 object-cover rounded-full shadow-md border-2 border-slate-700 bg-white flex-shrink-0" 
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white uppercase">U.E. COLEGIO SAN FRANCISCO</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-blue-400/20 text-blue-300 rounded-full border border-blue-400/30">
                  DOCENCIA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Portal Docente • Gestión de Boletines e Informes</p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">Prof. {usuario?.nombre} {usuario?.apellido}</span>
              <span className="text-[11px] text-slate-400">Docente Titular</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-inner border border-blue-500">
              {usuario?.nombre?.charAt(0)}{usuario?.apellido?.charAt(0)}
            </div>
            <div className="pl-2 border-l border-slate-700">
              <button 
                onClick={() => { localStorage.removeItem('usuarioActual'); document.cookie = 'portalActivo=; path=/; max-age=0'; router.push('/login'); }}
                title="Cerrar sesión"
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors font-semibold"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>

        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Banner de Bienvenida y Período Escolar */}
        <section className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-6 sm:p-8 shadow-md border border-slate-800">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold text-blue-300">
                <IconBook className="w-3.5 h-3.5 text-blue-300" />
                <span>Año Escolar {anioEscolar}</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-emerald-300">{PERIODOS[0]} Activo</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Bienvenido al Portal Docente, Prof. {usuario?.nombre || ''}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Selecciona uno de tus salones asignados para registrar calificaciones por asignatura, generar informes cualitativos pedagógicos y emitir los boletines oficiales.
              </p>
            </div>

            {/* Ficha Resumen de Estado */}
            <div className="flex md:flex-col gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 min-w-[200px]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Salones Asignados</span>
                <span className="text-2xl font-black text-white">{cursos.length} {cursos.length === 1 ? 'Aula' : 'Aulas'}</span>
              </div>
              <div className="pt-2 border-t border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Estatus de Registro</span>
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Período de Evaluación
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Sección de Aulas Asignadas */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <IconBook className="w-4 h-4 text-slate-500" />
                Mis Aulas de Clases
              </h2>
              <p className="text-xs text-slate-500">Grados y secciones bajo tu tutela pedagógica</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-white rounded-full border border-slate-200 text-slate-600 shadow-sm">
              {cursos.length} cursos activos
            </span>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
              <p className="text-xs font-semibold text-slate-500 mt-3">Cargando salones escolares...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursos.map((item) => {
                const isPrimaria = item.nivel?.toLowerCase() === 'primaria';
                return (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/dashboard/profesor/clase/${item.id}`)}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-400 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isPrimaria 
                        ? 'bg-amber-600' 
                        : 'bg-indigo-600'
                    }`} />

                    <div>
                      <div className="flex justify-between items-center mb-4 mt-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          isPrimaria
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : 'bg-blue-50 text-blue-900 border border-blue-200'
                        }`}>
                          {item.nivel}
                        </span>

                        <div className="w-7 h-7 rounded-lg bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
                          <IconChevronRight className="h-4 w-4" />
                        </div>
                      </div>

                      <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                        {item.nombre_grado}
                      </h3>
                      <div className="inline-block mt-1 font-extrabold text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        Sección "{item.seccion}"
                      </div>

                      <div className="mt-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          isPrimaria
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                        }`}>
                          <IconShield className="w-3.5 h-3.5" />
                          <span>{item.rolPedagogico}</span>
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                        <IconUsers className="w-3.5 h-3.5 text-slate-400" />
                        Ver nómina de estudiantes y actas
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-800">
                      <span>Ingresar al Salón</span>
                      <IconChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}

              {cursos.length === 0 && (
                <div className="col-span-full text-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 space-y-3">
                  <IconDocument className="w-8 h-8 text-slate-300 mx-auto" />
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