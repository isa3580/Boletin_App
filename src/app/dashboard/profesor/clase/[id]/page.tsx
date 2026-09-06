'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase';
import { ANIO_ESCOLAR } from '../../../../../lib/constants';

interface CursoItem {
  id: number;
  nombre_grado: string;
  seccion: string;
  nivel: string;
}

interface AlumnoItem {
  id: string;
  nombre: string;
  apellido: string;
  curso_id: number;
  correo_representante?: string;
}

export default function ListaAlumnosPorCursoPage() {
  const params = useParams();
  const cursoId = params.id;
  const router = useRouter();

  const [cursoInfo, setCursoInfo] = useState<CursoItem | null>(null);
  const [estudiantes, setEstudiantes] = useState<AlumnoItem[]>([]);
  const [usuario, setUsuario] = useState<any>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('usuarioActual');
    if (stored) setUsuario(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!cursoId) return;

    const cargarDatosSalon = async () => {
      try {
        setCargando(true);
        const idNumerico = Number(cursoId);

        // 1. Consultar la información del curso/grado
        const { data: cursoData, error: cursoError } = await supabase
          .from('cursos')
          .select('*')
          .eq('id', idNumerico)
          .single();

        if (cursoError) throw cursoError;
        setCursoInfo(cursoData);

        // 2. Consultar los alumnos inscritos en este curso
        const { data: alumnosData, error: alumnosError } = await supabase
          .from('alumnos')
          .select('*')
          .eq('curso_id', idNumerico)
          .order('apellido', { ascending: true });

        if (alumnosError) throw alumnosError;
        setEstudiantes(alumnosData || []);

      } catch (error: any) {
        console.error("Error al cargar el salón:", error.message || error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosSalon();
  }, [cursoId]);

  const estudiantesFiltrados = estudiantes.filter((est) => {
    const nombreCompleto = `${est.nombre} ${est.apellido}`.toLowerCase();
    return nombreCompleto.includes(busqueda.toLowerCase());
  });

  const isPrimaria = cursoInfo?.nivel?.toLowerCase() === 'primaria';

  // Paleta de colores suaves para los avatares escolares
  const getAvatarBg = (index: number) => {
    const colors = [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-emerald-100 text-emerald-800 border-emerald-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-rose-100 text-rose-800 border-rose-200',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-amber-50/20 text-slate-800">
      
      {/* Barra de Navegación Institucional Escolar */}
      <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          
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
              <p className="text-[11px] text-slate-400 font-medium">Portal Docente • Registro de Calificaciones y Boletines</p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">Prof. {usuario?.nombre} {usuario?.apellido}</span>
              <span className="text-[11px] text-slate-400">Docente Titular</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-inner border-2 border-slate-700">
              {usuario?.nombre?.charAt(0)}{usuario?.apellido?.charAt(0)}
            </div>
          </div>

        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Miga de Pan y Botón de Retorno */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.push('/dashboard/profesor')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm hover:shadow"
          >
            <span>←</span> Volver a Mis Salones
          </button>
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Portal Docente</span>
            <span>/</span>
            <span>Aulas</span>
            <span>/</span>
            <span className="text-slate-700 font-bold">{cursoInfo?.nombre_grado || 'Cargando...'}</span>
          </div>
        </div>

        {/* Encabezado del Aula Escolar */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isPrimaria 
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                    : 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                }`}>
                  <span>{isPrimaria ? '🖍️' : '📐'}</span>
                  Educación {cursoInfo?.nivel}
                </span>

                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/10 text-slate-200 border border-white/10">
                  Año Escolar {ANIO_ESCOLAR}
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                  <span>📖</span>
                  {cursoInfo ? `${cursoInfo.nombre_grado} "${cursoInfo.seccion}"` : 'Cargando salón escolar...'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Listado oficial de la matrícula estudiantil. Selecciona a un alumno para evaluar su rendimiento pedagógico.
                </p>
              </div>
            </div>

            {/* Ficha Resumen de Matrícula */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 min-w-[210px] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Matrícula</span>
                <span className="text-xl font-black text-white">{estudiantes.length}</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full w-full rounded-full"></div>
              </div>
              <p className="text-[10px] text-slate-300">
                100% Expedientes activos
              </p>
            </div>
          </div>
        </header>

        {/* Barra de Herramientas y Búsqueda */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar estudiante por nombre o apellido..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {busqueda && (
              <button 
                onClick={() => setBusqueda('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-500 flex items-center gap-2 self-end sm:self-center">
            <span>Mostrando:</span>
            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-800 font-bold">
              {estudiantesFiltrados.length} de {estudiantes.length} alumnos
            </span>
          </div>

        </div>

        {/* Listado de Estudiantes Estilo Expediente Escolar */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span>👨‍🎓</span> Nómina Oficial de Estudiantes
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">
              Período Activo
            </span>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
              <p className="text-xs font-semibold text-slate-500 mt-3">Cargando matrícula del salón...</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {estudiantesFiltrados.map((estudiante, index) => {
                const iniciales = `${estudiante.nombre?.charAt(0) || ''}${estudiante.apellido?.charAt(0) || ''}`.toUpperCase();
                return (
                  <div 
                    key={estudiante.id} 
                    className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-blue-50/30 transition-all group"
                  >
                    
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs border shadow-sm ${getAvatarBg(index)}`}>
                        {iniciales || 'AL'}
                      </div>
                      
                      <div>
                        <p className="font-extrabold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                          {estudiante.nombre} {estudiante.apellido}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-500 font-mono font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                            Expediente: #{estudiante.id.slice(0, 8)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Matrícula Regular
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full sm:w-auto flex justify-end">
                      <button
                        onClick={() => router.push(`/dashboard/profesor/clase/${cursoId}/alumno/${estudiante.id}`)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                      >
                        <span>📝</span>
                        <span>Evaluar Desempeño</span>
                        <span className="text-slate-400 group-hover:text-white transition-colors">→</span>
                      </button>
                    </div>

                  </div>
                );
              })}

              {estudiantesFiltrados.length === 0 && estudiantes.length > 0 && (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <div className="text-3xl">🔍</div>
                  <p className="text-sm font-bold text-slate-700">No se encontraron estudiantes</p>
                  <p className="text-xs text-slate-400">
                    No hay ningún estudiante que coincida con "{busqueda}".
                  </p>
                  <button 
                    onClick={() => setBusqueda('')}
                    className="text-xs font-bold text-blue-600 hover:underline pt-2 inline-block"
                  >
                    Restablecer búsqueda
                  </button>
                </div>
              )}

              {estudiantes.length === 0 && (
                <div className="p-12 text-center text-slate-500 space-y-3">
                  <div className="text-4xl">📚</div>
                  <p className="text-sm font-bold text-slate-700">No hay estudiantes inscritos</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Este curso aún no tiene alumnos registrados en la base de datos para el período escolar activo.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}