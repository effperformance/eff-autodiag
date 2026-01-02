import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Helper de error uniforme
 */
function errorResponse(
  status: number,
  message: string,
  detail?: any
) {
  return NextResponse.json(
    {
      ok: false,
      httpStatus: status,
      message,
      detail,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    // 🔐 Validar API KEY EN RUNTIME (NO EN BUILD)
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return errorResponse(
        500,
        "OPENAI_API_KEY no está definida en Vercel"
      );
    }

    // ✅ Crear cliente SOLO EN RUNTIME
    const client = new OpenAI({ apiKey });

    const body = await req.json();

    const {
      dtc,
      symptom,
      vehicle,
      notes,
      level = "normal",
    } = body || {};

    if (!dtc && !symptom) {
      return errorResponse(
        400,
        "Debe proporcionar al menos un código DTC o un síntoma"
      );
    }

    // 🧠 Prompt profesional base
    const prompt = `
Eres un técnico automotriz master diagnosticador.
Analiza el siguiente caso y responde en español técnico profesional.

Código DTC: ${dtc || "No especificado"}
Síntoma: ${symptom || "No especificado"}
Vehículo: ${vehicle || "No especificado"}
Notas adicionales: ${notes || "Ninguna"}

Nivel de detalle: ${level}

Incluye:
- Posibles causas (ordenadas por probabilidad)
- Pruebas recomendadas
- Datos esperados (voltajes, presiones, valores típicos)
- Errores comunes de diagnóstico
- Recomendación final
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const output =
      response.output_text ||
      "No se pudo generar diagnóstico.";

    return NextResponse.json({
      ok: true,
      diagnosis: output,
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error("Diagnosticar API error:", err);
    return errorResponse(
      500,
      "Error interno al generar diagnóstico",
      err?.message
    );
  }
}
