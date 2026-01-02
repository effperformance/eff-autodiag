import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   Cliente OpenAI
========================= */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* =========================
   Utilidad de error estándar
========================= */
function errorResponse(
  status: number,
  message: string,
  detail?: string
) {
  return NextResponse.json(
    {
      ok: false,
      httpStatus: status,
      message,
      detalle: detail ?? null,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/* =========================
   POST /api/diagnosticar
========================= */
export async function POST(req: Request) {
  try {
    /* ---------- Validar API KEY ---------- */
    if (!process.env.OPENAI_API_KEY) {
      return errorResponse(
        500,
        "OPENAI_API_KEY no está configurada en el entorno"
      );
    }

    /* ---------- Leer body ---------- */
    const body = await req.json();

    const {
      codigoDTC,
      sintoma,
      vehiculo,
      notas,
      nivelDetalle = "normal",
    } = body ?? {};

    if (!codigoDTC && !sintoma) {
      return errorResponse(
        400,
        "Debe proporcionar al menos un código DTC o un síntoma"
      );
    }

    /* ---------- Prompt ---------- */
    const prompt = `
Eres un mecánico automotriz experto.

Analiza el siguiente caso y responde de forma profesional:

Código DTC: ${codigoDTC || "No especificado"}
Síntoma: ${sintoma || "No especificado"}
Vehículo: ${vehiculo || "No especificado"}
Notas adicionales: ${notas || "Ninguna"}

Nivel de detalle: ${nivelDetalle}

Incluye:
- Posibles causas (ordenadas por probabilidad)
- Pruebas recomendadas
- Errores comunes
- Recomendaciones de reparación
- Advertencias de seguridad
`;

    /* ---------- Llamada a OpenAI ---------- */
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Responde como un técnico automotriz profesional, claro y estructurado.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const respuesta = completion.choices[0]?.message?.content;

    if (!respuesta) {
      return errorResponse(
        500,
        "La IA no devolvió una respuesta válida"
      );
    }

    /* ---------- OK ---------- */
    return NextResponse.json({
      ok: true,
      respuesta,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("ERROR /api/diagnosticar:", err);

    return errorResponse(
      500,
      "Error interno en /api/diagnosticar",
      err?.message ?? String(err)
    );
  }
}
