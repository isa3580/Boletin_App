'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export const ANIO_ESCOLAR_FALLBACK = '2026-2027';

export function useAnioEscolar() {
  const [anioEscolar, setAnioEscolar] = useState(ANIO_ESCOLAR_FALLBACK);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await supabase
          .from('configuracion_sistema')
          .select('valor')
          .eq('clave', 'anio_escolar')
          .single();
        if (data?.valor) setAnioEscolar(data.valor);
      } catch {
        // mantengo el fallback
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  return { anioEscolar, cargando };
}
