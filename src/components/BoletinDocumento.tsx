'use client';

import React from 'react';
import { LOGO_BASE64 } from '../lib/logoBase64';

export interface CalificacionBoletin {
  materia: string;
  nota: string;
  apreciacion?: string;
}

export interface BoletinDocumentoProps {
  // Datos del colegio / institución
  nombreInstitucion?: string;
  codigoPlantel?: string;
  rifPlantel?: string;
  
  // Datos del estudiante y salón
  nombreAlumno: string;
  nombreGrado: string;
  seccion: string;
  nivel: 'primaria' | 'secundaria' | string;
  correoRepresentante?: string;
  periodo: string;
  anioEscolar: string;

  // Calificaciones
  calificaciones: CalificacionBoletin[];

  // Informe Cualitativo
  informeCualitativo?: string;

  // Firmas y sellos
  nombreDocente?: string;
  rolDocente?: string; // 'Docente de Aula Titular' | 'Profesor Guía'
  nombreCoordinador?: string;
  coordinacionAprobada?: boolean;
  nombreDirector?: string;
  direccionSellada?: boolean; // muestra el sello oficial de dirección
}

export const BoletinDocumento: React.FC<BoletinDocumentoProps> = ({
  nombreInstitucion = 'UNIDAD EDUCATIVA COLEGIO SAN FRANCISCO',
  codigoPlantel = 'DEA-001234',
  rifPlantel = 'J-30492819-0',
  nombreAlumno,
  nombreGrado,
  seccion,
  nivel,
  correoRepresentante,
  periodo,
  anioEscolar,
  calificaciones,
  informeCualitativo,
  nombreDocente = 'Docente Asignado',
  rolDocente,
  nombreCoordinador = 'Lcdo. Roberto Gómez',
  coordinacionAprobada = true,
  nombreDirector = 'Lcda. Luisa Pérez',
  direccionSellada = false,
}) => {
  const isPrimaria = nivel?.toLowerCase() === 'primaria';
  const rolDocenteCalculado = rolDocente || (isPrimaria ? 'Docente de Aula Titular' : 'Profesor Guía de Sección');

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: '#1e293b',
        backgroundColor: '#ffffff',
        padding: '32px 36px',
        maxWidth: '740px',
        margin: '0 auto',
        boxSizing: 'border-box',
        lineHeight: 1.45,
      }}
    >
      {/* 1. MEMBRETE OFICIAL INSTITUCIONAL CON LOGO */}
      <div
        style={{
          borderBottom: '2.5px solid #0f172a',
          paddingBottom: '14px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <img
          src={LOGO_BASE64}
          alt="Escudo Oficial Escuela San Francisco"
          style={{
            width: '88px',
            height: '88px',
            objectFit: 'cover',
            borderRadius: '50%',
            border: '2px solid #0f172a',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.10)',
            flexShrink: 0,
          }}
        />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p
            style={{
              fontSize: '8.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.4px',
              color: '#64748b',
              margin: '0 0 3px 0',
            }}
          >
            REPÚBLICA BOLIVARIANA DE VENEZUELA • MINISTERIO DEL PODER POPULAR PARA LA EDUCACIÓN
          </p>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '-0.2px',
              color: '#0f172a',
              margin: '0 0 2px 0',
            }}
          >
            {nombreInstitucion}
          </h2>
          <p
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#475569',
              margin: '0 0 8px 0',
            }}
          >
            Código Plantel: {codigoPlantel} • RIF: {rifPlantel} • Fundado 1968
          </p>
          <div>
            <span
              style={{
                display: 'inline-block',
                backgroundColor: '#f1f5f9',
                color: '#0f172a',
                fontSize: '10.5px',
                fontWeight: 900,
                padding: '3px 16px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                border: '1px solid #cbd5e1',
              }}
            >
              Boletín Informativo de Rendimiento Estudiantil
            </span>
          </div>
        </div>
      </div>

      {/* 2. FICHA DE DATOS DEL ESTUDIANTE */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
          gap: '10px',
          backgroundColor: '#f8fafc',
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          fontSize: '11px',
          marginBottom: '18px',
        }}
      >
        <div>
          <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', display: 'block' }}>
            Estudiante:
          </span>
          <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '12px' }}>
            {nombreAlumno}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', display: 'block' }}>
            Grado / Sección:
          </span>
          <span style={{ fontWeight: 800, color: '#1e293b' }}>
            {nombreGrado} &quot;{seccion}&quot;
          </span>
        </div>
        <div>
          <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', display: 'block' }}>
            Nivel Educativo:
          </span>
          <span style={{ fontWeight: 800, color: '#1e293b', textTransform: 'capitalize' }}>
            Educación {nivel}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', display: 'block' }}>
            Período / Año:
          </span>
          <span style={{ fontWeight: 800, color: '#1e293b' }}>
            {periodo} • {anioEscolar}
          </span>
        </div>
      </div>

      {/* 3. TABLA OFICIAL DE CALIFICACIONES */}
      <div style={{ marginBottom: '18px' }}>
        <h4
          style={{
            fontSize: '11px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#1e293b',
            margin: '0 0 6px 0',
          }}
        >
          Calificaciones por Asignatura
        </h4>
        <div
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>
                <th style={{ padding: '8px 12px', fontWeight: 900, textTransform: 'uppercase', color: '#334155' }}>
                  Área de Formación / Asignatura
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '110px', fontWeight: 900, textTransform: 'uppercase', color: '#334155' }}>
                  Calificación
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '160px', fontWeight: 900, textTransform: 'uppercase', color: '#334155' }}>
                  Apreciación Pedagógica
                </th>
              </tr>
            </thead>
            <tbody>
              {calificaciones.length > 0 ? (
                calificaciones.map((cal, idx) => (
                  <tr
                    key={idx}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: idx === calificaciones.length - 1 ? 'none' : '1px solid #e2e8f0',
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e293b' }}>
                      {cal.materia}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        fontWeight: 900,
                        fontSize: '12.5px',
                        color: '#1d4ed8',
                      }}
                    >
                      {cal.nota || '-'}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        fontSize: '10.5px',
                        color: '#64748b',
                        fontWeight: 600,
                      }}
                    >
                      {cal.apreciacion || (isPrimaria ? 'Registrado' : 'Puntaje Oficial')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    No hay calificaciones registradas para este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. INFORME CUALITATIVO DEL ESTUDIANTE */}
      <div style={{ marginBottom: '22px' }}>
        <h4
          style={{
            fontSize: '11px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#1e293b',
            margin: '0 0 6px 0',
          }}
        >
          Informe Descriptivo del Rendimiento Estudiantil
        </h4>
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            fontSize: '11px',
            lineHeight: '1.65',
            color: '#1e293b',
          }}
        >
          {informeCualitativo && informeCualitativo.trim() !== '' && informeCualitativo !== 'Sin informe redactado aún.' ? (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', textAlign: 'justify', fontWeight: 500 }}>
              &quot;{informeCualitativo}&quot;
            </p>
          ) : (
            <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
              Aún no se ha redactado el informe descriptivo cualitativo del estudiante para este período pedagógico.
            </p>
          )}
        </div>
      </div>

      {/* 5. BLOQUE DE FIRMAS Y SELLOS OFICIALES */}
      <div
        style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: '18px',
          marginTop: '18px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '16px',
          textAlign: 'center',
          fontSize: '10.5px',
          alignItems: 'flex-end',
        }}
      >
        {/* Firma 1: Docente */}
        <div>
          <div style={{ height: '42px', borderBottom: '1px solid #94a3b8', margin: '0 12px 6px 12px' }}></div>
          <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
            {nombreDocente}
          </p>
          <p style={{ fontSize: '9px', color: '#64748b', margin: 0 }}>
            {rolDocenteCalculado}
          </p>
        </div>

        {/* Firma 2: Coordinador */}
        <div>
          <div
            style={{
              height: '42px',
              borderBottom: '1px solid #94a3b8',
              margin: '0 12px 6px 12px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '2px',
            }}
          >
            {coordinacionAprobada && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#4338ca',
                  backgroundColor: '#e0e7ff',
                  padding: '1px 8px',
                  borderRadius: '6px',
                  border: '1px solid #c7d2fe',
                }}
              >
                ✓ Aprobado Coord.
              </span>
            )}
          </div>
          <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
            {nombreCoordinador}
          </p>
          <p style={{ fontSize: '9px', color: '#64748b', margin: 0 }}>
            Coordinación Pedagógica
          </p>
        </div>

        {/* Firma 3: Dirección / Sello */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              height: '42px',
              borderBottom: direccionSellada ? '1.5px solid #d97706' : '1px dashed #94a3b8',
              margin: '0 12px 6px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {direccionSellada ? (
              <div
                style={{
                  position: 'absolute',
                  top: '-18px',
                  width: '68px',
                  height: '68px',
                  border: '2px solid #b45309',
                  borderRadius: '50%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(254, 243, 199, 0.45)',
                  transform: 'rotate(-8deg)',
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: '6px', fontWeight: 900, textTransform: 'uppercase', color: '#78350f', letterSpacing: '0.3px', textAlign: 'center' }}>
                  U.E. SAN FRANCISCO
                </span>
                <span style={{ fontSize: '5.5px', fontWeight: 800, color: '#b45309', margin: '1px 0' }}>
                  DIRECCIÓN
                </span>
                <span style={{ fontSize: '4.5px', fontWeight: 700, color: '#0f172a' }}>
                  SELLADO Y FIRMADO
                </span>
              </div>
            ) : (
              <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                Sello Oficial
              </span>
            )}
          </div>
          <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
            {nombreDirector}
          </p>
          <p style={{ fontSize: '9px', color: '#64748b', margin: 0 }}>
            Dirección del Plantel
          </p>
        </div>
      </div>

      {/* PIE INSTITUCIONAL DISCRETO */}
      <div
        style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '8.5px',
          color: '#94a3b8',
          borderTop: '1px dotted #e2e8f0',
          paddingTop: '6px',
        }}
      >
        Documento oficial avalado por el Sistema Escolar Integral • {nombreInstitucion} • Generado automáticamente
      </div>
    </div>
  );
};

