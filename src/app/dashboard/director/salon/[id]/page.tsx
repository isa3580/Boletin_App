'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase';
import { PERIODOS } from '../../../../../lib/constants';
import { useAnioEscolar } from '../../../../../lib/config';
import { BoletinDocumento } from '../../../../../components/BoletinDocumento';
import { 
  IconBuilding, 
  IconDocument, 
  IconPrint, 
  IconCheck, 
  IconClock,
  IconAlertCircle, 
  IconArrowLeft 
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
  periodo: string;
  estado: string;
  texto_cualitativo_ia?: string;
  notas_coordinacion?: string;
  fecha_revision?: string;
}

interface CalificacionItem {
  id: number;
  alumno_id: string;
  materia_id: number;
  nota_num?: number | null;
  nota_literal?: string | null;
  materias?: { id: number; nombre_materia: string };
}

export default function DirectorSalonView() {
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

  // Estados para el modal de vista previa del acta con sello de direccion
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<AlumnoItem | null>(null);
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteItem | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>(PERIODOS[0]);
  const [alertaExito, setAlertaExito] = useState<string | null>(null);
  const { anioEscolar } = useAnioEscolar();
  const boletinRef = useRef<HTMLDivElement>(null);

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
        const { data: reportesData } = await supabase.from('reportes').select('*').eq('periodo', filtroPeriodo).in('alumno_id', idsAlumnos);
        setReportes(reportesData || []);

        const { data: califData } = await supabase.from('calificaciones').select('*, materias(id, nombre_materia)').eq('periodo', filtroPeriodo).in('alumno_id', idsAlumnos);
        setCalificaciones(califData as any || []);
      } else {
        setReportes([]);
        setCalificaciones([]);
      }

      // Verificar si el sistema está bloqueado
      const { data: configData } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'sistema_bloqueado')
        .single();
      if (configData?.valor === 'true') setSistemaBloqueado(true);
      else setSistemaBloqueado(false);

      // Verificar si el período está cerrado
      const { data: periodoData } = await supabase
        .from('periodos_cerrados')
        .select('id')
        .eq('periodo', filtroPeriodo)
        .limit(1);
      if (periodoData && periodoData.length > 0) setPeriodoCerrado(true);
      else setPeriodoCerrado(false);

    } catch (error) {
      console.error("Error al cargar salón:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (salonId) cargarDatosSalon();
  }, [salonId, filtroPeriodo]);

  const handleAbrirActa = (alumno: AlumnoItem) => {
    const reporte = reportes.find(r => r.alumno_id === alumno.id && r.periodo === filtroPeriodo);
    setAlumnoSeleccionado(alumno);
    setReporteSeleccionado(reporte || null);
    setModalAbierto(true);
  };

  const handleImprimir = () => {
    window.print();
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
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30">
                  DESPACHO DE DIRECCIÓN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">{cursoInfo?.nombre_grado} — Sección "{cursoInfo?.seccion}"</p>
            </div>
          </div>

          <button 
            onClick={() => router.push('/dashboard/director')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-700 shadow-sm ml-auto"
          >
            <IconArrowLeft className="w-4 h-4" />
            <span>Volver a Salones</span>
          </button>
        </div>
      </nav>

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

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 print:hidden">

        {(sistemaBloqueado || periodoCerrado) && (
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <IconAlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">
                {sistemaBloqueado ? 'Sistema Bloqueado' : `Período "${filtroPeriodo}" Cerrado`}
              </p>
              <p className="text-xs text-rose-700">
                {sistemaBloqueado 
                  ? 'El sistema se encuentra bloqueado por la administración escolar.'
                  : 'Este período se encuentra cerrado. No se pueden despachar boletines.'}
              </p>
            </div>
          </div>
        )}

        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
                <IconBuilding className="w-3.5 h-3.5 text-amber-700" />
                Control de Dirección
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {cursoInfo ? `${cursoInfo.nombre_grado} — Sección "${cursoInfo.seccion}"` : 'Cargando...'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Revisión de actas validadas por coordinación, aplicación de firma/sello institucional y despacho a representantes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-center min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Matrícula</span>
              <span className="text-2xl font-black text-amber-600">{alumnos.length}</span>
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

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <IconDocument className="w-4 h-4 text-slate-500" />
              Nómina de Estudiantes y Estatus de Despacho
            </h2>

            {(() => {
              const listosEnSalon = reportes.filter(r => ['aprobado_coordinador', 'enviado'].includes(r.estado)).length;
              const salonCompleto = alumnos.length > 0 && listosEnSalon === alumnos.length;

              return salonCompleto ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 inline-flex items-center gap-1.5">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Salón 100% Validado por Coordinación
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 inline-flex items-center gap-1.5">
                  <IconClock className="w-3.5 h-3.5 text-amber-600" />
                  {listosEnSalon} de {alumnos.length} validados por Coordinación
                </span>
              );
            })()}
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-amber-600 border-t-transparent"></div>
              <p className="text-xs font-semibold text-slate-500 mt-3">Cargando nómina...</p>
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
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            yaEnviado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            listoParaSello ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {yaEnviado ? (
                              <>
                                <IconCheck className="w-3 h-3 text-emerald-600" />
                                Enviado a Padres
                              </>
                            ) : listoParaSello ? (
                              <>
                                <IconDocument className="w-3 h-3 text-amber-600" />
                                Listo para Sello
                              </>
                            ) : (
                              <>
                                <IconClock className="w-3 h-3 text-slate-400" />
                                Pendiente en Coord.
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            type="button"
                            onClick={() => handleAbrirActa(estudiante)}
                            className={`font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm inline-flex items-center gap-2 ${
                              listoParaSello || yaEnviado 
                                ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-slate-900/10' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            }`}
                            disabled={!listoParaSello && !yaEnviado}
                          >
                            <IconDocument className="w-3.5 h-3.5" />
                            <span>{yaEnviado ? 'Ver Acta Sellada' : 'Sellar y Ver Acta'}</span>
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
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 z-50 overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:my-0 print:rounded-none print:overflow-visible print:w-full print:max-w-none">
              
              <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center print:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                    <IconBuilding className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Acta Oficial Autorizada por Dirección</h3>
                    <p className="text-[11px] text-slate-300">{alumnoSeleccionado.nombre} {alumnoSeleccionado.apellido}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => window.print()} 
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
                  >
                    <IconPrint className="w-3.5 h-3.5 text-amber-400" />
                    <span>Imprimir / PDF</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setModalAbierto(false)} 
                    className="w-8 h-8 rounded-full bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Documento Oficial */}
              <div className="overflow-y-auto bg-slate-100/60 p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible print:max-h-none">
                <div ref={boletinRef} className="print:rounded-none print:overflow-visible" style={{ backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' }}>
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
                    coordinacionAprobada={true}
                    nombreDirector="Lcda. Luisa Pérez"
                    direccionSellada={true}
                  />
                </div>
              </div>

              {/* Acciones del Modal */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 print:hidden">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${
                  yaEnviado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {yaEnviado ? (
                    <>
                      <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Boletín despachado oficialmente por Control de Estudios
                    </>
                  ) : (
                    <>
                      <IconDocument className="w-3.5 h-3.5 text-blue-600" />
                      Vista previa certificada con Sello y Firma Institucional
                    </>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setModalAbierto(false)} 
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={handleImprimir}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <IconPrint className="w-4 h-4 text-white" />
                    <span>Imprimir / Guardar PDF</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}