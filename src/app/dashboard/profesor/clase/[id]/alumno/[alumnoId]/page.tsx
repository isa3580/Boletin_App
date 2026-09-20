'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../../../lib/supabase';
import { PERIODOS } from '../../../../../../../lib/constants';
import { useAnioEscolar } from '../../../../../../../lib/config';
import { BoletinDocumento } from '../../../../../../../components/BoletinDocumento';
import { 
  IconArrowLeft, 
  IconCheck, 
  IconDocument, 
  IconEye, 
  IconSave, 
  IconPrint, 
  IconSparkles, 
  IconShield, 
  IconChart, 
  IconUsers, 
  IconBook, 
  IconAlertCircle, 
  IconLock, 
  IconSend, 
  IconPlus 
} from '../../../../../../../components/Icons';

// Banco de etiquetas institucional clasificado localmente
const ETIQUETAS_BANCO = {
  conducta: [
    "Muestra interrupciones constantes durante las explicaciones",
    "Mantiene una actitud respetuosa y atenta en clase",
    "Cumple de manera puntual con las normas de convivencia",
    "Demuestra responsabilidad en la entrega de asignaciones"
  ],
  academico: [
    "Excelente dominio de las competencias evaluadas",
    "Requiere apoyo en la resolución de problemas lógico-matemáticos",
    "Manifiesta un progreso notable en la comprensión lectora",
    "Muestra creatividad y solidez en los trabajos prácticos"
  ],
  convivencia: [
    "Se integra fácilmente en actividades grupales",
    "Colabora activamente con sus compañeros de equipo",
    "Muestra empatía y compañerismo en el aula",
    "Participa de forma constructiva en las dinámicas escolares"
  ]
};

export default function EvaluarAlumnoGeneralPage() {
  const params = useParams();
  const cursoId = params.id;
  const alumnoId = params.alumnoId;
  const router = useRouter();

  const [alumno, setAlumno] = useState<any>(null);
  const [cursoInfo, setCursoInfo] = useState<any>(null);
  const [materiasCarga, setMateriasCarga] = useState<any[]>([]);
  const [usuario, setUsuario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  // Estados locales
  const [notas, setNotas] = useState<{ [key: number]: string }>({});
  const [etiquetasGlobales, setEtiquetasGlobales] = useState<string[]>([]);
  const [reporteGeneral, setReporteGeneral] = useState('');
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>(PERIODOS[0]);
  const [generandoIA, setGenerandoIA] = useState(false);
  
  // Estado para el modal de vista previa
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [reporteBloqueado, setReporteBloqueado] = useState(false);
  const [estadoReporteActual, setEstadoReporteActual] = useState<string | null>(null);
  const [sistemaBloqueado, setSistemaBloqueado] = useState(false);
  const [periodoCerradoProfesor, setPeriodoCerradoProfesor] = useState(false);
  const [notasCoordinadorDevuelto, setNotasCoordinadorDevuelto] = useState<string | null>(null);
  const { anioEscolar } = useAnioEscolar();

  useEffect(() => {
    const stored = localStorage.getItem('usuarioActual');
    if (stored) setUsuario(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const verificarSistema = async () => {
      const { data } = await supabase
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'sistema_bloqueado')
        .single();
      if (data?.valor === 'true') setSistemaBloqueado(true);
      else setSistemaBloqueado(false);
    };
    verificarSistema();
  }, []);

  useEffect(() => {
    if (!cursoId || !alumnoId) return;

    const cargarDatos = async () => {
      try {
        setCargando(true);
        setReporteBloqueado(false);
        setEstadoReporteActual(null);
        setPeriodoCerradoProfesor(false);
        const idCursoNum = Number(cursoId);

        // 1. Datos del curso
        const { data: cursoData } = await supabase.from('cursos').select('*').eq('id', idCursoNum).single();
        setCursoInfo(cursoData);

        // Solo el Docente Titular (Primaria) o Profesor Guía (Secundaria) puede evaluar
        const stored = localStorage.getItem('usuarioActual');
        const user = stored ? JSON.parse(stored) : null;
        if (user && cursoData?.profesor_encargado_id !== user.id) {
          alert("Solo el docente titular (primaria) o el profesor guía (secundaria) puede evaluar este salón.");
          router.push('/dashboard/profesor');
          return;
        }

        // 2. Datos del alumno
        const { data: alumnoData } = await supabase.from('alumnos').select('*').eq('id', alumnoId).single();
        setAlumno(alumnoData);

        // 3. Materias del curso (Carga académica)
        const { data: cargaData } = await supabase
          .from('carga_academica')
          .select(`
            id,
            materia_id,
            materias (id, nombre_materia)
          `)
          .eq('curso_id', idCursoNum);

        setMateriasCarga(cargaData || []);

        // 4. Verificar si el reporte ya está enviado/en revisión/aprobado
        const { data: reporteExistente } = await supabase
          .from('reportes')
          .select('estado, texto_cualitativo_ia, notas_coordinacion')
          .eq('alumno_id', alumnoId)
          .eq('periodo', periodoSeleccionado)
          .single();

        if (reporteExistente) {
          setEstadoReporteActual(reporteExistente.estado);

          // Si fue enviado a coordinación, aprobado o despachado -> BLOQUEAR edición al profesor
          if (['en_revision_coordinador', 'aprobado_coordinador', 'enviado'].includes(reporteExistente.estado)) {
            setReporteBloqueado(true);
          }

          // Cargar texto cualitativo existente
          if (reporteExistente.texto_cualitativo_ia && reporteExistente.texto_cualitativo_ia !== 'Sin informe redactado aún.') {
            setReporteGeneral(reporteExistente.texto_cualitativo_ia);
          }

          // Si el reporte fue devuelto por coordinación, permitir corrección y mostrar nota
          if (reporteExistente.estado === 'devuelto_profesor') {
            setNotasCoordinadorDevuelto(reporteExistente.notas_coordinacion || null);
          }
        }

        // 5. Verificar si el lapso está cerrado por administración
        const { data: cerradoData } = await supabase
          .from('periodos_cerrados')
          .select('id')
          .eq('periodo', periodoSeleccionado)
          .eq('anio_escolar', anioEscolar)
          .limit(1);
        if (cerradoData && cerradoData.length > 0) setPeriodoCerradoProfesor(true);

        // Cargar notas existentes del alumno en este período
        const { data: califExistente } = await supabase
          .from('calificaciones')
          .select('materia_id, nota_literal, nota_num')
          .eq('alumno_id', alumnoId)
          .eq('periodo', periodoSeleccionado);

        const isPrim = cursoData?.nivel === 'primaria';
        const initialNotas: any = {};
        
        // Inicializar todas las materias completamente vacías desde el principio
        cargaData?.forEach((carga: any) => {
          initialNotas[carga.id] = '';
        });
        
        // Sobrescribir ÚNICAMENTE si ya existen notas guardadas previamente en la base de datos
        califExistente?.forEach((calif: any) => {
          const carga = cargaData?.find((c: any) => c.materia_id === calif.materia_id);
          if (carga) {
            if (isPrim) {
              if (calif.nota_literal) {
                initialNotas[carga.id] = calif.nota_literal;
              }
            } else {
              if (calif.nota_num !== null && calif.nota_num !== undefined) {
                initialNotas[carga.id] = String(calif.nota_num);
              }
            }
          }
        });
        
        setNotas(initialNotas);

      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [cursoId, alumnoId, periodoSeleccionado, anioEscolar]);

  const handleNotaChange = (cargaId: number, valor: string) => {
    if (cursoInfo?.nivel === 'secundaria') {
      if (valor === '') {
        setNotas(prev => ({ ...prev, [cargaId]: '' }));
        return;
      }
      if (!/^\d+$/.test(valor)) return;
      const num = parseInt(valor, 10);
      if (isNaN(num)) return;
      const clamped = Math.max(0, Math.min(20, num));
      setNotas(prev => ({ ...prev, [cargaId]: String(clamped) }));
    } else {
      setNotas(prev => ({ ...prev, [cargaId]: valor }));
    }
  };

  const toggleEtiquetaGlobal = (textoEtiqueta: string) => {
    setEtiquetasGlobales(prev => 
      prev.includes(textoEtiqueta)
        ? prev.filter(e => e !== textoEtiqueta)
        : [...prev, textoEtiqueta]
    );
  };

  const handleGenerarReporteGeneral = async () => {
    if (etiquetasGlobales.length === 0) {
      alert("Selecciona al menos un indicador o etiqueta para generar el reporte general.");
      return;
    }

    setGenerandoIA(true);
    const webhookUrl = '/api/generar-reporte';

    const resumenNotasTexto = materiasCarga.map(carga => {
      const nombreMat = carga.materias?.nombre_materia || 'Materia';
      const notaMat = notas[carga.id] || 'N/A';
      return `${nombreMat}: ${notaMat}`;
    }).join(', ');

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno: `${alumno.nombre} ${alumno.apellido}`,
          nivel: cursoInfo?.nivel,
          notasResumen: resumenNotasTexto,
          etiquetas: etiquetasGlobales
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const texto = data.textoCualitativo || data.output || data.reporte || (typeof data === 'string' ? data : JSON.stringify(data));
        setReporteGeneral(texto);
      } else {
        alert(data?.error || "Error al conectar con el flujo de IA en n8n.");
      }
    } catch (error) {
      console.error("Error n8n:", error);
      alert("No se pudo conectar con el servicio de IA.");
    } finally {
      setGenerandoIA(false);
    }
  };

  const handleGuardarBorrador = async () => {
    try {
      const isPrim = cursoInfo?.nivel === 'primaria';
      const idCursoNum = Number(cursoId);

      // Guardar calificaciones
      for (const carga of materiasCarga) {
        const valorNota = notas[carga.id];
        if (!valorNota) continue;

        const { error } = await supabase.from('calificaciones').upsert({
          alumno_id: alumnoId,
          materia_id: carga.materia_id,
          curso_id: idCursoNum,
          nota_literal: isPrim ? valorNota : null,
          nota_num: !isPrim ? parseInt(valorNota) : null,
          periodo: periodoSeleccionado
        }, { onConflict: 'alumno_id, materia_id, curso_id, periodo' });
        if (error) throw error;
      }

      // Guardar reporte como borrador
      if (reporteGeneral) {
        const { error } = await supabase.from('reportes').upsert({
          alumno_id: alumnoId,
          texto_cualitativo_ia: reporteGeneral,
          periodo: periodoSeleccionado,
          estado: 'borrador'
        }, { onConflict: 'alumno_id, periodo' });
        if (error) throw error;
      }

      alert("Borrador guardado correctamente. Puedes continuar editando después.");
    } catch (error) {
      console.error("Error al guardar borrador:", error);
      alert("Hubo un fallo al guardar el borrador.");
    }
  };

  const handleGuardarTodo = async () => {
    try {
      // Validar calificaciones de todas las asignaturas
      const isPrim = cursoInfo?.nivel === 'primaria';
      const escalaPrimariaPermitida = ['A', 'B', 'C', 'D', 'E'];

      for (const carga of materiasCarga) {
        const valor = notas[carga.id];
        const nomMat = carga.materias?.nombre_materia || 'Asignatura';
        if (!valor || valor.trim() === '') {
          alert(`Falta calificar la materia "${nomMat}". Todas las materias deben tener una calificación asignada antes de enviar a coordinación.`);
          return;
        }

        if (isPrim) {
          if (!escalaPrimariaPermitida.includes(valor.toUpperCase())) {
            alert(`La calificación de "${nomMat}" (${valor}) no es válida. Debe ser A, B, C, D o E.`);
            return;
          }
        } else {
          const num = parseInt(valor);
          if (isNaN(num) || num < 0 || num > 20) {
            alert(`La calificación de "${nomMat}" (${valor}) debe ser una nota numérica entre 0 y 20 puntos.`);
            return;
          }
        }
      }

      if (!reporteGeneral || reporteGeneral.trim().length < 15) {
        alert("Debes redactar o generar un informe cualitativo completo (mínimo 15 caracteres) antes de enviar el expediente a coordinación.");
        return;
      }

      const confirmacion = confirm(`¿Estás seguro de enviar el boletín de ${alumno?.nombre} ${alumno?.apellido} del ${periodoSeleccionado} a Coordinación Pedagógica para su revisión y aprobación?`);
      if (!confirmacion) return;

      const idCursoNum = Number(cursoId);

      // 1. Guardar cada calificación por materia
      for (const carga of materiasCarga) {
        const valorNota = notas[carga.id];
        if (!valorNota) continue;

        const { error } = await supabase.from('calificaciones').upsert({
          alumno_id: alumnoId,
          materia_id: carga.materia_id,
          curso_id: idCursoNum,
          nota_literal: isPrim ? valorNota.toUpperCase() : null,
          nota_num: !isPrim ? parseInt(valorNota) : null,
          periodo: periodoSeleccionado
        }, { onConflict: 'alumno_id, materia_id, curso_id, periodo' });
        if (error) throw error;
      }

      // 2. Guardar el reporte general unificado
      const { error } = await supabase.from('reportes').upsert({
        alumno_id: alumnoId,
        texto_cualitativo_ia: reporteGeneral.trim(),
        periodo: periodoSeleccionado,
        estado: 'en_revision_coordinador'
      }, { onConflict: 'alumno_id, periodo' });
      if (error) throw error;

      alert(notasCoordinadorDevuelto 
        ? "Boletín ajustado y reenviado a Coordinación Pedagógica con éxito." 
        : "Boletín guardado y enviado a Coordinación Pedagógica con éxito.");
      setNotasCoordinadorDevuelto(null);
      router.push(`/dashboard/profesor/clase/${cursoId}`);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar en Supabase:", error);
      alert("Hubo un fallo al intentar guardar la información.");
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const isPrimaria = cursoInfo?.nivel === 'primaria';

  const escalaPrimariaInfo: { [key: string]: { label: string; desc: string; color: string } } = {
    'A': { label: 'Excelente', desc: 'Consolidó ampliamente los aprendizajes previstos.', color: 'bg-emerald-600 text-white border-emerald-600' },
    'B': { label: 'Muy Bueno', desc: 'Consolidó los aprendizajes con buen desempeño.', color: 'bg-blue-600 text-white border-blue-600' },
    'C': { label: 'Bueno', desc: 'Alcanzó los aprendizajes requeridos para el grado.', color: 'bg-indigo-600 text-white border-indigo-600' },
    'D': { label: 'Insuficiente', desc: 'Requiere acompañamiento del docente y la familia.', color: 'bg-amber-500 text-white border-amber-500' },
    'E': { label: 'Reprobado', desc: 'Requiere plan de nivelación y atención pedagógica.', color: 'bg-rose-500 text-white border-rose-500' },
  };

  const getSecundariaBadge = (numStr: string) => {
    if (!numStr || numStr.trim() === '') return null;
    const num = parseInt(numStr, 10);
    if (isNaN(num)) return null;
    if (num >= 16) return { text: 'Excelente', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (num >= 10) return { text: 'Aprobado', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    return { text: 'En Recuperación', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      
      {/* Barra de Navegación Institucional con Logo Ampliado */}
      <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          
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
              <p className="text-[11px] text-slate-400 font-medium">Portal Docente • Evaluación Integral del Alumno</p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">Prof. {usuario?.nombre} {usuario?.apellido}</span>
              <span className="text-[11px] text-slate-400">{isPrimaria ? 'Docente de Aula Titular' : 'Profesor Guía de Sección'}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-inner border border-blue-500">
              {usuario?.nombre?.charAt(0)}{usuario?.apellido?.charAt(0)}
            </div>
          </div>

        </div>
      </nav>

      {/* Contenedor Principal */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 print:hidden">

        {/* Acciones de Navegación */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.push(`/dashboard/profesor/clase/${cursoId}`)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm"
          >
            <IconArrowLeft className="w-4 h-4" />
            <span>Volver a la Lista del Salón</span>
          </button>
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>{cursoInfo?.nombre_grado}</span>
            <span>/</span>
            <span className="text-slate-700 font-bold">Ficha Pedagógica</span>
          </div>
        </div>

        {/* Ficha Escolar del Estudiante */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
              {alumno ? `${alumno.nombre?.charAt(0)}${alumno.apellido?.charAt(0)}` : 'AL'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  {cursoInfo?.nivel}
                </span>
                <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Exp. #{alumnoId?.toString().slice(0, 8)}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {periodoSeleccionado}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {alumno ? `${alumno.nombre} ${alumno.apellido}` : 'Cargando alumno...'}
              </h1>
              <p className="text-xs text-slate-500">
                {cursoInfo?.nombre_grado} — Sección "{cursoInfo?.seccion}" • Año Escolar {anioEscolar}
              </p>
            </div>
          </div>
          
          {reporteBloqueado && (
            <div className="w-full bg-blue-50 border border-blue-200 text-blue-900 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
              <IconLock className="w-4 h-4 text-blue-700 flex-shrink-0" />
              <span>
                {estadoReporteActual === 'en_revision_coordinador'
                  ? 'Este boletín ya fue enviado a Coordinación Pedagógica y se encuentra en revisión. La edición está bloqueada para preservar la integridad del expediente.'
                  : estadoReporteActual === 'aprobado_coordinador'
                  ? 'Este boletín ya fue aprobado por Coordinación Pedagógica y se encuentra validado oficialmente.'
                  : 'Este boletín ya fue sellado por Dirección y despachado al representante.'}
              </span>
            </div>
          )}
          {notasCoordinadorDevuelto && (
            <div className="w-full bg-rose-50 border-2 border-rose-300 text-rose-800 p-4 rounded-xl text-xs space-y-1">
              <div className="font-bold flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Este reporte fue devuelto por Coordinación para ajustes pedagógicos</span>
              </div>
              <div className="bg-white border border-rose-200 rounded-lg p-3 text-rose-700 font-medium">
                <span className="font-bold text-rose-900">Observaciones:</span> {notasCoordinadorDevuelto}
              </div>
            </div>
          )}
          {periodoCerradoProfesor && (
            <div className="w-full bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <IconAlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>Este período está cerrado por la administración. No se pueden editar calificaciones ni reportes.</span>
            </div>
          )}
          {sistemaBloqueado && (
            <div className="w-full bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <IconAlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>El sistema se encuentra bloqueado temporalmente por la administración.</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Período:</label>
              <select
                value={periodoSeleccionado}
                onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                disabled={sistemaBloqueado}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 cursor-pointer"
              >
                {PERIODOS.map((p) => (
                  <option key={p} value={p} disabled={periodoCerradoProfesor && p === periodoSeleccionado}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setMostrarVistaPrevia(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all border border-slate-300 shadow-sm cursor-pointer"
              title="Ver el formato oficial del boletín con los datos actuales"
            >
              <IconEye className="w-4 h-4 text-blue-600" />
              <span>Vista Previa</span>
            </button>

            {!reporteBloqueado && !periodoCerradoProfesor && !sistemaBloqueado && (
              <button
                type="button"
                onClick={handleGuardarBorrador}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                title="Guardar calificaciones y apreciación sin enviar a revisión aún"
              >
                <IconSave className="w-4 h-4 text-slate-300" />
                <span>Guardar Borrador</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleGuardarTodo}
              disabled={reporteBloqueado || periodoCerradoProfesor || sistemaBloqueado}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer"
              title="Guardar y remitir el boletín al coordinador pedagógico para su aprobación"
            >
              <IconSend className="w-4 h-4" />
              <span>{notasCoordinadorDevuelto ? 'Reenviar a Coordinación' : 'Guardar y Enviar'}</span>
            </button>
          </div>
        </header>

        {/* Sección 1: Registro de Calificaciones */}
        <section className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5 ${(reporteBloqueado || periodoCerradoProfesor || sistemaBloqueado) ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <IconBook className="w-4 h-4 text-slate-500" />
                Cuadro de Calificaciones por Asignatura
              </h2>
              <p className="text-xs text-slate-400">
                {isPrimaria 
                  ? 'Escala Cualitativa Literal Oficial (A - E)' 
                  : 'Escala Cuantitativa Vigesimal (0 a 20 puntos)'}
              </p>
            </div>

            {isPrimaria ? (
              <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span><strong>A:</strong> Excelente</span>
                <span>•</span>
                <span><strong>B:</strong> Muy Bueno</span>
                <span>•</span>
                <span><strong>C:</strong> Bueno</span>
                <span>•</span>
                <span><strong>D:</strong> Insuficiente</span>
                <span>•</span>
                <span><strong>E:</strong> Reprobado</span>
              </div>
            ) : (() => {
              const materiasConNota = materiasCarga.filter(c => notas[c.id] !== undefined && String(notas[c.id]).trim() !== '');
              const suma = materiasConNota.reduce((acc, c) => acc + (parseInt(notas[c.id], 10) || 0), 0);
              const promedio = materiasConNota.length > 0 ? (suma / materiasConNota.length).toFixed(1) : null;
              const numProm = promedio ? parseFloat(promedio) : null;

              return (
                <div className="flex items-center gap-3 bg-slate-50 p-2 sm:px-4 sm:py-2 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Promedio del Lapso</span>
                    <div className="flex items-center gap-2">
                      {promedio !== null ? (
                        <>
                          <span className="text-lg font-black text-slate-900">{promedio} <span className="text-xs font-semibold text-slate-400">/ 20 pts</span></span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            numProm !== null && numProm >= 16 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : numProm !== null && numProm >= 10 
                                ? 'bg-blue-50 text-blue-800 border-blue-300' 
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            {numProm !== null && numProm >= 16 ? 'Excelente' : numProm !== null && numProm >= 10 ? 'Aprobado' : 'En Riesgo'}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 italic">Sin notas ingresadas aún</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materiasCarga.map((carga) => {
              const valorActual = notas[carga.id] !== undefined ? String(notas[carga.id]) : '';
              const statusSec = !isPrimaria ? getSecundariaBadge(valorActual) : null;
              const estaVacio = valorActual.trim() === '';
              const numValor = estaVacio ? null : parseInt(valorActual, 10);

              return (
                <div 
                  key={carga.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200 gap-3 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm flex-shrink-0">
                      <IconBook className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 block">
                        {carga.materias?.nombre_materia}
                      </span>
                      {isPrimaria && escalaPrimariaInfo[valorActual] ? (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {escalaPrimariaInfo[valorActual].label}
                        </span>
                      ) : isPrimaria ? (
                        <span className="text-[10px] text-slate-400 italic">
                          Sin calificar
                        </span>
                      ) : null}
                      {!isPrimaria && statusSec ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 inline-block ${statusSec.bg}`}>
                          {statusSec.text}
                        </span>
                      ) : !isPrimaria ? (
                        <span className="text-[10px] text-slate-400 italic mt-1 inline-block">
                          Sin calificar
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {isPrimaria ? (
                    <div className="flex items-center gap-1 self-end sm:self-center">
                      {['A', 'B', 'C', 'D', 'E'].map((letra) => {
                        const isSelected = valorActual === letra;
                        const info = escalaPrimariaInfo[letra];
                        return (
                          <button
                            key={letra}
                            type="button"
                            title={`${letra} - ${info?.desc || ''}`}
                            onClick={() => handleNotaChange(carga.id, letra)}
                            className={`w-8 h-8 rounded-xl font-black text-xs transition-all border ${
                              isSelected 
                                ? `${info?.color || 'bg-blue-600 text-white border-blue-600'} shadow-sm scale-105` 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            {letra}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          value={valorActual}
                          onChange={(e) => handleNotaChange(carga.id, e.target.value)}
                          className={`w-16 sm:w-20 py-2.5 text-center text-lg sm:text-xl font-black rounded-2xl border-2 focus:outline-none transition-all shadow-sm ${
                            estaVacio
                              ? 'text-slate-800 bg-white border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300'
                              : numValor !== null && numValor < 10 
                                ? 'text-rose-700 bg-rose-50 border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200' 
                                : numValor !== null && numValor >= 16 
                                  ? 'text-emerald-800 bg-emerald-50 border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200' 
                                  : 'text-blue-900 bg-white border-blue-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-200'
                          }`}
                          placeholder="—"
                        />
                        <span className="text-xs font-bold text-slate-400">/ 20</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sección 2: Asistente Pedagógico IA */}
        <section className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5 ${(reporteBloqueado || periodoCerradoProfesor || sistemaBloqueado) ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <IconSparkles className="w-4 h-4 text-amber-500" />
              Redacción del Informe Descriptivo y Cualitativo (Asistente IA)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Selecciona los indicadores del estudiante clasificados por área formativa para generar la redacción pedagógica oficial del boletín.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Categoría 1: Conducta y Disciplina */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <IconShield className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Conducta y Disciplina</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ETIQUETAS_BANCO.conducta.map((texto, idx) => {
                  const isSelected = etiquetasGlobales.includes(texto);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleEtiquetaGlobal(texto)}
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all duration-150 flex items-center justify-between ${
                        isSelected 
                          ? 'bg-amber-600 border-amber-600 text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="pr-2">{texto}</span>
                      <span className="flex-shrink-0 font-bold">{isSelected ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categoría 2: Rendimiento Académico */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <IconChart className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Rendimiento Académico</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ETIQUETAS_BANCO.academico.map((texto, idx) => {
                  const isSelected = etiquetasGlobales.includes(texto);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleEtiquetaGlobal(texto)}
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all duration-150 flex items-center justify-between ${
                        isSelected 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="pr-2">{texto}</span>
                      <span className="flex-shrink-0 font-bold">{isSelected ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categoría 3: Convivencia y Socialización */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <IconUsers className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Convivencia y Socialización</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ETIQUETAS_BANCO.convivencia.map((texto, idx) => {
                  const isSelected = etiquetasGlobales.includes(texto);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleEtiquetaGlobal(texto)}
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all duration-150 flex items-center justify-between ${
                        isSelected 
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="pr-2">{texto}</span>
                      <span className="flex-shrink-0 font-bold">{isSelected ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500 font-medium">
              Total seleccionados: <strong className="text-slate-800">{etiquetasGlobales.length}</strong> indicadores
            </span>
            {etiquetasGlobales.length > 0 && (
              <button 
                onClick={() => setEtiquetasGlobales([])}
                className="text-[11px] font-bold text-rose-600 hover:underline"
              >
                Limpiar selección
              </button>
            )}
          </div>

          {/* Botón de Generación IA */}
          <button
            onClick={handleGenerarReporteGeneral}
            disabled={generandoIA}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {generandoIA ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Redactando informe descriptivo oficial con IA...</span>
              </>
            ) : (
              <>
                <IconSparkles className="w-4 h-4 text-amber-400" />
                <span>Generar Informe Descriptivo del Alumno con IA</span>
              </>
            )}
          </button>

          {/* Editor de Texto del Informe Cualitativo */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">
                Apreciación Pedagógica General del Estudiante:
              </label>
              <span className="text-[11px] text-slate-400">
                Editable por el docente
              </span>
            </div>
            <textarea
              rows={6}
              value={reporteGeneral}
              onChange={(e) => setReporteGeneral(e.target.value)}
              placeholder="El informe cualitativo oficial generado con apoyo de la inteligencia artificial se mostrará aquí. Podrás revisarlo, adaptarlo o enriquecerlo con observaciones pedagógicas particulares antes de emitir el boletín final..."
              className="w-full p-4 text-xs border border-slate-200 rounded-xl text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed transition-all"
            />
          </div>
        </section>

      </main>

      {/* MODAL OFICIAL: BOLETÍN INFORMATIVO ESCOLAR */}
      {mostrarVistaPrevia && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 z-50 overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:my-0 print:rounded-none print:overflow-visible print:w-full print:max-w-none">
            
            {/* Barra de Controles del Modal */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <IconDocument className="w-4 h-4 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Vista Previa Oficial del Boletín</h3>
                  <p className="text-[10px] text-slate-400">Formato de Acta Escolar Institucional</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => window.print()} 
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition-all shadow-sm cursor-pointer"
                >
                  <IconPrint className="w-3.5 h-3.5 text-blue-400" />
                  <span>Imprimir / PDF</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setMostrarVistaPrevia(false)} 
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm transition-all text-slate-300 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Documento Oficial del Boletín */}
            <div className="overflow-y-auto bg-slate-100/60 p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible print:max-h-none">
              <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none print:overflow-visible">
                <BoletinDocumento
                  nombreAlumno={`${alumno?.nombre || ''} ${alumno?.apellido || ''}`}
                  nombreGrado={cursoInfo?.nombre_grado || ''}
                  seccion={cursoInfo?.seccion || ''}
                  nivel={cursoInfo?.nivel || 'primaria'}
                  correoRepresentante={alumno?.correo_representante}
                  periodo={periodoSeleccionado}
                  anioEscolar={anioEscolar}
                  calificaciones={materiasCarga.map((carga) => {
                    const notaVal = notas[carga.id] || '-';
                    const literalInfo = isPrimaria ? escalaPrimariaInfo[notaVal] : null;
                    const secInfo = !isPrimaria ? getSecundariaBadge(notaVal) : null;
                    const apreciacion = isPrimaria ? (literalInfo?.label || 'Registrado') : (secInfo?.text || 'Puntaje Oficial');
                    return {
                      materia: carga.materias?.nombre_materia || 'Asignatura',
                      nota: notaVal,
                      apreciacion: apreciacion
                    };
                  })}
                  informeCualitativo={reporteGeneral}
                  nombreDocente={usuario ? `Prof. ${usuario.nombre} ${usuario.apellido}` : 'Docente Asignado'}
                  rolDocente={isPrimaria ? 'Docente de Aula Titular' : 'Profesor Guía de Sección'}
                  nombreCoordinador="Coordinación Pedagógica"
                  coordinacionAprobada={reporteBloqueado}
                  nombreDirector="Lcda. Luisa Pérez"
                  direccionSellada={false}
                />
              </div>
            </div>

            {/* Pie del Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 print:hidden">
              <span className="text-[11px] text-slate-500 font-medium">
                Documento oficial • Formato institucional unificado
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarVistaPrevia(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cerrar
                </button>
                
                {!reporteBloqueado && !periodoCerradoProfesor && !sistemaBloqueado && (
                  <button
                    type="button"
                    onClick={async () => {
                      await handleGuardarTodo();
                      setMostrarVistaPrevia(false);
                    }}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    <IconSend className="w-3.5 h-3.5" />
                    <span>Guardar y Enviar a Coordinación</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}