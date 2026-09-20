'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase';
import { PERIODOS } from '../../../../../lib/constants';
import { useAnioEscolar } from '../../../../../lib/config';
import { 
  IconArrowLeft, 
  IconCheck, 
  IconClock, 
  IconDocument, 
  IconEye, 
  IconEdit, 
  IconAlertCircle, 
  IconUsers, 
  IconBook, 
  IconChevronRight 
} from '../../../../../components/Icons';

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
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>(PERIODOS[0]);
  const [reportesAlumnos, setReportesAlumnos] = useState<Record<string, string>>({});
  const [periodosCerrados, setPeriodosCerrados] = useState<string[]>([]);
  const { anioEscolar } = useAnioEscolar();

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

        const stored = localStorage.getItem('usuarioActual');
        const user = stored ? JSON.parse(stored) : null;
        if (user && cursoData.profesor_encargado_id !== user.id) {
          alert("Solo el docente titular o profesor guía de este salón puede acceder.");
          router.push('/dashboard/profesor');
          return;
        }

        // 2. Consultar los alumnos inscritos en este curso
        const { data: alumnosData, error: alumnosError } = await supabase
          .from('alumnos')
          .select('*')
          .eq('curso_id', idNumerico)
          .order('apellido', { ascending: true });

        if (alumnosError) throw alumnosError;
        setEstudiantes(alumnosData || []);

        // 3. Reportes de estos alumnos en el período seleccionado
        const idsAlumnos = (alumnosData || []).map(a => a.id);
        if (idsAlumnos.length > 0) {
          const { data: reportesData } = await supabase
            .from('reportes')
            .select('alumno_id, estado')
            .eq('periodo', periodoSeleccionado)
            .in('alumno_id', idsAlumnos);
          const mapa: Record<string, string> = {};
          (reportesData || []).forEach(r => { mapa[r.alumno_id] = r.estado; });
          setReportesAlumnos(mapa);
        } else {
          setReportesAlumnos({});
        }

        // 4. Consultar lapsos cerrados del año
        const { data: cerradosData } = await supabase
          .from('periodos_cerrados')
          .select('periodo')
          .eq('anio_escolar', anioEscolar);
        setPeriodosCerrados((cerradosData || []).map(c => c.periodo));

      } catch (error: any) {
        console.error("Error al cargar el salón:", error.message || error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosSalon();
  }, [cursoId, periodoSeleccionado, periodosCerrados.join(',')]);

  const estudiantesFiltrados = estudiantes.filter((est) => {
    const nombreCompleto = `${est.nombre} ${est.apellido}`.toLowerCase();
    return nombreCompleto.includes(busqueda.toLowerCase());
  });

  const isPrimaria = cursoInfo?.nivel?.toLowerCase() === 'primaria';

  const getAvatarBg = (index: number) => {
    const colors = [
      'bg-blue-50 text-blue-800 border-blue-200',
      'bg-amber-50 text-amber-900 border-amber-200',
      'bg-emerald-50 text-emerald-800 border-emerald-200',
      'bg-indigo-50 text-indigo-800 border-indigo-200',
      'bg-purple-50 text-purple-800 border-purple-200',
      'bg-slate-100 text-slate-800 border-slate-200',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      
      {/* Barra de Navegación Institucional con Logo */}
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
              <p className="text-[11px] text-slate-400 font-medium">Portal Docente • Registro de Calificaciones y Boletines</p>
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
          </div>

        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Acciones de Navegación */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.push('/dashboard/profesor')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm"
          >
            <IconArrowLeft className="w-4 h-4" />
            <span>Volver a Mis Salones</span>
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
        <header className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-6 sm:p-8 shadow-md border border-slate-800">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isPrimaria 
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                    : 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                }`}>
                  <IconBook className="w-3.5 h-3.5" />
                  Educación {cursoInfo?.nivel}
                </span>

                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/10 text-slate-200 border border-white/10">
                  Año Escolar {anioEscolar}
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                  {cursoInfo ? `${cursoInfo.nombre_grado} "${cursoInfo.seccion}"` : 'Cargando salón escolar...'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Nómina oficial de estudiantes. Selecciona un alumno para evaluar su rendimiento y redactar su informe.
                </p>
              </div>
            </div>

            {/* Ficha Resumen de Matrícula */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 min-w-[200px] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Matrícula</span>
                <span className="text-xl font-black text-white">{estudiantes.length}</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-400 h-full w-full rounded-full"></div>
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
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar estudiante por nombre o apellido..."
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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

        {/* Listado de Estudiantes */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <IconUsers className="w-4 h-4 text-slate-500" />
              Nómina Oficial de Estudiantes
            </h2>
            <select
              value={periodoSeleccionado}
              onChange={(e) => setPeriodoSeleccionado(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {PERIODOS.map((p) => (
                <option key={p} value={p} disabled={periodosCerrados.includes(p)}>
                  {p} {periodosCerrados.includes(p) ? '(Cerrado)' : ''}
                </option>
              ))}
            </select>
          </div>

          {periodosCerrados.includes(periodoSeleccionado) && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-xl flex items-center gap-3">
              <IconAlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold">Este lapso está cerrado por administración.</p>
                <p className="text-[11px] text-rose-700">No se pueden registrar evaluaciones hasta que la administración lo habilite.</p>
              </div>
            </div>
          )}

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
                    className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-all group"
                  >
                    
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border ${getAvatarBg(index)}`}>
                        {iniciales || 'AL'}
                      </div>
                      
                      <div>
                        <p className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                          {estudiante.nombre} {estudiante.apellido}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-500 font-mono font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                            Exp. #{estudiante.id.slice(0, 8)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Matrícula Regular
                          </span>
                          {reportesAlumnos[estudiante.id] === 'borrador' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <IconClock className="w-3 h-3 text-amber-600" />
                              Borrador Guardado
                            </span>
                          )}
                          {reportesAlumnos[estudiante.id] === 'devuelto_profesor' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <IconAlertCircle className="w-3 h-3 text-rose-600" />
                              Devuelto para Ajustes
                            </span>
                          )}
                          {reportesAlumnos[estudiante.id] === 'en_revision_coordinador' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              <IconClock className="w-3 h-3 text-purple-600" />
                              En Coordinación
                            </span>
                          )}
                          {reportesAlumnos[estudiante.id] === 'aprobado_coordinador' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                              <IconCheck className="w-3 h-3 text-blue-600" />
                              Aprobado
                            </span>
                          )}
                          {reportesAlumnos[estudiante.id] === 'enviado' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <IconCheck className="w-3 h-3 text-emerald-600" />
                              Enviado
                            </span>
                          )}
                          {!reportesAlumnos[estudiante.id] && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              Sin evaluar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full sm:w-auto flex justify-end">
                      {(() => {
                        const estado = reportesAlumnos[estudiante.id];
                        const esDevuelto = estado === 'devuelto_profesor';
                        const esBorrador = estado === 'borrador';
                        const bloqueado = estado === 'en_revision_coordinador' || estado === 'aprobado_coordinador' || estado === 'enviado';
                        
                        if (bloqueado) {
                          return (
                            <button
                              onClick={() => router.push(`/dashboard/profesor/clase/${cursoId}/alumno/${estudiante.id}`)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-300 transition-all shadow-sm cursor-pointer"
                              title="Ver el boletín y calificaciones registradas"
                            >
                              <IconEye className="w-3.5 h-3.5 text-blue-600" />
                              <span>{estado === 'enviado' ? 'Ver Boletín Enviado' : estado === 'aprobado_coordinador' ? 'Ver Boletín Aprobado' : 'Ver en Revisión'}</span>
                            </button>
                          );
                        }
                        
                        return (
                          <button
                            onClick={() => router.push(`/dashboard/profesor/clase/${cursoId}/alumno/${estudiante.id}`)}
                            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer ${
                              esDevuelto 
                                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800' 
                                : esBorrador
                                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                            }`}
                          >
                            <IconEdit className="w-3.5 h-3.5" />
                            <span>{esDevuelto ? 'Corregir Reporte' : esBorrador ? 'Continuar Evaluación' : 'Evaluar Alumno'}</span>
                            <IconChevronRight className="w-3.5 h-3.5 text-white/70 group-hover:text-white transition-colors" />
                          </button>
                        );
                      })()}
                    </div>

                  </div>
                );
              })}

              {estudiantesFiltrados.length === 0 && estudiantes.length > 0 && (
                <div className="p-12 text-center text-slate-500 space-y-2">
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
                  <IconDocument className="w-8 h-8 text-slate-300 mx-auto" />
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