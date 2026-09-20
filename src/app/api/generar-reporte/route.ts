import { NextResponse } from 'next/server';

const PROD_URL = 'https://isabella3580.app.n8n.cloud/webhook/reporte-alumno';
const TEST_URL = 'https://isabella3580.app.n8n.cloud/webhook-test/reporte-alumno';

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la petición debe ser un objeto JSON válido.' },
        { status: 400 }
      );
    }

    if (!body || !body.alumno || !body.etiquetas || !Array.isArray(body.etiquetas) || body.etiquetas.length === 0) {
      return NextResponse.json(
        { error: 'Debes proporcionar el nombre del estudiante y al menos un indicador o etiqueta formativa.' },
        { status: 400 }
      );
    }

    // 1. Intentar primero con la URL de producción (cuando el workflow está en Active)
    let response = await fetch(PROD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // 2. Si devuelve 404 (no está activo en producción), intentar automáticamente con la URL de test
    if (response.status === 404) {
      response = await fetch(TEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error de n8n reporte [${response.status}]:`, errorText);
      return NextResponse.json(
        { 
          error: `n8n respondió con código (${response.status}). Asegúrate de que el flujo de IA en n8n esté activo (Active) o presiona 'Listen for test event'. Detalle: ${errorText}` 
        },
        { status: response.status }
      );
    }

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { textoCualitativo: rawText };
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error en el proxy de reporte IA:', error);
    return NextResponse.json(
      { error: `No se pudo conectar con el servicio de IA en n8n: ${error?.message || 'Error de conexión'}` },
      { status: 502 }
    );
  }
}
