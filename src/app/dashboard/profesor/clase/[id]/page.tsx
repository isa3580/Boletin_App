'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase';

export default function ListaAlumnosPorCursoPage() {
  const params = useParams();
  const cursoId = params.id;
  const router = useRouter();

  const [cursoInfo, setCursoInfo] = useState<any>(null);
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!cursoId) return;

    const cargarDatosSalon = async () => {
      try {
        setCargando(true);
        const idNumerico = Number(cursoId);

        // 1. Consultar la información del curso/grado
        const { data: cursoData, error: cursoError } = await supabase
          .from('cursos')
          .select('*')
          .eq('id', idNumerico)
          .single();

        if (cursoError) throw cursoError;
        setCursoInfo(cursoData);

        // 2. Consultar los alumnos inscritos en este curso
        const { data: alumnosData, error: alumnosError } = await supabase
          .from('alumnos')
          .select('*')
          .eq('curso_id', idNumerico);

        if (alumnosError) throw alumnosError;
        setEstudiantes(alumnosData || []);

      } catch (error: any) {
        console.error("Error al cargar el salón:", error.message || error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosSalon();
  }, [cursoId]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        
        <header className="mb-6 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <button 
              onClick={() => router.push('/dashboard/profesor')}
              className="text-xs font-semibold text-blue-600 hover:underline mb-1 block"
            >
              ← Volver a Mis Salones
            </button>
            <h1 className="text-xl font-bold text-slate-800">
              {cursoInfo ? `${cursoInfo.nombre_grado} "${cursoInfo.seccion}"` : 'Cargando salón...'}
            </h1>
            <p className="text-xs text-slate-500 capitalize">
              Nivel: {cursoInfo?.nivel || ''}
            </p>
          </div>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Estudiantes Inscritos en el Salón</h2>
          </div>

          {cargando ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {estudiantes.map((estudiante) => (
                <div key={estudiante.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{estudiante.nombre} {estudiante.apellido}</p>
                    <p className="text-xs text-slate-400">ID Expediente: {estudiante.id.slice(0, 8)}...</p>
                  </div>
                  
                  <button
                    onClick={() => router.push(`/dashboard/profesor/clase/${cursoId}/alumno/${estudiante.id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    Evaluar Alumno (Integral)
                  </button>
                </div>
              ))}

              {estudiantes.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No hay estudiantes registrados en este curso.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}