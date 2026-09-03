'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../../../lib/supabase';

export default function EvaluarAlumnoGeneralPage() {
  const params = useParams();
  const cursoId = params.id;
  const alumnoId = params.alumnoId;
  const router = useRouter();

  const [alumno, setAlumno] = useState<any>(null);
  const [cursoInfo, setCursoInfo] = useState<any>(null);
  const [materiasCarga, setMateriasCarga] = useState<any[]>([]);
  const [etiquetasDisponibles, setEtiquetasDisponibles] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados locales
  // calificaciones por materia: { [carga_academica_id]: nota }
  const [notas, setNotas] = useState<{ [key: number]: string }>({});
  // Etiquetas globales seleccionadas para el informe general
  const [etiquetasGlobales, setEtiquetasGlobales] = useState<string[]>([]);
  // Texto final del reporte general
  const [reporteGeneral, setReporteGeneral] = useState('');
  const [generandoIA, setGenerandoIA] = useState(false);

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

        // 4. Banco de etiquetas
        const { data: etiquetasData } = await supabase.from('etiquetas_reporte').select('*');
        setEtiquetasDisponibles(etiquetasData || []);

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

  // Cambiar nota de una materia
  const handleNotaChange = (cargaId: number, valor: string) => {
    setNotas(prev => ({ ...prev, [cargaId]: valor }));
  };

  // Alternar etiquetas globales para el informe general
  const toggleEtiquetaGlobal = (textoEtiqueta: string) => {
    setEtiquetasGlobales(prev => 
      prev.includes(textoEtiqueta)
        ? prev.filter(e => e !== textoEtiqueta)
        : [...prev, textoEtiqueta]
    );
  };

  // Generar reporte general con IA vía n8n
  const handleGenerarReporteGeneral = async () => {
    if (etiquetasGlobales.length === 0) {
      alert("Selecciona al menos un indicador o etiqueta para generar el reporte general.");
      return;
    }

    setGenerandoIA(true);
    const webhookUrl = 'https://isa3580.app.n8n.cloud/webhook-test/evaluar-alumno';

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno: `${alumno.nombre} ${alumno.apellido}`,
          nivel: cursoInfo?.nivel,
          notas: notas,
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

  // Guardar calificaciones individuales y reporte general en Supabase
  const handleGuardarTodo = async () => {
    try {
      const isPrimaria = cursoInfo?.nivel === 'primaria';

      // 1. Guardar cada calificación por materia
      for (const carga of materiasCarga) {
        const valorNota = notas[carga.id];
        if (!valorNota) continue;

        await supabase.from('calificaciones').upsert({
          alumno_id: alumnoId,
          carga_academica_id: carga.id,
          nota_literal: isPrimaria ? valorNota : null,
          nota_num: !isPrimaria ? parseInt(valorNota) : null,
          periodo: 'Primer Momento'
        }, { onConflict: 'alumno_id, carga_academica_id, periodo' });
      }

      // 2. Guardar el reporte general unificado del alumno
      if (reporteGeneral) {
        await supabase.from('reportes').upsert({
          alumno_id: alumnoId,
          carga_academica_id: null, // Es general, no amarrado a una sola materia
          texto_cualitativo_ia: reporteGeneral,
          periodo: 'Primer Momento',
          estado: 'borrador'
        }, { onConflict: 'alumno_id, periodo' });
      }

      alert("¡Boletín y calificaciones guardados con éxito!");
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
            <button 
              onClick={() => router.push(`/dashboard/profesor/clase/${cursoId}`)}
              className="text-xs font-semibold text-blue-600 hover:underline mb-1 block"
            >
              ← Volver al listado del salón
            </button>
            <h1 className="text-xl font-bold text-slate-800">Evaluación del Alumno: {alumno?.nombre} {alumno?.apellido}</h1>
            <p className="text-xs text-slate-500">{cursoInfo?.nombre_grado} "{cursoInfo?.seccion}" ({cursoInfo?.nivel})</p>
          </div>
          <button
            onClick={handleGuardarTodo}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl shadow-md transition-all"
          >
            Guardar Boletín Final
          </button>
        </header>

        {/* Sección 1: Calificaciones por Materia */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
            Calificaciones por Materia ({isPrimaria ? 'Escala A - F' : 'Escala 0 - 20'})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materiasCarga.map((carga) => {
              const valorActual = notas[carga.id] || (isPrimaria ? 'A' : '15');

              return (
                <div key={carga.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-sm font-bold text-slate-700">{carga.materias.nombre_materia}</span>

                  {isPrimaria ? (
                    // Botones A - F para Primaria
                    <div className="flex gap-1">
                      {['A', 'B', 'C', 'D', 'E', 'F'].map((letra) => (
                        <button
                          key={letra}
                          onClick={() => handleNotaChange(carga.id, letra)}
                          className={`w-8 h-8 rounded-lg font-bold text-xs transition-all border ${
                            valorActual === letra 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {letra}
                        </button>
                      ))}
                    </div>
                  ) : (
                    // Input numérico 0 - 20 para Secundaria
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={valorActual}
                      onChange={(e) => handleNotaChange(carga.id, e.target.value)}
                      className="w-20 p-1.5 text-center text-sm font-bold text-blue-800 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección 2: Reporte General Unificado con IA */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
            Redacción de Informe General Desempeño Estudiantil
          </h2>

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-2">Selecciona los indicadores generales para el informe:</label>
            <div className="flex flex-wrap gap-2">
              {etiquetasDisponibles.map((eti) => {
                const isSelected = etiquetasGlobales.includes(eti.texto_etiqueta);
                return (
                  <button
                    key={eti.id}
                    onClick={() => toggleEtiquetaGlobal(eti.texto_etiqueta)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl border text-left transition-all ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {eti.texto_etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleGenerarReporteGeneral}
            disabled={generandoIA}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {generandoIA ? 'Redactando informe general con IA...' : '✨ Generar Informe General del Alumno'}
          </button>

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Vista previa y edición del reporte general:</label>
            <textarea
              rows={5}
              value={reporteGeneral}
              onChange={(e) => setReporteGeneral(e.target.value)}
              placeholder="El informe cualitativo general redactado por la inteligencia artificial se visualizará aquí para tu aprobación..."
              className="w-full p-4 text-xs border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
            />
          </div>
        </div>

      </div>
    </div>
  );
}