'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

interface CursoAsignado {
  curso_id: number;
  cursos: {
    id: number;
    nombre_grado: string;
    seccion: string;
    nivel: string;
  };
}

export default function ProfesorDashboard() {
  const [cursos, setCursos] = useState<CursoAsignado[]>([]);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const cargarMisCursos = async () => {
      try {
        const profesorId = '10000000-0000-0000-0000-000000000001'; // Carmen de prueba

        const { data, error } = await supabase
          .from('carga_academica')
          .select(`
            curso_id,
            cursos (id, nombre_grado, seccion, nivel)
          `)
          .eq('profesor_id', profesorId);

        if (error) throw error;

        if (data) {
          const cursosUnicos = Array.from(
            new Map(data.map(item => [(item.cursos as any).id, item])).values()
          );
          setCursos(cursosUnicos as unknown as CursoAsignado[]);
        }
      } catch (error) {
        console.error("Error al cargar los cursos:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarMisCursos();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Mis Salones Asignados</h1>
          <p className="text-sm text-slate-500 mt-1">Selecciona un grado y sección para ver la lista de estudiantes.</p>
        </header>

        {cargando ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cursos.map((item) => (
              <div 
                key={item.cursos.id} 
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                // Redirige usando la ruta 'clase'
                onClick={() => router.push(`/dashboard/profesor/clase/${item.cursos.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-lg text-xs uppercase tracking-wider">
                    {item.cursos.nivel}
                  </div>
                  <svg xmlns="http://www.w3.org" className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                
                <h2 className="text-2xl font-extrabold text-slate-800 mb-1">
                  {item.cursos.nombre_grado} "{item.cursos.seccion}"
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  Haz clic para ver estudiantes y evaluar
                </p>
              </div>
            ))}
            
            {cursos.length === 0 && (
              <div className="col-span-full text-center p-8 bg-white rounded-2xl border border-slate-200 text-slate-500">
                No tienes salones asignados en este momento.
              </div>
            )}
          </div>
        )}
        
      </div>
    </div>
  );
}