'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter(); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    try {
      // Consulta real a la base de datos
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('rol, nombre')
        .eq('correo', email)
        .single();

      if (error || !usuario) {
        setErrorMsg('El correo ingresado no existe en el sistema.');
        return;
      }
      
      // Enrutamiento automático según el rol en la base de datos
      switch (usuario.rol) {
        case 'coordinador':
          router.push('/dashboard/coordinador');
          break;
        case 'director':
          router.push('/dashboard/director');
          break;
        case 'admin':
          router.push('/dashboard/admin');
          break;
        default:
          router.push('/dashboard/profesor'); 
          break;
      }
    } catch (err) {
      setErrorMsg('Error de conexión con el servidor.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full border border-slate-100">
        
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-blue-600 text-white p-3 rounded-xl mb-3 shadow-sm">
            <svg xmlns="http://w3.org" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">BoletinesApp</h1>
          <p className="text-sm text-slate-500 mt-1">Sistema de Evaluación Cualitativa con IA</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Mensaje de Error */}
          {errorMsg && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 text-center">
              {errorMsg}
            </div>
          )}

          {/* Correo Electrónico */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="carmen@colegio.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Botón de Ingreso */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all shadow-sm shadow-blue-200 hover:shadow-none"
          >
            Ingresar al Sistema
          </button>
        </form>

      </div>
    </div>
  );
}