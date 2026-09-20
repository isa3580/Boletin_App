import { NextResponse } from 'next/server';

const PROD_URL = 'https://isabella3580.app.n8n.cloud/webhook/enviar-boletines';
const TEST_URL = 'https://isabella3580.app.n8n.cloud/webhook-test/enviar-boletines';

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

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'No se recibieron datos para el despacho del boletín.' },
        { status: 400 }
      );
    }

    // 1. Intentar primero con la URL de producción
    let response = await fetch(PROD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // 2. Si devuelve 404, intentar con la URL de test
    if (response.status === 404) {
      response = await fetch(TEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error de n8n despacho [${response.status}]:`, errorText);
      return NextResponse.json(
        { 
          error: `n8n respondió con código (${response.status}). Asegúrate de que el webhook de envío esté escuchando o activo en n8n. Detalle: ${errorText}` 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Boletín despachado exitosamente.' });
  } catch (error: any) {
    console.error('Error en el proxy de despacho a n8n:', error);
    return NextResponse.json(
      { error: `No se pudo conectar con el servidor de n8n: ${error?.message || 'Error de conexión'}` },
      { status: 502 }
    );
  }
}
