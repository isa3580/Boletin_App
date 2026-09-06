'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../../../lib/supabase';
import { PERIODOS, ANIO_ESCOLAR } from '../../../../../../../lib/constants';

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

  useEffect(() => {
    const stored = localStorage.getItem('usuarioActual');
    if (stored) setUsuario(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!cursoId || !alumnoId) return;

    const cargarDatos = async () => {
      try {
        setCargando(true);
        const idCursoNum = Number(cursoId);

        // 1. Datos del alumno
        const { data: alumnoData } = await supabase.from('alumnos').select('*').eq('id', alumnoId).single();
        setAlumno(alumnoData);

        // 2. Datos del curso
        const { data: cursoData } = await supabase.from('cursos').select('*').eq('id', idCursoNum).single();
        setCursoInfo(cursoData);

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

        // Inicializar notas por defecto (A para primaria, 15 para secundaria)
        const initialNotas: any = {};
        const isPrimaria = cursoData?.nivel === 'primaria';
        cargaData?.forEach((carga: any) => {
          initialNotas[carga.id] = isPrimaria ? 'A' : '15';
        });
        setNotas(initialNotas);

      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [cursoId, alumnoId]);

  const handleNotaChange = (cargaId: number, valor: string) => {
    setNotas(prev => ({ ...prev, [cargaId]: valor }));
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
    const webhookUrl = 'https://isa3580.app.n8n.cloud/webhook-test/evaluar-alumno';

    // Transformamos las notas en texto plano legible
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

      if (response.ok) {
        const data = await response.json();
        const texto = data.textoCualitativo || data.output || data.reporte || JSON.stringify(data);
        setReporteGeneral(texto);
      } else {
        alert("Error al conectar con n8n.");
      }
    } catch (error) {
      console.error("Error n8n:", error);
      alert("No se pudo conectar con el servicio de IA.");
    } finally {
      setGenerandoIA(false);
    }
  };

  const handleGuardarTodo = async () => {
    try {
      // Validaciones antes de guardar
      const notasConValor = Object.values(notas).filter(v => v && v.trim() !== '');
      if (notasConValor.length === 0) {
        alert("Debes ingresar al menos una calificación antes de guardar.");
        return;
      }

      if (!reporteGeneral || reporteGeneral.trim() === '') {
        alert("Debes redactar o generar el informe cualitativo antes de enviar a coordinación.");
        return;
      }

      const confirmacion = confirm(`¿Estás seguro de enviar el boletín de ${alumno?.nombre} ${alumno?.apellido} al período ${periodoSeleccionado} a coordinación para revisión?`);
      if (!confirmacion) return;

      const isPrimaria = cursoInfo?.nivel === 'primaria';
      const idCursoNum = Number(cursoId);

      // 1. Guardar cada calificación por materia
      for (const carga of materiasCarga) {
        const valorNota = notas[carga.id];
        if (!valorNota) continue;

        await supabase.from('calificaciones').upsert({
          alumno_id: alumnoId,
          materia_id: carga.materia_id,
          curso_id: idCursoNum,
          nota_literal: isPrimaria ? valorNota : null,
          nota_num: !isPrimaria ? parseInt(valorNota) : null,
          periodo: periodoSeleccionado
        }, { onConflict: 'alumno_id, materia_id, curso_id, periodo' });
      }

      // 2. Guardar el reporte general unificado
      if (reporteGeneral) {
        await supabase.from('reportes').upsert({
          alumno_id: alumnoId,
          texto_cualitativo_ia: reporteGeneral,
          periodo: periodoSeleccionado,
          estado: 'en_revision_coordinador'
        }, { onConflict: 'alumno_id, periodo' });
      }

      alert("¡Boletín guardado y enviado a coordinación con éxito!");
      router.push(`/dashboard/profesor/clase/${cursoId}`);
    } catch (error) {
      console.error("Error al guardar en Supabase:", error);
      alert("Hubo un fallo al intentar guardar la información.");
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
    const num = parseInt(numStr) || 0;
    if (num >= 16) return { text: 'Excelente', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (num >= 10) return { text: 'Aprobado', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    return { text: 'En Recuperación', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-amber-50/20 text-slate-800 pb-12">
      
      {/* Barra de Navegación Institucional Escolar */}
      <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          
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
              <p className="text-[11px] text-slate-400 font-medium">Portal Docente • Evaluación Integral del Alumno</p>
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

      {/* Contenedor Principal */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 print:hidden">

        {/* Miga de Pan y Acciones de Navegación */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.push(`/dashboard/profesor/clase/${cursoId}`)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm hover:shadow"
          >
            <span>←</span> Volver a la Lista del Salón
          </button>
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>{cursoInfo?.nombre_grado}</span>
            <span>/</span>
            <span className="text-slate-700 font-bold">Ficha Pedagógica</span>
          </div>
        </div>

        {/* Ficha Escolar del Estudiante (Encabezado) */}
        <header className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-gradient-to-b from-blue-600 to-indigo-600"></div>

          <div className="flex items-center gap-4 pl-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
              {alumno ? `${alumno.nombre?.charAt(0)}${alumno.apellido?.charAt(0)}` : 'AL'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
                  {cursoInfo?.nivel}
                </span>
                <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Expediente #{alumnoId?.toString().slice(0, 8)}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {periodoSeleccionado}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {alumno ? `${alumno.nombre} ${alumno.apellido}` : 'Cargando alumno...'}
              </h1>
              <p className="text-xs text-slate-500">
                {cursoInfo?.nombre_grado} Sección "{cursoInfo?.seccion}" • Año Escolar {ANIO_ESCOLAR}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Período:</label>
              <select
                value={periodoSeleccionado}
                onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PERIODOS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setMostrarVistaPrevia(true)}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-3 rounded-xl transition-all border border-slate-200 hover:border-slate-300 shadow-sm"
            >
              <span>👁️</span> Vista Previa Boletín
            </button>
            <button
              onClick={handleGuardarTodo}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-blue-600/20 hover:shadow-lg transition-all"
            >
              <span>💾</span> Guardar Boletín Oficial
            </button>
          </div>
        </header>

        {/* Sección 1: Registro de Calificaciones */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>📚</span> Cuadro de Calificaciones por Asignatura
              </h2>
              <p className="text-xs text-slate-400">
                {isPrimaria 
                  ? 'Escala Cualitativa Literal Oficial (A - E)' 
                  : 'Escala Cuantitativa Vigesimal (0 a 20 puntos)'}
              </p>
            </div>

            {isPrimaria && (
              <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
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
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materiasCarga.map((carga) => {
              const valorActual = notas[carga.id] || (isPrimaria ? 'A' : '15');
              const statusSec = !isPrimaria ? getSecundariaBadge(valorActual) : null;

              return (
                <div 
                  key={carga.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200/80 gap-3 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-xs">
                      📖
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 block">
                        {carga.materias?.nombre_materia}
                      </span>
                      {isPrimaria && escalaPrimariaInfo[valorActual] && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {escalaPrimariaInfo[valorActual].label}
                        </span>
                      )}
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
                                ? `${info?.color || 'bg-blue-600 text-white border-blue-600'} shadow-md scale-105` 
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
                      {statusSec && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusSec.bg}`}>
                          {statusSec.text}
                        </span>
                      )}
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={valorActual}
                          onChange={(e) => handleNotaChange(carga.id, e.target.value)}
                          className="w-16 p-2 text-center text-sm font-black text-blue-900 bg-white border-2 border-blue-200 focus:border-blue-600 rounded-xl focus:outline-none shadow-xs"
                        />
                        <span className="text-[10px] text-slate-400 font-bold block text-center mt-0.5">/ 20 pts</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sección 2: Asistente Pedagógico IA (Clasificado por Categorías) */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span>✨</span> Redacción del Informe Descriptivo y Cualitativo (Asistente IA)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Selecciona los indicadores del estudiante clasificados por área para asistir la redacción pedagógica del boletín.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Categoría 1: Conducta y Disciplina */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="text-base">🛡️</span>
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
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all duration-200 flex items-center justify-between ${
                        isSelected 
                          ? 'bg-amber-600 border-amber-600 text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{texto}</span>
                      <span>{isSelected ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categoría 2: Rendimiento Académico */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="text-base">📊</span>
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
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all duration-200 flex items-center justify-between ${
                        isSelected 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{texto}</span>
                      <span>{isSelected ? '✓' : '+'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categoría 3: Convivencia y Socialización */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="text-base">🤝</span>
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
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all duration-200 flex items-center justify-between ${
                        isSelected 
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{texto}</span>
                      <span>{isSelected ? '✓' : '+'}</span>
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
            className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white text-xs font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-slate-900/10 hover:shadow-lg"
          >
            {generandoIA ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Redactando informe descriptivo oficial con IA...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Generar Informe Descriptivo del Alumno con IA</span>
              </>
            )}
          </button>

          {/* Editor de Texto del Informe Cualitativo */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-600">
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
              className="w-full p-4 text-xs border border-slate-200 rounded-2xl text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none leading-relaxed transition-all shadow-inner"
            />
          </div>
        </section>

      </main>

      {/* MODAL OFICIAL: BOLETÍN INFORMATIVO ESCOLAR */}
      {mostrarVistaPrevia && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
            
            {/* Barra de Controles del Modal */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-lg">📜</span>
                <div>
                  <h3 className="text-sm font-bold">Vista Previa Oficial del Boletín</h3>
                  <p className="text-[10px] text-slate-400">Formato de Acta Escolar Institucional</p>
                </div>
              </div>
              <div>
                <button 
                  onClick={() => setMostrarVistaPrevia(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm transition-all text-slate-300 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Documento Oficial del Boletín */}
            <div className="p-8 sm:p-10 space-y-6 overflow-y-auto bg-white text-slate-800 font-sans">
              
              {/* Membrete Oficial */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  REPÚBLICA BOLIVARIANA DE VENEZUELA • MINISTERIO DEL PODER POPULAR PARA LA EDUCACIÓN
                </p>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  UNIDAD EDUCATIVA COLEGIO SAN FRANCISCO
                </h2>
                <p className="text-[11px] font-semibold text-slate-600">
                  Código Plantel: DEA-001234 • RIF: J-30492819-0
                </p>
                <div className="pt-2">
                  <span className="inline-block bg-slate-100 text-slate-800 text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider border border-slate-300">
                    Boletín Informativo de Rendimiento Estudiantil
                  </span>
                </div>
              </div>

              {/* Ficha de Datos del Estudiante */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Estudiante:</span>
                  <span className="font-black text-slate-900">{alumno?.nombre} {alumno?.apellido}</span>
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
                  <span className="font-bold text-slate-800">{periodoSeleccionado} • {ANIO_ESCOLAR}</span>
                </div>
              </div>

              {/* Tabla de Calificaciones Oficial */}
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>📊</span> Resumen de Calificaciones
                </h4>
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-300">
                        <th className="p-3">Área de Formación / Asignatura</th>
                        <th className="p-3 text-center w-32">Calificación</th>
                        <th className="p-3 text-center hidden sm:table-cell">Apreciación Pedagógica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {materiasCarga.map((carga, idx) => {
                        const notaVal = notas[carga.id] || '-';
                        const literalInfo = isPrimaria ? escalaPrimariaInfo[notaVal] : null;
                        const secInfo = !isPrimaria ? getSecundariaBadge(notaVal) : null;

                        return (
                          <tr key={carga.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="p-3 font-semibold text-slate-800">
                              {carga.materias?.nombre_materia}
                            </td>
                            <td className="p-3 text-center font-black text-blue-700 text-sm">
                              {notaVal}
                            </td>
                            <td className="p-3 text-center text-[11px] text-slate-500 hidden sm:table-cell">
                              {isPrimaria && (literalInfo?.label || 'Registrado')}
                              {!isPrimaria && (secInfo?.text || 'Puntaje Oficial')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informe Cualitativo General */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📝</span> Informe Descriptivo del Rendimiento Estudiantil
                </h4>
                <div className="p-5 bg-amber-50/30 border border-amber-200/60 rounded-2xl text-slate-800 text-xs leading-relaxed">
                  {reporteGeneral ? (
                    <p className="whitespace-pre-wrap font-normal text-justify leading-relaxed">
                      {reporteGeneral}
                    </p>
                  ) : (
                    <p className="text-slate-400 italic text-center py-3">
                      Aún no se ha redactado el informe cualitativo del estudiante para este momento pedagógico.
                    </p>
                  )}
                </div>
              </div>

              {/* Bloque de Firmas Oficiales */}
              <div className="pt-8 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center border-t border-slate-200 text-xs mt-6">
                <div>
                  <div className="h-12 border-b border-slate-400 mx-4"></div>
                  <p className="font-bold text-slate-800 mt-2">Prof. {usuario?.nombre} {usuario?.apellido}</p>
                  <p className="text-[10px] text-slate-500">Docente de Aula</p>
                </div>
                <div>
                  <div className="h-12 border-b border-slate-400 mx-4"></div>
                  <p className="font-bold text-slate-800 mt-2">Lcdo. Roberto Mendoza</p>
                  <p className="text-[10px] text-slate-500">Director del Plantel</p>
                </div>
                <div className="hidden sm:block">
                  <div className="h-12 border-b border-dashed border-slate-400 mx-4 flex items-center justify-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Sello Oficial</span>
                  </div>
                  <p className="font-bold text-slate-800 mt-2">Control de Estudios</p>
                  <p className="text-[10px] text-slate-500">U.E. Colegio San Francisco</p>
                </div>
              </div>

            </div>

            {/* Pie del Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center print:hidden">
              <span className="text-[11px] text-slate-400 font-medium">
                Documento generado por el Portal Escolar Oficial
              </span>
              <button
                onClick={() => setMostrarVistaPrevia(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                Cerrar Vista Previa
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}