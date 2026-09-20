'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { PERIODOS } from '../../../lib/constants';
import { useAnioEscolar } from '../../../lib/config';
import { 
  IconBook, 
  IconUsers, 
  IconBuilding, 
  IconAlertCircle, 
  IconCheck, 
  IconClock, 
  IconChevronRight, 
  IconGraduationCap, 
  IconDocument 
} from '../../../components/Icons';

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
  cursos?: CursoItem;
}

interface ReporteItem {
  id: string;
  alumno_id: string;
  texto_cualitativo_ia: string;
  periodo: string;
  estado: string; 
  notas_coordinacion: string | null;
  revisado_por: string | null;
  fecha_revision: string | null;
  fecha_generacion: string;
}

interface UsuarioItem {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
}

export default function CoordinadorDashboard() {
  const [cursos, setCursos] = useState<CursoItem[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoItem[]>([]);
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [profesores, setProfesores] = useState<UsuarioItem[]>([]);
  const [usuario, setUsuario] = useState<any>(null);
  
  // Pestañas principales: 'salones' | 'docentes'
  const [seccionActiva, setSeccionActiva] = useState<'salones' | 'docentes'>('salones');
  
  // Nivel asignado desde la BD
  const [filtroNivel, setFiltroNivel] = useState<'primaria' | 'secundaria'>('primaria');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>(PERIODOS[0]);
  const [nivelBloqueado, setNivelBloqueado] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [sistemaBloqueado, setSistemaBloqueado] = useState(false);
  const { anioEscolar } = useAnioEscolar();
  const router = useRouter();

  const cargarDatosCoordinador = async () => {
    try {
      setCargando(true);

      // Obtener nivel asignado del coordinador desde la BD
      const stored = localStorage.getItem('usuarioActual');
      if (stored) {
        const user = JSON.parse(stored);
        setUsuario(user);
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('nivel_asignado')
          .eq('id', user.id)
          .single();
        
        if (usuarioData?.nivel_asignado) {
          setFiltroNivel(usuarioData.nivel_asignado as 'primaria' | 'secundaria');
          setNivelBloqueado(true);
        }
      }

      // 1. Cursos
      const { data: cursosData } = await supabase.from('cursos').select('*').order('id', { ascending: true });
      setCursos(cursosData || []);

      // 2. Alumnos con cursos
      const { data: alumnosData } = await supabase.from('alumnos').select('*, cursos(*)');
      setAlumnos(alumnosData as any || []);

      // 3. IDs de todos los alumnos
      const idsAlumnos = (alumnosData || []).map(a => a.id);

      // 4. Reportes de los alumnos del sistema
      if (idsAlumnos.length > 0) {
        const { data: reportesData } = await supabase.from('reportes').select('*').in('alumno_id', idsAlumnos).order('fecha_generacion', { ascending: false });
        setReportes(reportesData || []);
      } else {
        setReportes([]);
      }

      // 5. Profesores
      const { data: profData } = await supabase.from('usuarios').select('id, nombre, apellido, correo').eq('rol', 'profesor');
      setProfesores(profData || []);

      // 6. Verificar si el sistema está bloqueado
      const { data: configData } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'sistema_bloqueado')
        .single();
      if (configData?.valor === 'true') setSistemaBloqueado(true);

    } catch (error) {
      console.error("Error al cargar datos de coordinación:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosCoordinador();
  }, []);

  // Filtramos los cursos según el nivel del coordinador
  const cursosDelNivel = cursos.filter(c => c.nivel?.toLowerCase() === filtroNivel);

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
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-400/20 text-indigo-300 rounded-full border border-indigo-400/30 capitalize">
                  Coord. {filtroNivel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Supervisión y Control Pedagógico de Aulas</p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">Prof. {usuario?.nombre} {usuario?.apellido}</span>
              <span className="text-[11px] text-indigo-300 font-semibold capitalize">Coordinación de {filtroNivel}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-inner border border-indigo-500">
              {usuario?.nombre?.charAt(0) || 'C'}{usuario?.apellido?.charAt(0) || 'P'}
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

        {sistemaBloqueado && (
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <IconAlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">Sistema Bloqueado</p>
              <p className="text-xs text-rose-700">El sistema se encuentra bloqueado por la administración escolar. No se pueden realizar cambios.</p>
            </div>
          </div>
        )}

        {/* Banner de Bienvenida y Selector de Nivel */}
        <section className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-6 sm:p-8 shadow-md border border-slate-800">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold text-indigo-300">
                <IconBook className="w-3.5 h-3.5 text-indigo-300" />
                <span>Año Escolar {anioEscolar}</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-emerald-300">{filtroPeriodo} Activo</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white capitalize">
                Coordinación Pedagógica de {filtroNivel}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Supervisa el rendimiento académico de las secciones, valida los informes cualitativos docentes y aprueba los boletines institucionales.
              </p>
            </div>

            {/* Alternador de Nivel */}
            <div className="flex flex-col gap-2 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 min-w-[220px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                {nivelBloqueado ? 'Nivel Asignado:' : 'Cambiar Vista de Nivel:'}
              </span>
              <div className="flex gap-1 bg-black/30 p-1 rounded-xl">
                <button
                  onClick={() => !nivelBloqueado && setFiltroNivel('primaria')}
                  disabled={nivelBloqueado}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filtroNivel === 'primaria' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                  } ${nivelBloqueado ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  Primaria
                </button>
                <button
                  onClick={() => !nivelBloqueado && setFiltroNivel('secundaria')}
                  disabled={nivelBloqueado}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filtroNivel === 'secundaria' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                  } ${nivelBloqueado ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  Secundaria
                </button>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 mt-2">Período:</span>
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="bg-black/40 text-white text-xs font-bold p-1.5 rounded-xl border border-white/10 focus:outline-none cursor-pointer"
              >
                {PERIODOS.map((p) => (
                  <option key={p} value={p} className="text-slate-900">{p}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Pestañas Principales */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm max-w-md">
          <button
            onClick={() => setSeccionActiva('salones')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              seccionActiva === 'salones' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <IconBuilding className="w-3.5 h-3.5" />
            <span>Salones Asignados ({cursosDelNivel.length})</span>
          </button>

          <button
            onClick={() => setSeccionActiva('docentes')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              seccionActiva === 'docentes' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <IconUsers className="w-3.5 h-3.5" />
            <span>Docentes del Nivel</span>
          </button>
        </div>

        {/* SECCIÓN 1: TARJETAS DE SALONES DEL NIVEL */}
        {seccionActiva === 'salones' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <IconBook className="w-4 h-4 text-slate-500" />
                  Grados y Secciones de {filtroNivel}
                </h2>
                <p className="text-xs text-slate-500">Selecciona un salón para revisar y aprobar sus boletines</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-white rounded-full border border-slate-200 text-slate-600 shadow-sm">
                {cursosDelNivel.length} salones
              </span>
            </div>

            {cargando ? (
              <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent"></div>
                <p className="text-xs font-semibold text-slate-500 mt-3">Cargando salones...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cursosDelNivel.map((curso) => {
                  const alumnosEnCurso = alumnos.filter(a => a.curso_id === curso.id);
                  const idsAlumnos = alumnosEnCurso.map(a => a.id);
                  const reportesEnCurso = reportes.filter(r => idsAlumnos.includes(r.alumno_id) && r.periodo === filtroPeriodo);
                  const porEvaluar = reportesEnCurso.filter(r => r.estado === 'en_revision_coordinador').length;
                  const totalAprobados = reportesEnCurso.filter(r => r.estado === 'aprobado_coordinador' || r.estado === 'enviado').length;

                  return (
                    <div
                      key={curso.id}
                      onClick={() => router.push(`/dashboard/coordinador/salon/${curso.id}`)}
                      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-400 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                    >
                      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                        filtroNivel === 'primaria' 
                          ? 'bg-amber-600' 
                          : 'bg-indigo-600'
                      }`} />

                      <div>
                        <div className="flex justify-between items-center mb-4 mt-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            filtroNivel === 'primaria'
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                          }`}>
                            {curso.nivel}
                          </span>

                          {porEvaluar > 0 ? (
                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-full text-[10px] font-bold animate-pulse">
                              {porEvaluar} por evaluar
                            </span>
                          ) : totalAprobados === alumnosEnCurso.length && alumnosEnCurso.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                              <IconCheck className="w-3 h-3 text-emerald-600" />
                              Al día
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-[10px] font-bold">
                              Esperando al docente
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                          {curso.nombre_grado}
                        </h3>
                        <div className="inline-block mt-1 font-extrabold text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                          Sección "{curso.seccion}"
                        </div>

                        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                          <IconUsers className="w-3.5 h-3.5 text-slate-400" />
                          Matrícula: {alumnosEnCurso.length} estudiantes
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-800">
                        <span>Supervisar Salón</span>
                        <IconChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}

                {cursosDelNivel.length === 0 && (
                  <div className="col-span-full text-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 space-y-3">
                    <IconDocument className="w-8 h-8 text-slate-300 mx-auto" />
                    <h3 className="font-bold text-slate-700 text-base">No hay salones registrados</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      No se encontraron cursos configurados para el nivel de {filtroNivel}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* SECCIÓN 2: DOCENTES DEL NIVEL */}
        {seccionActiva === 'docentes' && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <IconUsers className="w-4 h-4 text-slate-500" />
                  Personal Docente de {filtroNivel}
                </h2>
                <p className="text-[11px] text-slate-400">Listado de profesores adscritos a esta coordinación</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-600">
                {profesores.length} Docentes
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {profesores.map((prof) => (
                <div key={prof.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {prof.nombre?.charAt(0)}{prof.apellido?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{prof.nombre} {prof.apellido}</p>
                      <p className="text-xs text-slate-500 font-mono">{prof.correo}</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-center">
                    <IconCheck className="w-3 h-3 text-emerald-600" />
                    Activo en {filtroNivel}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}