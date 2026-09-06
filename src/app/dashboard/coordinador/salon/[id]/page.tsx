'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase';
import { PERIODOS, ANIO_ESCOLAR } from '../../../../../lib/constants';

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

  // Estados para el modal de evaluación y decisión
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<AlumnoItem | null>(null);
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteItem | null>(null);
  const [modalEvaluarAbierto, setModalEvaluarAbierto] = useState(false);
  
  const [observacionCoordinacion, setObservacionCoordinacion] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>(PERIODOS[0]);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [alertaExito, setAlertaExito] = useState<string | null>(null);

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
        const { data: reportesData } = await supabase.from('reportes').select('*').in('alumno_id', idsAlumnos);
        setReportes(reportesData || []);
      } else {
        setReportes([]);
      }

      // 5. Calificaciones SOLO de los alumnos de este curso
      if (idsAlumnos.length > 0) {
        const { data: califData } = await supabase.from('calificaciones').select('*, materias(id, nombre_materia)').in('alumno_id', idsAlumnos);
        setCalificaciones(califData as any || []);
      } else {
        setCalificaciones([]);
      }

    } catch (error) {
      console.error("Error al cargar datos del salón:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (salonId) cargarDatosSalon();
  }, [salonId]);

  // Abrir modal unificado de evaluación
  const handleAbrirEvaluacion = (alumno: AlumnoItem) => {
    const reporte = reportes.find(r => r.alumno_id === alumno.id && r.periodo === filtroPeriodo);
    setAlumnoSeleccionado(alumno);
    setReporteSeleccionado(reporte || null);
    setObservacionCoordinacion(reporte?.notas_coordinacion || '');
    setModalEvaluarAbierto(true);
  };

  // Acción rápida: Aprobar o Mandar a Corregir
  const handleActualizarEstadoDirecto = async (alumnoId: string, nuevoEstado: 'aprobado_coordinador' | 'en_revision_coordinador', notaCoord?: string) => {
    // Validación: no puede aprobar sin haber visto el reporte
    if (nuevoEstado === 'aprobado_coordinador' && (!reporteSeleccionado || !reporteSeleccionado.texto_cualitativo_ia || reporteSeleccionado.texto_cualitativo_ia === 'Sin informe redactado aún.')) {
      alert("No puedes aprobar un boletín que no tiene informe cualitativo redactado.");
      return;
    }

    setProcesandoAccion(true);
    try {
      const reporteExistente = reportes.find(r => r.alumno_id === alumnoId);

      if (reporteExistente) {
        const { error } = await supabase
          .from('reportes')
          .update({
            estado: nuevoEstado,
            notas_coordinacion: notaCoord !== undefined ? notaCoord.trim() || null : reporteExistente.notas_coordinacion,
            revisado_por: '50000000-0000-0000-0000-000000000005',
            fecha_revision: new Date().toISOString()
          })
          .eq('id', reporteExistente.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reportes')
          .insert({
            alumno_id: alumnoId,
            periodo: 'Primer Momento',
            texto_cualitativo_ia: 'Sin informe redactado aún.',
            estado: nuevoEstado,
            notas_coordinacion: notaCoord?.trim() || null,
            revisado_por: '50000000-0000-0000-0000-000000000005',
            fecha_revision: new Date().toISOString()
          });

        if (error) throw error;
      }

      setAlertaExito(
        nuevoEstado === 'aprobado_coordinador'
          ? '✅ ¡Boletín aprobado por coordinación!'
          : '✏️ Se ha enviado la solicitud de corrección a la profesora.'
      );

      setModalEvaluarAbierto(false);
      await cargarDatosSalon();
      setTimeout(() => setAlertaExito(null), 4000);

    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert("Hubo un error al procesar la acción.");
    } finally {
      setProcesandoAccion(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-amber-50/20 text-slate-800 pb-16">
      
      {/* Barra de Navegación Institucional */}
      <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <button 
            onClick={() => router.push('/dashboard/coordinador')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700 shadow-sm"
          >
            <span>←</span> Volver a Mis Salones
          </button>
          
          <div className="text-right">
            <span className="text-xs font-bold text-amber-300">Coordinación Pedagógica</span>
            <p className="text-[11px] text-slate-400">{cursoInfo?.nombre_grado} - Sección "{cursoInfo?.seccion}"</p>
          </div>
        </div>
      </nav>

      {/* Alerta de Éxito Flotante */}
      {alertaExito && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 print:hidden">
          <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-800 p-4 rounded-2xl shadow-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <p className="text-xs sm:text-sm font-bold">{alertaExito}</p>
            </div>
            <button onClick={() => setAlertaExito(null)} className="text-emerald-600 font-black">✕</button>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 print:hidden">

        {/* Encabezado del Salón */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 mb-3">
              📚 Educación {cursoInfo?.nivel}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {cursoInfo ? `${cursoInfo.nombre_grado} — Sección "${cursoInfo.seccion}"` : 'Cargando salón...'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Supervisión directa, aprobación institucional y revisión de informes cualitativos por alumno.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-center min-w-[140px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Matrícula Total</span>
            <span className="text-2xl font-black text-indigo-600">{alumnos.length}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-center min-w-[180px]">
            <label className="text-[10px] uppercase font-bold text-slate-400 block">Período</label>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="text-xs font-bold text-indigo-700 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {PERIODOS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Tabla de Alumnos con Validación de Estado */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <span>📋</span> Nómina de Estudiantes y Control de Boletines
            </h2>
            <span className="text-xs text-slate-400 font-medium">{filtroPeriodo}</span>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent"></div>
              <p className="text-xs font-semibold text-slate-500 mt-3">Cargando listado del salón...</p>
            </div>
          ) : alumnos.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <div className="text-3xl">📭</div>
              <p className="text-sm font-bold text-slate-600">No hay alumnos inscritos</p>
              <p className="text-xs">Este salón aún no tiene estudiantes registrados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="p-4 pl-6">Apellidos y Nombres</th>
                    <th className="p-4">Correo Representante</th>
                    <th className="p-4 text-center">Estatus del Boletín</th>
                    <th className="p-4 pr-6 text-right">Acción Institucional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alumnos.map((estudiante) => {
                    const reporteEst = reportes.find(r => r.alumno_id === estudiante.id);
                    const estado = reporteEst?.estado || 'borrador';
                    const yaAprobadoOEnviado = estado === 'aprobado_coordinador' || estado === 'aprobado' || estado === 'enviado';

                    return (
                      <tr key={estudiante.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">
                          {estudiante.apellido}, {estudiante.nombre}
                        </td>
                        <td className="p-4 text-slate-600 font-medium">
                          {estudiante.correo_representante || 'No registrado'}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            estado === 'aprobado_coordinador' || estado === 'aprobado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            estado === 'enviado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            estado === 'en_revision_coordinador' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {estado === 'aprobado_coordinador' || estado === 'aprobado' ? '✅ Aprobado' :
                             estado === 'enviado' ? '📬 Enviado a Padres' :
                             estado === 'en_revision_coordinador' ? '✏️ En Corrección' : '⏳ Borrador Pendiente'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          {yaAprobadoOEnviado ? (
                            <button
                              onClick={() => handleAbrirEvaluacion(estudiante)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-all border border-slate-200 inline-flex items-center gap-1.5"
                            >
                              <span>👁️</span> Ver Boletín Aprobado
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAbrirEvaluacion(estudiante)}
                              className="bg-slate-900 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm inline-flex items-center gap-1.5 animate-pulse"
                            >
                              <span>✍️</span> Evaluar y Decidir
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
        const bloqueado = estadoActual === 'aprobado_coordinador' || estadoActual === 'aprobado' || estadoActual === 'enviado';

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 z-50 overflow-y-auto">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
              
              {/* Cabecera del Modal */}
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center print:hidden">
                <div className="flex items-center gap-2">
                  <span>📜</span>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-400">
                      {bloqueado ? 'Acta Institucional Aprobada' : 'Supervisión Curricular'}
                    </span>
                    <h3 className="text-sm font-bold">Boletín Oficial: {alumnoSeleccionado.nombre} {alumnoSeleccionado.apellido}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all">🖨️ Imprimir / PDF</button>
                  <button onClick={() => setModalEvaluarAbierto(false)} className="w-8 h-8 rounded-full bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all">✕</button>
                </div>
              </div>

              {/* Documento Oficial / Acta Escolar Interna en el Modal */}
              <div className="p-8 sm:p-10 space-y-6 overflow-y-auto bg-white text-slate-800 font-sans">
                
                {/* Membrete Institucional */}
                <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">REPÚBLICA BOLIVARIANA DE VENEZUELA • MINISTERIO DE EDUCACIÓN</p>
                  <h2 className="text-base sm:text-lg font-black uppercase text-slate-900">UNIDAD EDUCATIVA COLEGIO SAN FRANCISCO</h2>
                  <p className="text-[11px] font-semibold text-slate-600">Código Plantel: DEA-001234 • RIF: J-30492819-0</p>
                  <div className="pt-2">
                    <span className="inline-block bg-slate-100 text-slate-800 text-xs font-black px-4 py-1 rounded-full uppercase border border-slate-300">
                      Boletín Informativo de Rendimiento Estudiantil
                    </span>
                  </div>
                </div>

                {/* Ficha de Datos del Estudiante */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Estudiante:</span>
                    <span className="font-black text-slate-900">{alumnoSeleccionado.nombre} {alumnoSeleccionado.apellido}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Grado / Sección:</span>
                    <span className="font-bold text-slate-800">{cursoInfo?.nombre_grado} "{cursoInfo?.seccion}"</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Nivel Educativo:</span>
                    <span className="font-bold text-slate-800 capitalize">{cursoInfo?.nivel}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Período / Año:</span>
                    <span className="font-bold text-slate-800">{filtroPeriodo} • {ANIO_ESCOLAR}</span>
                  </div>
                </div>

                {/* Cuadro de Calificaciones */}
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">📊 Resumen de Calificaciones por Asignatura</h4>
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-300">
                          <th className="p-3">Área de Formación / Asignatura</th>
                          <th className="p-3 text-center w-32">Calificación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {calificaciones
                          .filter(c => c.alumno_id === alumnoSeleccionado.id)
                          .map((c) => (
                            <tr key={c.id}>
                              <td className="p-3 font-semibold text-slate-800">{c.materias?.nombre_materia}</td>
                              <td className="p-3 text-center font-black text-blue-700 text-sm">{c.nota_literal || c.nota_num}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Informe Descriptivo (IA) */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">📝 Informe Descriptivo del Rendimiento Estudiantil</h4>
                  <div className="p-5 bg-amber-50/30 border border-amber-200 rounded-2xl text-slate-800 text-xs leading-relaxed">
                    <p className="whitespace-pre-wrap font-normal text-justify leading-relaxed">
                      "{reporteSeleccionado?.texto_cualitativo_ia || 'Sin informe cualitativo registrado.'}"
                    </p>
                  </div>
                </div>

                {/* Campo para Notas de Coordinación / Corrección (Bloqueado si ya está aprobado) */}
                <div className="space-y-1.5 pt-2 print:hidden">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {bloqueado ? 'Notas Institucionales de Coordinación Registradas:' : 'Notas de Coordinación / Solicitud de Corrección para la Profesora:'}
                  </label>
                  {bloqueado ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs italic">
                      {observacionCoordinacion || 'Sin observaciones adicionales registradas.'}
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      value={observacionCoordinacion}
                      onChange={(e) => setObservacionCoordinacion(e.target.value)}
                      placeholder="Escribe observaciones si necesitas que la profesora ajuste la redacción..."
                      className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  )}
                </div>

                {/* Bloque de Firmas Institucionales */}
                <div className="pt-8 grid grid-cols-3 gap-6 text-center border-t border-slate-200 text-xs mt-6">
                  <div>
                    <div className="h-12 border-b border-slate-400 mx-4"></div>
                    <p className="font-bold text-slate-800 mt-2">Profesor(a) de Aula</p>
                  </div>
                  <div>
                    <div className="h-12 border-b border-slate-400 mx-4"></div>
                    <p className="font-bold text-slate-800 mt-2">Lcdo. Roberto Gómez</p>
                    <p className="text-[10px] text-slate-500">Coordinación Pedagógica</p>
                  </div>
                  <div>
                    <div className="h-12 border-b border-dashed border-slate-400 mx-4 flex items-center justify-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Sello Oficial</span>
                    </div>
                    <p className="font-bold text-slate-800 mt-2">Control de Estudios</p>
                  </div>
                </div>

              </div>

              {/* Pie de Acciones del Modal (Oculto o simplificado si ya está aprobado) */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 print:hidden">
                {bloqueado ? (
                  <div className="w-full flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                      🔒 Boletín validado y aprobado institucionalmente
                    </span>
                    <button onClick={() => setModalEvaluarAbierto(false)} className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all">Cerrar</button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleActualizarEstadoDirecto(alumnoSeleccionado.id, 'en_revision_coordinador', observacionCoordinacion)}
                      disabled={procesandoAccion}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs px-4 py-2.5 rounded-xl border border-purple-300 transition-all disabled:opacity-50"
                    >
                      ✏️ Mandar a Corregir a la Profesora
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                      <button onClick={() => setModalEvaluarAbierto(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all">Cerrar</button>
                      <button
                        onClick={() => handleActualizarEstadoDirecto(alumnoSeleccionado.id, 'aprobado_coordinador', observacionCoordinacion)}
                        disabled={procesandoAccion}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
                      >
                        {procesandoAccion ? 'Guardando...' : '✅ Aprobar por Coordinación'}
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}