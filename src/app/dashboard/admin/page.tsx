'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

interface UsuarioItem {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  created_at?: string;
}

interface CursoItem {
  id: number;
  nombre_grado: string;
  seccion: string;
  nivel: string;
}

interface MateriaItem {
  id: number;
  nombre_materia: string;
}

export default function AdminDashboard() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [cursos, setCursos] = useState<CursoItem[]>([]);
  const [materias, setMaterias] = useState<MateriaItem[]>([]);
  const [totalAlumnos, setTotalAlumnos] = useState(0);
  const [pestañaActiva, setPestañaActiva] = useState<'usuarios' | 'cursos' | 'materias'>('usuarios');
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const cargarDatosAdmin = async () => {
      try {
        setCargando(true);

        // 1. Usuarios del sistema
        const { data: usersData } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });
        setUsuarios(usersData || []);

        // 2. Cursos
        const { data: cursosData } = await supabase.from('cursos').select('*').order('id', { ascending: true });
        setCursos(cursosData || []);

        // 3. Materias
        const { data: materiasData } = await supabase.from('materias').select('*').order('id', { ascending: true });
        setMaterias(materiasData || []);

        // 4. Conteo de alumnos
        const { count: alumnosCount } = await supabase.from('alumnos').select('*', { count: 'exact', head: true });
        setTotalAlumnos(alumnosCount || 0);

      } catch (error) {
        console.error("Error al cargar datos de administración:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosAdmin();
  }, []);

  const getRolBadge = (rol: string) => {
    switch (rol.toLowerCase()) {
      case 'director':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'coordinador':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-amber-50/20 text-slate-800 pb-12">
      
      {/* Barra de Navegación Institucional Escolar */}
      <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 text-lg">
              🏫
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">U.E. COLEGIO SAN FRANCISCO</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-purple-400/20 text-purple-300 rounded-full border border-purple-400/30">
                  SISTEMAS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Administración Central del Sistema • Control y Configuración</p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">Administrador General</span>
              <span className="text-[11px] text-purple-300 font-semibold">Control de Estudios & IT</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-inner border-2 border-slate-700">
              AD
            </div>
            <div className="pl-2 border-l border-slate-700">
              <button 
                onClick={() => { localStorage.removeItem('usuarioActual'); router.push('/login'); }}
                title="Cerrar sesión"
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Salir
              </button>
            </div>
          </div>

        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Banner de Bienvenida Admin */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold text-amber-300">
                <span>⚙️</span>
                <span>Panel de Infraestructura Escolar</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-emerald-300">Sistema Operativo</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Administración General del Plantel
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Gestión de cuentas institucionales, configuración de grados, secciones, asignaturas curriculares y supervisión de las integraciones de inteligencia artificial y base de datos.
              </p>
            </div>

            {/* Ficha Resumen de Sistema */}
            <div className="grid grid-cols-2 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 min-w-[260px]">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Usuarios</span>
                <span className="text-2xl font-black text-white">{usuarios.length}</span>
                <span className="text-[10px] text-purple-300 block font-medium">Registrados</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Salones</span>
                <span className="text-2xl font-black text-white">{cursos.length}</span>
                <span className="text-[10px] text-amber-300 block font-medium">Aulas activas</span>
              </div>
              <div className="pt-2 border-t border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Materias</span>
                <span className="text-sm font-bold text-slate-200">{materias.length} en Pensum</span>
              </div>
              <div className="pt-2 border-t border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Alumnos</span>
                <span className="text-sm font-bold text-emerald-300">{totalAlumnos} Inscritos</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tarjetas de Estadísticas Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-xl font-bold">
              👥
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cuentas Activas</p>
              <p className="text-2xl font-black text-slate-900">{usuarios.length}</p>
              <p className="text-[11px] text-purple-600 font-semibold">Personal Escolar</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold">
              🏫
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cursos Escolares</p>
              <p className="text-2xl font-black text-slate-900">{cursos.length}</p>
              <p className="text-[11px] text-blue-600 font-semibold">Grados y Secciones</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl font-bold">
              📖
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Asignaturas</p>
              <p className="text-2xl font-black text-slate-900">{materias.length}</p>
              <p className="text-[11px] text-emerald-600 font-semibold">Plan de Estudio</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl font-bold">
              🤖
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Motor de IA</p>
              <p className="text-xl font-black text-emerald-600">n8n Cloud</p>
              <p className="text-[11px] text-slate-500 font-semibold">Webhook Activo</p>
            </div>
          </div>

        </div>

        {/* Pestañas de Gestión Escolar */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPestañaActiva('usuarios')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  pestañaActiva === 'usuarios'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>👥</span>
                <span>Usuarios y Roles</span>
              </button>

              <button
                onClick={() => setPestañaActiva('cursos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  pestañaActiva === 'cursos'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>🏫</span>
                <span>Cursos ({cursos.length})</span>
              </button>

              <button
                onClick={() => setPestañaActiva('materias')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  pestañaActiva === 'materias'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>📖</span>
                <span>Pensum ({materias.length})</span>
              </button>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              Gestión Oficial de Base de Datos
            </span>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="animate-spin rounded-full h-9 w-9 border-3 border-purple-600 border-t-transparent"></div>
              <p className="text-xs font-semibold text-slate-500 mt-3">Cargando registros del sistema...</p>
            </div>
          ) : (
            <div>
              {/* TAB 1: USUARIOS */}
              {pestañaActiva === 'usuarios' && (
                <div className="divide-y divide-slate-100">
                  {usuarios.map((usr) => (
                    <div key={usr.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-black flex items-center justify-center text-xs">
                          {usr.nombre?.charAt(0)}{usr.apellido?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-slate-900">{usr.nombre} {usr.apellido}</p>
                          <p className="text-xs text-slate-400 font-mono">{usr.correo}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${getRolBadge(usr.rol)}`}>
                          {usr.rol}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono hidden md:inline-block">
                          ID: {usr.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: CURSOS */}
              {pestañaActiva === 'cursos' && (
                <div className="divide-y divide-slate-100">
                  {cursos.map((c) => (
                    <div key={c.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🎒</span>
                        <div>
                          <p className="font-extrabold text-sm text-slate-900">{c.nombre_grado} Sección "{c.seccion}"</p>
                          <p className="text-xs text-slate-400 capitalize">Nivel: {c.nivel}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
                        ID: {c.id}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: MATERIAS */}
              {pestañaActiva === 'materias' && (
                <div className="divide-y divide-slate-100">
                  {materias.map((m) => (
                    <div key={m.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📚</span>
                        <div>
                          <p className="font-extrabold text-sm text-slate-900">{m.nombre_materia}</p>
                          <p className="text-xs text-slate-400">Asignatura Curricular Obligatoria</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
                        Código #{m.id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </section>

      </main>
    </div>
  );
}
