export const PERIODOS = [
  '1er Momento',
  '2do Momento',
  '3er Momento'
] as const;

export type Periodo = typeof PERIODOS[number];

export const ANIO_ESCOLAR = '2024-2025';
