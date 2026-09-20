'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase';
import { PERIODOS } from '../../../../../lib/constants';
import { useAnioEscolar } from '../../../../../lib/config';
import { BoletinDocumento } from '../../../../../components/BoletinDocumento';
import { 
  IconArrowLeft, 
  IconCheck, 
  IconClock, 
  IconDocument, 
  IconEye, 
  IconEdit, 
  IconLock, 
  IconAlertCircle, 
  IconPrint, 
  IconBook 
} from '../../../../../components/Icons';

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
  periodo: string;
  estado: string;
  notas_coordinacion: string | null;
  fecha_revision: string | null;
}

interface CalificacionItem {
  id: string;
  alumno_id: string;
  materia_id: number;
  nota_literal: string | null;
  nota_num: number | null;
  periodo: string;
  materias?: { id: number; nombre_materia: string };
}

export default function CoordinadorSalonPage() {
  const params = useParams();
  const router = useRouter();
  const salonId = params.id;

  const [cursoInfo, setCursoInfo] = useState<any>(null);
  const [alumnos, setAlumnos] = useState<AlumnoItem[]>([]);
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [calificaciones, setCalificaciones] = useState<CalificacionItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sistemaBloqueado, setSistemaBloqueado] = useState(false);
  const [periodoCerrado, setPeriodoCerrado] = useState(false);

  // Estados para el modal de evaluación y decisión
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<AlumnoItem | null>(null);
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteItem | null>(null);
  const [modalEvaluarAbierto, setModalEvaluarAbierto] = useState(false);
  
  const [observacionCoordinacion, setObservacionCoordinacion] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>(PERIODOS[0]);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [alertaExito, setAlertaExito] = useState<string | null>(null);
  const { anioEscolar } = useAnioEscolar();

  const cargarDatosSalon = async () => {
    try {
      setCargando(true);
      const idNum = Number(salonId);

      // 1. Datos del curso/salón
      const { data: cursoData } = await supabase.from('cursos').select('*').eq('id', idNum).single();
      setCursoInfo(cursoData);

      // 2. Alumnos inscritos
      const { data: alumnosData } = await supabase.from('alumnos').select('*').eq('curso_id', idNum).order('apellido', { ascending: true });
      setAlumnos(alumnosData || []);

      // 3. IDs de alumnos de este curso para filtrar
      const idsAlumnos = (alumnosData || []).map(a => a.id);

      // 4. Reportes SOLO de los alumnos de este curso
      if (idsAlumnos.length > 0) {
        const { data: reportesData } = await supabase.from('reportes').select('*').eq('periodo', filtroPeriodo).in('alumno_id', idsAlumnos);
        setReportes(reportesData || []);
      } else {
        setReportes([]);
      }

      // 5. Calificaciones SOLO de los alumnos de este curso
      if (idsAlumnos.length > 0) {
        const { data: califData } = await supabase.from('calificaciones').select('*, materias(id, nombre_materia)').eq('periodo', filtroPeriodo).in('alumno_id', idsAlumnos);
        setCalificaciones(califData as any || []);
      } else {
        setCalificaciones([]);
      }

      // 6. Verificar si el sistema está bloqueado
      const { data: configData } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'sistema_bloqueado')
        .single();
      if (configData?.valor === 'true') setSistemaBloqueado(true);
      else setSistemaBloqueado(false);

      // 7. Verificar si el período está cerrado
      const { data: periodoData } = await supabase
        .from('periodos_cerrados')
        .select('id')
        .eq('periodo', filtroPeriodo)
        .limit(1);
      if (periodoData && periodoData.length > 0) setPeriodoCerrado(true);
      else setPeriodoCerrado(false);

    } catch (error) {
      console.error("Error al cargar datos del salón:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (salonId) cargarDatosSalon();
  }, [salonId, filtroPeriodo]);

  // Abrir modal unificado de evaluación
  const handleAbrirEvaluacion = (alumno: AlumnoItem) => {
    const reporte = reportes.find(r => r.alumno_id === alumno.id && r.periodo === filtroPeriodo);
    setAlumnoSeleccionado(alumno);
    setReporteSeleccionado(reporte || null);
    setObservacionCoordinacion(reporte?.notas_coordinacion || '');
    setModalEvaluarAbierto(true);
  };

  // Acción: Aprobar o Mandar a Corregir
  const handleActualizarEstadoDirecto = async (alumnoId: string, nuevoEstado: 'aprobado_coordinador' | 'devuelto_profesor', notaCoord?: string) => {
    if (nuevoEstado === 'aprobado_coordinador' && (!reporteSeleccionado || !reporteSeleccionado.texto_cualitativo_ia || reporteSeleccionado.texto_cualitativo_ia === 'Sin informe redactado aún.')) {
      alert("No puedes aprobar un boletín que no tiene informe cualitativo redactado.");
      return;
    }

    const stored = localStorage.getItem('usuarioActual');
    const userLogueado = stored ? JSON.parse(stored) : null;

    setProcesandoAccion(true);
    try {
      const reporteExistente = reportes.find(r => r.alumno_id === alumnoId);

      if (reporteExistente) {
        const { error } = await supabase
          .from('reportes')
          .update({
            estado: nuevoEstado,
            notas_coordinacion: notaCoord !== undefined ? notaCoord.trim() || null : reporteExistente.notas_coordinacion,
            revisado_por: userLogueado?.id || null,
            fecha_revision: new Date().toISOString()
          })
          .eq('id', reporteExistente.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reportes')
          .insert({
            alumno_id: alumnoId,
            periodo: filtroPeriodo,
            texto_cualitativo_ia: 'Sin informe redactado aún.',
            estado: nuevoEstado,
            notas_coordinacion: notaCoord?.trim() || null,
            revisado_por: userLogueado?.id || null,
            fecha_revision: new Date().toISOString()
          });

        if (error) throw error;
      }

      setAlertaExito(
        nuevoEstado === 'aprobado_coordinador'
          ? 'Boletín aprobado por coordinación pedagógica.'
          : 'Boletín devuelto al profesor para ajustes pedagógicos.'
      );

      setModalEvaluarAbierto(false);
      await cargarDatosSalon();
      setTimeout(() => setAlertaExito(null), 4000);

    } catch (err: any) {
      console.error("Error al actualizar estado:", JSON.stringify(err), err?.message, err?.details, err?.hint);
      alert("Hubo un error al procesar la acción.");
    } finally {
      setProcesandoAccion(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      
      {/* Barra de Navegación Institucional con Logo */}
      <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm print:hidden">
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
                  Coordinación Pedagógica
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">{cursoInfo?.nombre_grado} — Sección "{cursoInfo?.seccion}"</p>
            </div>
          </div>

          <button 
            onClick={() => router.push('/dashboard/coordinador')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-700 shadow-sm ml-auto"
          >
            <IconArrowLeft className="w-4 h-4" />
            <span>Volver a Salones</span>
          </button>
        </div>
      </nav>

      {/* Alerta de Éxito Flotante */}
      {alertaExito && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 print:hidden">
          <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-800 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-bold">{alertaExito}</p>
            </div>
            <button onClick={() => setAlertaExito(null)} className="text-emerald-600 font-bold hover:text-emerald-800">✕</button>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 print:hidden">

        {(sistemaBloqueado || periodoCerrado) && (
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <IconAlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">
                {sistemaBloqueado ? 'Sistema Bloqueado' : 'Período Cerrado'}
              </p>
              <p className="text-xs text-rose-700">
                {sistemaBloqueado 
                  ? 'El sistema se encuentra bloqueado por la administración escolar. No se pueden realizar modificaciones.'
                  : `El período "${filtroPeriodo}" se encuentra cerrado. No se pueden aprobar ni devolver reportes.`}
              </p>
            </div>
          </div>
        )}

        {/* Encabezado del Salón */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-900 border border-indigo-200">
                <IconBook className="w-3.5 h-3.5 text-indigo-700" />
                Educación {cursoInfo?.nivel}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {cursoInfo ? `${cursoInfo.nombre_grado} — Sección "${cursoInfo.seccion}"` : 'Cargando salón...'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Supervisión curricular, validación pedagógica y control de calidad de informes por estudiante.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-center min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Matrícula</span>
              <span className="text-2xl font-black text-indigo-600">{alumnos.length}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-center min-w-[170px]">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Período</label>
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {PERIODOS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Tabla de Alumnos con Validación de Estado */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <IconDocument className="w-4 h-4 text-slate-500" />
              Nómina de Estudiantes y Control de Boletines
            </h2>
            <span className="text-xs text-slate-500 font-bold">{filtroPeriodo}</span>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent"></div>
              <p className="text-xs font-semibold text-slate-500 mt-3">Cargando nómina...</p>
            </div>
          ) : alumnos.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <IconDocument className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">No hay estudiantes registrados</p>
              <p className="text-xs text-slate-400">Este salón aún no cuenta con estudiantes inscritos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="p-4 pl-6">Apellidos y Nombres</th>
                    <th className="p-4">Correo Representante</th>
                    <th className="p-4 text-center">Estatus del Boletín</th>
                    <th className="p-4 pr-6 text-right">Acción Pedagógica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alumnos.map((estudiante) => {
                    const reporteEst = reportes.find(r => r.alumno_id === estudiante.id);
                    const estado = reporteEst?.estado || 'borrador';
                    const yaAprobadoOEnviado = estado === 'aprobado_coordinador' || estado === 'enviado';
                    const enRevision = estado === 'en_revision_coordinador';
                    const enAjuste = estado === 'devuelto_profesor';

                    return (
                      <tr key={estudiante.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">
                          {estudiante.apellido}, {estudiante.nombre}
                        </td>
                        <td className="p-4 text-slate-600 font-medium">
                          {estudiante.correo_representante || 'No registrado'}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            estado === 'aprobado_coordinador' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            estado === 'enviado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            estado === 'en_revision_coordinador' ? 'bg-blue-50 text-blue-700 border-blue-200 font-extrabold' :
                            estado === 'devuelto_profesor' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {estado === 'aprobado_coordinador' ? (
                              <>
                                <IconCheck className="w-3 h-3 text-indigo-600" />
                                Aprobado
                              </>
                            ) : estado === 'enviado' ? (
                              <>
                                <IconCheck className="w-3 h-3 text-emerald-600" />
                                Enviado a Padres
                              </>
                            ) : estado === 'en_revision_coordinador' ? (
                              <>
                                <IconClock className="w-3 h-3 text-blue-600 animate-pulse" />
                                Listo para Evaluar
                              </>
                            ) : estado === 'devuelto_profesor' ? (
                              <>
                                <IconAlertCircle className="w-3 h-3 text-amber-600" />
                                En Ajuste Docente
                              </>
                            ) : (
                              <>
                                <IconClock className="w-3 h-3 text-slate-400" />
                                Borrador del Docente
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          {yaAprobadoOEnviado ? (
                            <button
                              onClick={() => handleAbrirEvaluacion(estudiante)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold px-4 py-2 rounded-xl text-xs transition-all border border-slate-300 inline-flex items-center gap-2 shadow-sm cursor-pointer"
                            >
                              <IconEye className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Ver Boletín</span>
                            </button>
                          ) : enRevision ? (
                            <button
                              onClick={() => handleAbrirEvaluacion(estudiante)}
                              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-600/20 inline-flex items-center gap-2 cursor-pointer animate-none"
                            >
                              <IconEdit className="w-3.5 h-3.5 text-white" />
                              <span>Evaluar y Aprobar</span>
                            </button>
                          ) : enAjuste ? (
                            <button
                              onClick={() => handleAbrirEvaluacion(estudiante)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold px-3.5 py-2 rounded-xl text-xs transition-all border border-amber-200 inline-flex items-center gap-1.5 cursor-pointer"
                              title="El docente está realizando correcciones. Haz clic para ver el borrador actual en modo lectura."
                            >
                              <IconEye className="w-3.5 h-3.5 text-amber-600" />
                              <span>En Corrección</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAbrirEvaluacion(estudiante)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-medium px-3.5 py-2 rounded-xl text-xs transition-all border border-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                              title="El docente aún no ha enviado este boletín a coordinación. Haz clic para ver el avance en modo lectura."
                            >
                              <IconEye className="w-3.5 h-3.5 text-slate-400" />
                              <span>Esperando al Docente</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>

      {/* MODAL UNIFICADO: VISTA PREVIA O EVALUACIÓN SEGÚN EL ESTADO */}
      {modalEvaluarAbierto && alumnoSeleccionado && (() => {
        const estadoActual = reporteSeleccionado?.estado || 'borrador';
        const bloqueado = estadoActual === 'aprobado_coordinador' || estadoActual === 'enviado';
        const listoParaEvaluar = estadoActual === 'en_revision_coordinador';

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 z-50 overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:my-0 print:rounded-none print:overflow-visible print:w-full print:max-w-none">
              
              {/* Cabecera del Modal */}
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center print:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                    <IconDocument className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-300">
                      {bloqueado 
                        ? 'Acta Institucional Aprobada' 
                        : listoParaEvaluar 
                          ? 'Supervisión Curricular • Listo para Evaluación' 
                          : 'Vista Previa • Borrador en Proceso'}
                    </span>
                    <h3 className="text-sm font-bold text-white">Boletín Oficial: {alumnoSeleccionado.nombre} {alumnoSeleccionado.apellido}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => window.print()} 
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
                  >
                    <IconPrint className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Imprimir / PDF</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setModalEvaluarAbierto(false)} 
                    className="w-8 h-8 rounded-full bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Documento Oficial / Acta Escolar Interna en el Modal */}
              <div className="overflow-y-auto bg-slate-100/60 p-2 sm:p-4 space-y-4 print:p-0 print:bg-white print:overflow-visible print:space-y-0 print:max-h-none">
                
                {/* Banner si aún está en borrador */}
                {!bloqueado && !listoParaEvaluar && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs space-y-1 print:hidden">
                    <div className="flex items-center gap-2 font-bold text-amber-800">
                      <IconAlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>Expediente aún no enviado por el docente</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed pl-6">
                      El profesor titular se encuentra preparando las calificaciones e informe cualitativo.
                      Los botones de <strong>Aprobar por Coordinación</strong> y <strong>Devolver para Ajustes</strong> se activarán automáticamente una vez que el docente envíe el boletín a Coordinación.
                    </p>
                  </div>
                )}

                <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none print:overflow-visible">
                  <BoletinDocumento
                    nombreAlumno={`${alumnoSeleccionado.nombre} ${alumnoSeleccionado.apellido}`}
                    nombreGrado={cursoInfo?.nombre_grado || ''}
                    seccion={cursoInfo?.seccion || ''}
                    nivel={cursoInfo?.nivel || 'primaria'}
                    correoRepresentante={alumnoSeleccionado.correo_representante}
                    periodo={filtroPeriodo}
                    anioEscolar={anioEscolar}
                    calificaciones={calificaciones
                      .filter(c => c.alumno_id === alumnoSeleccionado.id)
                      .map((c) => {
                        const isPrim = cursoInfo?.nivel?.toLowerCase() === 'primaria';
                        const notaVal = String(c.nota_literal || c.nota_num || '-');
                        let apreciacion = 'Registrado';
                        if (isPrim) {
                          const escala: Record<string, string> = { 'A': 'Excelente', 'B': 'Muy Bueno', 'C': 'Bueno', 'D': 'Insuficiente', 'E': 'Reprobado' };
                          apreciacion = escala[notaVal] || 'Registrado';
                        } else {
                          const n = Number(c.nota_num) || 0;
                          apreciacion = n >= 16 ? 'Excelente' : n >= 10 ? 'Aprobado' : 'En Recuperación';
                        }
                        return {
                          materia: c.materias?.nombre_materia || 'Asignatura',
                          nota: notaVal,
                          apreciacion: apreciacion
                        };
                      })}
                    informeCualitativo={reporteSeleccionado?.texto_cualitativo_ia}
                    nombreDocente="Docente Responsable"
                    rolDocente={cursoInfo?.nivel?.toLowerCase() === 'primaria' ? 'Docente de Aula Titular' : 'Profesor Guía de Sección'}
                    nombreCoordinador="Lcdo. Roberto Gómez"
                    coordinacionAprobada={bloqueado}
                    nombreDirector="Lcda. Luisa Pérez"
                    direccionSellada={estadoActual === 'enviado'}
                  />
                </div>

                {/* Campo para Notas de Coordinación / Corrección (solo cuando listo o bloqueado) */}
                {listoParaEvaluar && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 print:hidden">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Notas de Coordinación / Solicitud de Ajustes para el Profesor:
                    </label>
                    <textarea
                      rows={2}
                      value={observacionCoordinacion}
                      onChange={(e) => setObservacionCoordinacion(e.target.value)}
                      placeholder="Escribe observaciones si necesitas que el profesor ajuste la redacción o calificaciones..."
                      className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                )}

                {bloqueado && observacionCoordinacion && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1.5 print:hidden">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Notas Institucionales de Coordinación Registradas:
                    </label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs italic">
                      {observacionCoordinacion}
                    </div>
                  </div>
                )}

              </div>

              {/* Pie de Acciones del Modal */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 print:hidden">
                {bloqueado ? (
                  <div className="w-full flex justify-between items-center">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">
                      <IconLock className="w-3.5 h-3.5 text-indigo-700" />
                      Boletín validado y aprobado institucionalmente
                    </span>
                    <button onClick={() => setModalEvaluarAbierto(false)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all">Cerrar</button>
                  </div>
                ) : listoParaEvaluar ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleActualizarEstadoDirecto(alumnoSeleccionado.id, 'devuelto_profesor', observacionCoordinacion)}
                      disabled={procesandoAccion || sistemaBloqueado || periodoCerrado}
                      className="inline-flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-rose-200 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <IconAlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Devolver al Profesor para Ajustes</span>
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                      <button 
                        type="button"
                        onClick={() => setModalEvaluarAbierto(false)} 
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        Cerrar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActualizarEstadoDirecto(alumnoSeleccionado.id, 'aprobado_coordinador', observacionCoordinacion)}
                        disabled={procesandoAccion || sistemaBloqueado || periodoCerrado}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <IconCheck className="w-4 h-4" />
                        <span>{procesandoAccion ? 'Guardando...' : 'Aprobar por Coordinación'}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex justify-between items-center">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      <IconClock className="w-3.5 h-3.5 text-slate-400" />
                      Modo sólo lectura • Esperando envío del docente
                    </span>
                    <button 
                      type="button"
                      onClick={() => setModalEvaluarAbierto(false)} 
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      Cerrar Vista Previa
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}