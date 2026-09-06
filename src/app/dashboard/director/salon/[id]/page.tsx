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

export default function DirectorSalonPage() {
  const params = useParams();
  const router = useRouter();
  const salonId = params.id;

  const [cursoInfo, setCursoInfo] = useState<any>(null);
  const [alumnos, setAlumnos] = useState<AlumnoItem[]>([]);
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [calificaciones, setCalificaciones] = useState<CalificacionItem[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados para el modal de vista previa del acta con sello de dirección
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<AlumnoItem | null>(null);
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteItem | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>(PERIODOS[0]);
  const [procesandoEnvio, setProcesandoEnvio] = useState(false);
  const [alertaExito, setAlertaExito] = useState<string | null>(null);

  const cargarDatosSalon = async () => {
    try {
      setCargando(true);
      const idNum = Number(salonId);

      const { data: cursoData } = await supabase.from('cursos').select('*').eq('id', idNum).single();
      setCursoInfo(cursoData);

      const { data: alumnosData } = await supabase.from('alumnos').select('*').eq('curso_id', idNum).order('apellido', { ascending: true });
      setAlumnos(alumnosData || []);

      const idsAlumnos = (alumnosData || []).map(a => a.id);

      if (idsAlumnos.length > 0) {
        const { data: reportesData } = await supabase.from('reportes').select('*').in('alumno_id', idsAlumnos);
        setReportes(reportesData || []);

        const { data: califData } = await supabase.from('calificaciones').select('*, materias(id, nombre_materia)').in('alumno_id', idsAlumnos);
        setCalificaciones(califData as any || []);
      } else {
        setReportes([]);
        setCalificaciones([]);
      }

    } catch (error) {
      console.error("Error al cargar salón:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (salonId) cargarDatosSalon();
  }, [salonId]);

  const handleAbrirActa = (alumno: AlumnoItem) => {
    const reporte = reportes.find(r => r.alumno_id === alumno.id && r.periodo === filtroPeriodo);
    setAlumnoSeleccionado(alumno);
    setReporteSeleccionado(reporte || null);
    setModalAbierto(true);
  };

  const handleEnviarIndividual = async (alumnoId: string) => {
    setProcesandoEnvio(true);
    try {
      const reporteEst = reportes.find(r => r.alumno_id === alumnoId && r.periodo === filtroPeriodo);
      if (!reporteEst) {
        alert("No se encontró el reporte para este período.");
        return;
      }

      if (reporteEst.estado !== 'aprobado_coordinador') {
        alert("Este boletín no está listo para ser enviado. Debe estar aprobado por coordinación.");
        return;
      }

      const confirmacion = confirm(`¿Confirmar envío del boletín de ${alumnoSeleccionado?.nombre} ${alumnoSeleccionado?.apellido} al correo del representante: ${alumnoSeleccionado?.correo_representante}?`);
      if (!confirmacion) {
        setProcesandoEnvio(false);
        return;
      }

      const { error } = await supabase
        .from('reportes')
        .update({
          estado: 'enviado',
          notas_coordinacion: 'Despachado oficialmente a los representantes con Sello de Dirección.',
          fecha_revision: new Date().toISOString()
        })
        .eq('id', reporteEst.id);

      if (error) throw error;

      setAlertaExito("🚀 ¡Boletín sellado y enviado exitosamente al representante!");
      setModalAbierto(false);
      await cargarDatosSalon();
      setTimeout(() => setAlertaExito(null), 4000);

    } catch (err) {
      console.error("Error al enviar:", err);
      alert("Hubo un error al procesar el envío.");
    } finally {
      setProcesandoEnvio(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-amber-50/20 text-slate-800 pb-16">
      
      <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <button 
            onClick={() => router.push('/dashboard/director')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700 shadow-sm"
          >
            <span>←</span> Volver a Salones
          </button>
          
          <div className="text-right">
            <span className="text-xs font-bold text-amber-300">Despacho de Dirección</span>
            <p className="text-[11px] text-slate-400">{cursoInfo?.nombre_grado} - Sección "{cursoInfo?.seccion}"</p>
          </div>
        </div>
      </nav>

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

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 print:hidden">

        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 mb-3">
              🏛️ Control de Dirección
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {cursoInfo ? `${cursoInfo.nombre_grado} — Sección "${cursoInfo.seccion}"` : 'Cargando...'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Revisión de actas validadas por coordinación, aplicación de firma/sello final y despacho a padres.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-center min-w-[140px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Matrícula</span>
            <span className="text-2xl font-black text-amber-600">{alumnos.length}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-center min-w-[180px]">
            <label className="text-[10px] uppercase font-bold text-slate-400 block">Período</label>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="text-xs font-bold text-amber-700 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {PERIODOS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <span>📋</span> Nómina de Estudiantes y Estatus de Despacho
            </h2>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-amber-600 border-t-transparent"></div>
              <p className="text-xs font-semibold text-slate-500 mt-3">Cargando alumnos...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="p-4 pl-6">Apellidos y Nombres</th>
                    <th className="p-4">Correo Representante</th>
                    <th className="p-4 text-center">Estatus Institucional</th>
                    <th className="p-4 pr-6 text-right">Acción de Dirección</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alumnos.map((estudiante) => {
                    const reporteEst = reportes.find(r => r.alumno_id === estudiante.id);
                    const estado = reporteEst?.estado || 'borrador';
                    const listoParaSello = estado === 'aprobado_coordinador';
                    const yaEnviado = estado === 'enviado';

                    return (
                      <tr key={estudiante.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{estudiante.apellido}, {estudiante.nombre}</td>
                        <td className="p-4 text-slate-600 font-medium">{estudiante.correo_representante || 'No registrado'}</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            yaEnviado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            listoParaSello ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {yaEnviado ? '📬 Enviado a Padres' : listoParaSello ? '🏛️ Listo para Sello' : '⏳ Pendiente en Coord.'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => handleAbrirActa(estudiante)}
                            className={`font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm inline-flex items-center gap-1.5 ${
                              listoParaSello || yaEnviado 
                                ? 'bg-slate-900 hover:bg-amber-700 text-white' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                            disabled={!listoParaSello && !yaEnviado}
                          >
                            <span>📜</span> {yaEnviado ? 'Ver Acta Sellada' : 'Sellar y Ver Acta'}
                          </button>
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

      {/* MODAL DEL ACTA OFICIAL CON SELLO DE DIRECCIÓN */}
      {modalAbierto && alumnoSeleccionado && (() => {
        const estadoActual = reporteSeleccionado?.estado || 'borrador';
        const yaEnviado = estadoActual === 'enviado';
        const listoParaSello = estadoActual === 'aprobado_coordinador';

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 z-50 overflow-y-auto">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
              
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center print:hidden">
                <div className="flex items-center gap-2">
                  <span>🏛️</span>
                  <div>
                    <h3 className="text-sm font-bold">Acta Oficial Autorizada por Dirección</h3>
                    <p className="text-[10px] text-amber-300">{alumnoSeleccionado.nombre} {alumnoSeleccionado.apellido}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => window.print()} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition-all">🖨️ Imprimir / PDF</button>
                  <button onClick={() => setModalAbierto(false)} className="w-8 h-8 rounded-full bg-white/10 text-slate-300 hover:text-white flex items-center justify-center">✕</button>
                </div>
              </div>

              {/* Documento Oficial */}
              <div className="p-8 sm:p-10 space-y-6 overflow-y-auto bg-white text-slate-800 font-sans">
                
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
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Representante:</span>
                    <span className="font-bold text-slate-800">{alumnoSeleccionado.correo_representante || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Período:</span>
                    <span className="font-bold text-slate-800">{filtroPeriodo} • {ANIO_ESCOLAR}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">📊 Calificaciones por Asignatura</h4>
                  <div className="border border-slate-300 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-300">
                          <th className="p-3">Asignatura</th>
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

                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">📝 Informe Descriptivo del Rendimiento Estudiantil</h4>
                  <div className="p-5 bg-amber-50/30 border border-amber-200 rounded-2xl text-slate-800 text-xs leading-relaxed">
                    <p className="whitespace-pre-wrap font-normal text-justify leading-relaxed">
                      "{reporteSeleccionado?.texto_cualitativo_ia || 'Sin informe registrado.'}"
                    </p>
                  </div>
                </div>

                {/* Bloque de Firmas e Sello de Dirección */}
                <div className="pt-8 grid grid-cols-3 gap-6 text-center border-t border-slate-200 text-xs mt-6 items-end">
                  <div>
                    <div className="h-12 border-b border-slate-400 mx-4"></div>
                    <p className="font-bold text-slate-800 mt-2">Profesor(a) de Aula</p>
                  </div>
                  <div>
                    <div className="h-12 border-b border-slate-400 mx-4 flex items-end justify-center pb-1">
                      <span className="text-[10px] font-bold text-indigo-700">Aprobado Coord.</span>
                    </div>
                    <p className="font-bold text-slate-800 mt-2">Lcdo. Roberto Gómez</p>
                    <p className="text-[10px] text-slate-500">Coordinación Pedagógica</p>
                  </div>
                  <div>
                    <div className="h-12 border-b border-amber-600 mx-4 flex items-center justify-center relative">
                      <div className="absolute -top-4 border-2 border-amber-600 rounded-full w-20 h-20 flex flex-col items-center justify-center p-1 opacity-90 rotate-[-8deg] bg-amber-50/40 pointer-events-none">
                        <span className="text-[7px] font-black text-amber-900 uppercase">U.E. San Francisco</span>
                        <span className="text-[6px] font-bold text-amber-800">DIRECCIÓN</span>
                        <span className="text-[5px] text-slate-700">SELLADO Y FIRMADO</span>
                      </div>
                    </div>
                    <p className="font-bold text-slate-800 mt-2">Lcda. Luisa Pérez</p>
                    <p className="text-[10px] text-slate-500">Dirección del Plantel</p>
                  </div>
                </div>

              </div>

              {/* Acciones del Modal */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center print:hidden">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                  yaEnviado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {yaEnviado ? '📬 Este boletín ya fue despachado al representante' : '🏛️ Listo para autorizar y enviar por correo'}
                </span>

                <div className="flex items-center gap-2">
                  <button onClick={() => setModalAbierto(false)} className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl">Cerrar</button>
                  {!yaEnviado && (
                    <button
                      onClick={() => handleEnviarIndividual(alumnoSeleccionado.id)}
                      disabled={procesandoEnvio}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
                    >
                      {procesandoEnvio ? 'Enviando...' : '🚀 Sellar y Enviar por Correo'}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}