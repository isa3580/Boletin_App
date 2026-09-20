import html2pdf from 'html2pdf.js';
import { LOGO_BASE64 } from './logoBase64';

function sanitizeDocumentForPdf(doc: Document) {
  // 1. Eliminar todas las hojas de estilo externas y etiquetas <style> de Tailwind v4 que contienen oklab / oklch
  const styles = doc.querySelectorAll('style, link[rel="stylesheet"]');
  styles.forEach((el) => el.remove());

  // 2. Inyectar estilos limpios básicos y 100% compatibles con html2canvas
  const cleanStyle = doc.createElement('style');
  cleanStyle.textContent = `
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      background-color: #ffffff !important;
      color: #1e293b !important;
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
  `;
  doc.head.appendChild(cleanStyle);

  // 3. Limpiar cualquier clase de Tailwind o atributo class en los elementos clonados
  doc.querySelectorAll('*').forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.removeAttribute('class');
    
    // Limpiar cualquier estilo inline que pudiera tener funciones de color modernas no soportadas
    const styleAttr = htmlEl.getAttribute('style');
    if (styleAttr && /(?:oklab|oklch|lab)\([^)]+\)/gi.test(styleAttr)) {
      const sanitized = styleAttr.replace(/(?:oklab|oklch|lab)\([^)]+\)/gi, '#000000');
      htmlEl.setAttribute('style', sanitized);
    }
  });
}

export async function generarPdfBase64(elementoHtml: HTMLElement): Promise<string> {
  const opciones = {
    margin:       [8, 8, 8, 8] as [number, number, number, number],
    filename:     'boletin.pdf',
    image:        { type: 'jpeg' as const, quality: 0.98 },
    html2canvas:  {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (doc: Document) => {
        sanitizeDocumentForPdf(doc);
      }
    },
    jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' as const }
  };

  const pdfBlob = await html2pdf().set(opciones).from(elementoHtml).outputPdf('blob');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(pdfBlob);
  });
}

/**
 * Mensaje institucional formal y estructurado para el correo del representante (usado en n8n)
 */
export function construirMensajeRepresentante(
  nombreAlumno: string,
  periodo: string,
  anioEscolar: string,
  nombreGrado: string
): string {
  return `Estimado(a) Representante de ${nombreAlumno}:

Reciba un cordial y fraternal saludo de parte del personal directivo, docente y administrativo de la U.E. Colegio San Francisco.

Por medio de la presente comunicación oficial, nos complace hacerle entrega formal del Boletín Informativo del Rendimiento Estudiantil correspondiente al ${periodo} del Año Escolar ${anioEscolar}, cursado en el ${nombreGrado}.

Adjunto a este correo encontrará el documento oficial en formato PDF, debidamente certificado con las calificaciones de las áreas de formación y el informe pedagógico descriptivo de su representado.

Le invitamos a revisar detalladamente el rendimiento y las orientaciones brindadas por el equipo docente. En caso de dudas o requerimientos pedagógicos, puede comunicarse con la Coordinación del plantel.

Atentamente,

U.E. COLEGIO SAN FRANCISCO
Dirección y Coordinación Pedagógica
"Educando con excelencia y valores para el futuro"`;
}

/**
 * Función auxiliar para generar el HTML estático idéntico al componente BoletinDocumento.
 * Ideal para procesar de forma masiva sin necesidad de renderizar en pantalla.
 */
export function generarHtmlBoletin(datos: {
  nombreInstitucion?: string;
  codigoPlantel?: string;
  rifPlantel?: string;
  nombreAlumno: string;
  nombreGrado: string;
  seccion: string;
  nivel: string;
  periodo: string;
  anioEscolar: string;
  calificaciones: Array<{ materia: string; nota: string; apreciacion?: string }>;
  informeCualitativo?: string;
  nombreDocente?: string;
  rolDocente?: string;
  nombreCoordinador?: string;
  coordinacionAprobada?: boolean;
  nombreDirector?: string;
  direccionSellada?: boolean;
}): string {
  const {
    nombreInstitucion = 'UNIDAD EDUCATIVA COLEGIO SAN FRANCISCO',
    codigoPlantel = 'DEA-001234',
    rifPlantel = 'J-30492819-0',
    nombreAlumno,
    nombreGrado,
    seccion,
    nivel,
    periodo,
    anioEscolar,
    calificaciones,
    informeCualitativo,
    nombreDocente = 'Docente Asignado',
    rolDocente,
    nombreCoordinador = 'Lcdo. Roberto Gómez',
    coordinacionAprobada = true,
    nombreDirector = 'Lcda. Luisa Pérez',
    direccionSellada = true,
  } = datos;

  const isPrimaria = nivel?.toLowerCase() === 'primaria';
  const rolDocenteCalculado = rolDocente || (isPrimaria ? 'Docente de Aula Titular' : 'Profesor Guía de Sección');

  const califRows = calificaciones.map((cal, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    const apreciacion = cal.apreciacion || (isPrimaria ? 'Registrado' : 'Puntaje Oficial');
    return `
      <tr style="background-color:${bg};border-bottom:1px solid #e2e8f0">
        <td style="padding:8px 12px;font-weight:700;color:#1e293b">${cal.materia}</td>
        <td style="padding:8px 12px;text-align:center;font-weight:900;font-size:12.5px;color:#1d4ed8">${cal.nota || '-'}</td>
        <td style="padding:8px 12px;text-align:center;font-size:10.5px;color:#64748b;font-weight:600">${apreciacion}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;background-color:#ffffff;padding:32px 36px;max-width:740px;margin:0 auto;box-sizing:border-box;line-height:1.45">
      
      <!-- MEMBRETE OFICIAL INSTITUCIONAL CON LOGO -->
      <div style="border-bottom:2.5px solid #0f172a;padding-bottom:14px;margin-bottom:18px;display:flex;align-items:center;justify-content:center;gap:16px">
        <img src="${LOGO_BASE64}" alt="Escudo Oficial" style="width:88px;height:88px;object-fit:cover;border-radius:50%;border:2px solid #0f172a;box-shadow:0 2px 8px rgba(15,23,42,0.10);flex-shrink:0" />
        <div style="text-align:center;flex:1">
          <p style="font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:1.4px;color:#64748b;margin:0 0 3px 0">
            REPÚBLICA BOLIVARIANA DE VENEZUELA • MINISTERIO DEL PODER POPULAR PARA LA EDUCACIÓN
          </p>
          <h2 style="font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:-0.2px;color:#0f172a;margin:0 0 2px 0">
            ${nombreInstitucion}
          </h2>
          <p style="font-size:10px;font-weight:600;color:#475569;margin:0 0 8px 0">
            Código Plantel: ${codigoPlantel} • RIF: ${rifPlantel} • Fundado 1968
          </p>
          <div>
            <span style="display:inline-block;background-color:#f1f5f9;color:#0f172a;font-size:10.5px;font-weight:900;padding:3px 16px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.8px;border:1px solid #cbd5e1">
              Boletín Informativo de Rendimiento Estudiantil
            </span>
          </div>
        </div>
      </div>

      <!-- DATOS DEL ESTUDIANTE -->
      <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr 1fr;gap:10px;background-color:#f8fafc;padding:12px 14px;border-radius:12px;border:1px solid #e2e8f0;font-size:11px;margin-bottom:18px">
        <div>
          <span style="font-size:9px;text-transform:uppercase;font-weight:800;color:#94a3b8;display:block">Estudiante:</span>
          <span style="font-weight:900;color:#0f172a;font-size:12px">${nombreAlumno}</span>
        </div>
        <div>
          <span style="font-size:9px;text-transform:uppercase;font-weight:800;color:#94a3b8;display:block">Grado / Sección:</span>
          <span style="font-weight:800;color:#1e293b">${nombreGrado} &quot;${seccion}&quot;</span>
        </div>
        <div>
          <span style="font-size:9px;text-transform:uppercase;font-weight:800;color:#94a3b8;display:block">Nivel Educativo:</span>
          <span style="font-weight:800;color:#1e293b;text-transform:capitalize">Educación ${nivel}</span>
        </div>
        <div>
          <span style="font-size:9px;text-transform:uppercase;font-weight:800;color:#94a3b8;display:block">Período / Año:</span>
          <span style="font-weight:800;color:#1e293b">${periodo} • ${anioEscolar}</span>
        </div>
      </div>

      <!-- TABLA DE CALIFICACIONES -->
      <div style="margin-bottom:18px">
        <h4 style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.6px;color:#1e293b;margin:0 0 6px 0">
          Calificaciones por Asignatura
        </h4>
        <div style="border:1px solid #cbd5e1;border-radius:10px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left">
            <thead>
              <tr style="background-color:#f1f5f9;border-bottom:1.5px solid #cbd5e1">
                <th style="padding:8px 12px;font-weight:900;text-transform:uppercase;color:#334155">Área de Formación / Asignatura</th>
                <th style="padding:8px 12px;text-align:center;width:110px;font-weight:900;text-transform:uppercase;color:#334155">Calificación</th>
                <th style="padding:8px 12px;text-align:center;width:160px;font-weight:900;text-transform:uppercase;color:#334155">Apreciación Pedagógica</th>
              </tr>
            </thead>
            <tbody>
              ${califRows || '<tr><td colspan="3" style="padding:16px;text-align:center;color:#94a3b8">Sin calificaciones registradas</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- INFORME CUALITATIVO -->
      <div style="margin-bottom:22px">
        <h4 style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.6px;color:#1e293b;margin:0 0 6px 0">
          Informe Descriptivo del Rendimiento Estudiantil
        </h4>
        <div style="padding:14px 16px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;font-size:11px;line-height:1.65;color:#1e293b">
          <p style="margin:0;white-space:pre-wrap;text-align:justify;font-weight:500">
            &quot;${informeCualitativo || 'Sin informe registrado.'}&quot;
          </p>
        </div>
      </div>

      <!-- FIRMAS Y SELLO -->
      <div style="border-top:1px solid #e2e8f0;padding-top:18px;margin-top:18px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;text-align:center;font-size:10.5px;align-items:flex-end">
        <div>
          <div style="height:42px;border-bottom:1px solid #94a3b8;margin:0 12px 6px 12px"></div>
          <p style="font-weight:800;color:#0f172a;margin:0 0 2px 0">${nombreDocente}</p>
          <p style="font-size:9px;color:#64748b;margin:0">${rolDocenteCalculado}</p>
        </div>
        <div>
          <div style="height:42px;border-bottom:1px solid #94a3b8;margin:0 12px 6px 12px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px">
            ${coordinacionAprobada ? '<span style="font-size:9px;font-weight:800;color:#4338ca;background-color:#e0e7ff;padding:1px 8px;border-radius:6px;border:1px solid #c7d2fe">✓ Aprobado Coord.</span>' : ''}
          </div>
          <p style="font-weight:800;color:#0f172a;margin:0 0 2px 0">${nombreCoordinador}</p>
          <p style="font-size:9px;color:#64748b;margin:0">Coordinación Pedagógica</p>
        </div>
        <div style="position:relative">
          <div style="height:42px;border-bottom:${direccionSellada ? '1.5px solid #d97706' : '1px dashed #94a3b8'};margin:0 12px 6px 12px;display:flex;align-items:center;justify-content:center;position:relative">
            ${direccionSellada ? `
              <div style="position:absolute;top:-18px;width:68px;height:68px;border:2px solid #b45309;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background-color:rgba(254,243,199,0.45);transform:rotate(-8deg);box-sizing:border-box">
                <span style="font-size:6px;font-weight:900;text-transform:uppercase;color:#78350f;letter-spacing:0.3px;text-align:center">U.E. SAN FRANCISCO</span>
                <span style="font-size:5.5px;font-weight:800;color:#b45309;margin:1px 0">DIRECCIÓN</span>
                <span style="font-size:4.5px;font-weight:700;color:#0f172a">SELLADO Y FIRMADO</span>
              </div>
            ` : '<span style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">Sello Oficial</span>'}
          </div>
          <p style="font-weight:800;color:#0f172a;margin:0 0 2px 0">${nombreDirector}</p>
          <p style="font-size:9px;color:#64748b;margin:0">Dirección del Plantel</p>
        </div>
      </div>

      <div style="margin-top:16px;text-align:center;font-size:8.5px;color:#94a3b8;border-top:1px dotted #e2e8f0;padding-top:6px">
        Documento oficial avalado por el Sistema Escolar Integral • ${nombreInstitucion} • Generado automáticamente
      </div>
    </div>
  `;
}
