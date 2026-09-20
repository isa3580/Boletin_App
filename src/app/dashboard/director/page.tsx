'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { PERIODOS } from '../../../lib/constants';
import { useAnioEscolar } from '../../../lib/config';
import { 
  IconBuilding, 
  IconCheck, 
  IconClock, 
  IconDocument, 
  IconMail, 
  IconAlertCircle, 
  IconUsers, 
  IconSend, 
  IconChevronRight, 
  IconBook,
  IconShield,
  IconLock
} from '../../../components/Icons';

interface CursoItem {
  id: number;
  nombre_grado: string;
  seccion: string;
  nivel: string;
  profesor_encargado_id?: string;
}

interface AlumnoItem {
  id: string;
  nombre: string;
  apellido: string;
  curso_id: number;
  correo_representante?: string;
}

interface ReporteItem {
  id: string;
  alumno_id: string;
  texto_cualitativo_ia: string;
  estado: string;
  periodo: string;
}

export default function DirectorDashboard() {
  const [cursos, setCursos] = useState<CursoItem[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoItem[]>([]);
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [profesores, setProfesores] = useState<any[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>(PERIODOS[0]);
  const [cargando, setCargando] = useState(true);
  const [firmaAutorizada, setFirmaAutorizada] = useState(false);
  const [procesandoFirma, setProcesandoFirma] = useState(false);
  const [sistemaBloqueado, setSistemaBloqueado] = useState(false);
  const [periodoCerrado, setPeriodoCerrado] = useState(false);
  const [alertaExito, setAlertaExito] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const { anioEscolar } = useAnioEscolar();
  const router = useRouter();

  const cargarDatosDirector = async () => {
    try {
      setCargando(true);

      const stored = localStorage.getItem('usuarioActual');
      if (stored) setUsuario(JSON.parse(stored));

      const { data: cursosData } = await supabase.from('cursos').select('*').order('id', { ascending: true });
      setCursos(cursosData || []);

      const { data: profsData } = await supabase.from('usuarios').select('id, nombre, apellido, rol');
      setProfesores(profsData || []);

      const { data: alumnosData } = await supabase.from('alumnos').select('*');
      setAlumnos(alumnosData || []);

      const { data: reportesData } = await supabase
        .from('reportes')
        .select('id, alumno_id, texto_cualitativo_ia, estado, periodo')
        .eq('periodo', filtroPeriodo);
      setReportes(reportesData || []);

      // Verificar si el Director autorizó la firma de este período
      const { data: firmaData } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', `firma_director_${filtroPeriodo}`)
        .single();
      setFirmaAutorizada(firmaData?.valor === 'true');

      // Bloqueo global del sistema
      const { data: configData } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'sistema_bloqueado')
        .single();
      if (configData?.valor === 'true') setSistemaBloqueado(true);

      // Período cerrado
      const { data: periodoData } = await supabase
        .from('periodos_cerrados')
        .select('id')
        .eq('periodo', filtroPeriodo)
        .limit(1);
      if (periodoData && periodoData.length > 0) setPeriodoCerrado(true);

    } catch (error) {
      console.error("Error al cargar datos de dirección:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosDirector();
  }, [filtroPeriodo]);

  const handleToggleFirmaMaestra = async () => {
    const nuevoEstado = !firmaAutorizada;

    if (nuevoEstado) {
      // VALIDACIÓN ESTRICTA: Todos los boletines de la matrícula deben estar aprobados por Coordinación
      const faltantesAprobar = totalMatricula - totalAprobadosCoord;
      if (faltantesAprobar > 0) {
        alert(
          `No se puede autorizar la Firma y Sello Oficial del ${filtroPeriodo} todavía.\n\n` +
          `Estado actual: ${totalAprobadosCoord} de ${totalMatricula} estudiantes aprobados (${pctAprobados}% de avance).\n` +
          `Faltan: ${faltantesAprobar} estudiante(s) por recibir el visto bueno de Coordinación Pedagógica.\n\n` +
          `Regla Institucional: Todos los boletines del plantel deben estar completamente calificados y aprobados por Coordinación antes de aplicar la Firma y Sello Oficial de Dirección.`
        );
        return;
      }
    }

    const mensajeConfirm = nuevoEstado
      ? `Todos los boletines del ${filtroPeriodo} (${totalAprobadosCoord}/${totalMatricula}) han sido aprobados por Coordinación Pedagógica.\n\n¿Deseas AUTORIZAR formalmente la Firma Digital y Sello Oficial de la Dirección para todos los boletines del ${filtroPeriodo}?`
      : `¿Deseas REVOCAR / PAUSAR la autorización de firma para el ${filtroPeriodo}?`;

    const ok = confirm(mensajeConfirm);
    if (!ok) return;

    setProcesandoFirma(true);
    try {
      const { error } = await supabase
        .from('configuracion_sistema')
        .upsert({
          clave: `firma_director_${filtroPeriodo}`,
          valor: nuevoEstado ? 'true' : 'false',
          descripcion: `Autorización de firma y sello de dirección para ${filtroPeriodo}`
        }, { onConflict: 'clave' });

      if (error) throw error;

      setFirmaAutorizada(nuevoEstado);
      setAlertaExito(nuevoEstado 
        ? `Firma y Sello Oficial de la Dirección AUTORIZADOS con éxito para el ${filtroPeriodo}.` 
        : `Firma de la Dirección revocada/pausada para el ${filtroPeriodo}.`);
      setTimeout(() => setAlertaExito(null), 4000);
    } catch (error: any) {
      console.error("Error al actualizar firma:", error);
      alert("Hubo un error al actualizar la autorización de firma.");
    } finally {
      setProcesandoFirma(false);
    }
  };

  // Cálculos macro institucionales
  const totalMatricula = alumnos.length;
  const reportesDelPeriodo = reportes.filter(r => r.periodo === filtroPeriodo);
  const totalEvaluados = reportesDelPeriodo.length;
  const totalAprobadosCoord = reportesDelPeriodo.filter(r => ['aprobado_coordinador', 'enviado'].includes(r.estado)).length;
  const totalDespachados = reportesDelPeriodo.filter(r => r.estado === 'enviado').length;

  const pctEvaluados = totalMatricula > 0 ? Math.round((totalEvaluados / totalMatricula) * 100) : 0;
  const pctAprobados = totalMatricula > 0 ? Math.round((totalAprobadosCoord / totalMatricula) * 100) : 0;
  const pctDespachados = totalMatricula > 0 ? Math.round((totalDespachados / totalMatricula) * 100) : 0;

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
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30">
                  DIRECCIÓN GENERAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Panel de Mando Institucional • Autorización de Firma y Auditoría Macro</p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">{usuario?.nombre} {usuario?.apellido}</span>
              <span className="text-[11px] text-amber-300 font-semibold">Dirección del Plantel</span>
            </div>
            <button 
              onClick={() => { localStorage.removeItem('usuarioActual'); document.cookie = 'portalActivo=; path=/; max-age=0'; router.push('/login'); }}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 font-semibold cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

        {alertaExito && (
          <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-800 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3">
              <IconCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-bold">{alertaExito}</p>
            </div>
            <button onClick={() => setAlertaExito(null)} className="text-emerald-600 font-bold hover:text-emerald-800 cursor-pointer">✕</button>
          </div>
        )}

        {/* Interruptor Maestro de Firma Oficial del Director */}
        <header className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Máxima Autoridad Legal
                </span>
                <span className="text-xs text-slate-400 font-mono">Año Escolar {anioEscolar}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <IconShield className="w-7 h-7 text-amber-400" />
                <span>Autorización y Firma Institucional</span>
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                El Director General autoriza mediante su firma y sello legal la emisión de los boletines académicos aprobados por Coordinación, delegando la ejecución del despacho a Control de Estudios y Secretaría.
              </p>
            </div>

            {/* Selector de Período Escolar */}
            <div className="bg-white/10 p-3 rounded-2xl border border-white/15 flex flex-col gap-1 min-w-[200px]">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Momento / Lapso Escolar:
              </label>
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="w-full bg-slate-800 text-white font-bold text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                {PERIODOS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tarjeta del Interruptor Maestro de Firma */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border ${
                firmaAutorizada 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30 shadow-lg shadow-emerald-500/10' 
                  : 'bg-amber-500/20 text-amber-400 border-amber-400/30'
              }`}>
                {firmaAutorizada ? <IconCheck className="w-6 h-6" /> : <IconLock className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    firmaAutorizada 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {firmaAutorizada ? 'Firma y Sello Oficial: ACTIVO Y AUTORIZADO' : 'Firma de Dirección: PENDIENTE DE AUTORIZACIÓN'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {firmaAutorizada 
                    ? `Los boletines aprobados del ${filtroPeriodo} cuentan con el aval legal de la Dirección para su despacho a los padres.`
                    : `Active el interruptor maestro para habilitar el despacho de boletines del ${filtroPeriodo} en Control de Estudios.`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleFirmaMaestra}
              disabled={procesandoFirma}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer ${
                firmaAutorizada
                  ? 'bg-slate-800 hover:bg-rose-900/80 text-rose-300 border border-slate-700 hover:border-rose-500'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 hover:shadow-amber-500/30'
              }`}
            >
              <IconShield className="w-4 h-4" />
              <span>
                {procesandoFirma 
                  ? 'Procesando...' 
                  : firmaAutorizada 
                  ? 'Revocar / Pausar Firma Oficial' 
                  : `Autorizar Firma para el ${filtroPeriodo}`}
              </span>
            </button>
          </div>

          {/* Cuadro de Indicadores Macro (KPIs) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Matrícula Total</span>
              <span className="text-2xl font-black text-white">{totalMatricula}</span>
              <span className="text-[10px] text-slate-400 block">Estudiantes Activos</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Evaluados por Docentes</span>
              <span className="text-2xl font-black text-blue-400">{pctEvaluados}%</span>
              <span className="text-[10px] text-slate-400 block">{totalEvaluados} de {totalMatricula} cargados</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Aprobados por Coord.</span>
              <span className="text-2xl font-black text-indigo-400">{pctAprobados}%</span>
              <span className="text-[10px] text-slate-400 block">{totalAprobadosCoord} con Visto Bueno</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Despachados a Padres</span>
              <span className="text-2xl font-black text-emerald-400">{pctDespachados}%</span>
              <span className="text-[10px] text-slate-400 block">{totalDespachados} entregados</span>
            </div>
          </div>
        </header>

        {/* Sección de Auditoría Institucional por Salón */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <IconBuilding className="w-5 h-5 text-slate-600" />
                Auditoría y Supervisión de Salones
              </h2>
              <p className="text-xs text-slate-500">
                Supervisión del avance de calificaciones y expedientes aprobados por aula escolar.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
              Total: {cursos.length} Salones Registrados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cursos.map((curso) => {
              const alumnosDelCurso = alumnos.filter(a => a.curso_id === curso.id);
              const idsAlumnos = alumnosDelCurso.map(a => a.id);
              const reportesCurso = reportesDelPeriodo.filter(r => idsAlumnos.includes(r.alumno_id));
              const aprobadosCurso = reportesCurso.filter(r => ['aprobado_coordinador', 'enviado'].includes(r.estado)).length;
              const profesorAsignado = profesores.find(p => p.id === curso.profesor_encargado_id);
              const pctAvance = alumnosDelCurso.length > 0 ? Math.round((aprobadosCurso / alumnosDelCurso.length) * 100) : 0;

              return (
                <div 
                  key={curso.id}
                  className="bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-5 border border-slate-200 space-y-4 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        curso.nivel?.toLowerCase() === 'primaria'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        Educación {curso.nivel}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {alumnosDelCurso.length} Alumnos
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        {curso.nombre_grado} &quot;{curso.seccion}&quot;
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Docente: <strong>{profesorAsignado ? `${profesorAsignado.nombre} ${profesorAsignado.apellido}` : 'Sin asignar'}</strong>
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-600">Aprobación por Coordinación:</span>
                        <span className="text-slate-900">{pctAvance}% ({aprobadosCurso}/{alumnosDelCurso.length})</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            pctAvance === 100 ? 'bg-emerald-500' : pctAvance > 0 ? 'bg-blue-500' : 'bg-slate-300'
                          }`}
                          style={{ width: `${pctAvance}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/director/salon/${curso.id}`)}
                    className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-900 hover:text-white text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-300 hover:border-slate-900 transition-all shadow-sm cursor-pointer group"
                  >
                    <IconDocument className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                    <span>Auditar Salón y Actas</span>
                    <IconChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

      </main>

    </div>
  );
}