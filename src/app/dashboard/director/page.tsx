'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { PERIODOS, ANIO_ESCOLAR } from '../../../lib/constants';

interface CursoItem {
  id: number;
  nombre_grado: string;
  seccion: string;
  nivel: string;
}

interface AlumnoItem {
  id: string;
  curso_id: number;
}

interface ReporteItem {
  id: string;
  alumno_id: string;
  estado: string;
  periodo: string;
}

export default function DirectorDashboard() {
  const [cursos, setCursos] = useState<CursoItem[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoItem[]>([]);
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>(PERIODOS[0]);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const cargarDatosDirector = async () => {
      try {
        setCargando(true);

        // 1. Cursos del plantel
        const { data: cursosData } = await supabase.from('cursos').select('*').order('id', { ascending: true });
        setCursos(cursosData || []);

        // 2. Alumnos inscritos
        const { data: alumnosData } = await supabase.from('alumnos').select('*');
        setAlumnos(alumnosData || []);

        // 3. Reportes emitidos
        const { data: reportesData } = await supabase.from('reportes').select('*');
        setReportes(reportesData || []);

      } catch (error) {
        console.error("Error al cargar datos de dirección:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosDirector();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-amber-50/20 text-slate-800 pb-16">
      
      {/* Barra de Navegación Institucional */}
      <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 text-lg">
              🏫
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">U.E. COLEGIO SAN FRANCISCO</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30">
                  DIRECCIÓN GENERAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Autorización Final, Sello y Despacho Institucional</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">Lcda. Luisa Pérez</span>
              <span className="text-[11px] text-amber-300 font-semibold">Dirección del Plantel</span>
            </div>
            <button 
              onClick={() => { localStorage.removeItem('usuarioActual'); router.push('/login'); }}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Encabezado */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 mb-3">
              🏛️ Despacho de Dirección
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Selección de Salones para Sello y Envío
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Selecciona un grado o sección para revisar los boletines aprobados por coordinación y autorizar su despacho a los representantes.
            </p>
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

        {/* Cuadrícula de Salones */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <span>📚</span> Aulas y Grados del Plantel
            </h2>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center h-48 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-amber-600 border-t-transparent"></div>
              <p className="text-xs font-semibold text-slate-500 mt-3">Cargando salones...</p>
            </div>
          ) : cursos.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
              <div className="text-3xl">📭</div>
              <p className="text-sm font-bold text-slate-600">No hay salones registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursos.map((curso) => {
                const isPrimaria = curso.nivel?.toLowerCase() === 'primaria';
                const alumnosDelCurso = alumnos.filter(a => a.curso_id === curso.id);
                const idsAlumnos = alumnosDelCurso.map(a => a.id);
                const aprobadosEnCurso = reportes.filter(r => idsAlumnos.includes(r.alumno_id) && r.estado === 'aprobado_coordinador' && r.periodo === filtroPeriodo).length;
                const enviadosEnCurso = reportes.filter(r => idsAlumnos.includes(r.alumno_id) && r.estado === 'enviado' && r.periodo === filtroPeriodo).length;

                return (
                  <div
                    key={curso.id}
                    onClick={() => router.push(`/dashboard/director/salon/${curso.id}`)}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-amber-300 transition-all duration-300 flex flex-col justify-between relative overflow-hidden cursor-pointer group"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-2 ${
                      isPrimaria 
                        ? 'bg-gradient-to-r from-amber-400 to-orange-400' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                    }`} />

                    <div>
                      <div className="flex justify-between items-center mb-4 mt-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          isPrimaria ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {curso.nivel}
                        </span>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {alumnosDelCurso.length} Alumnos
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                        {curso.nombre_grado}
                      </h3>
                      <div className="inline-block mt-1 font-extrabold text-sm text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        Sección "{curso.seccion}"
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Estado de Despacho</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        <span>🏛️</span> {aprobadosEnCurso} listos / {enviadosEnCurso} enviados
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}