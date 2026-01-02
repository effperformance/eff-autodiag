import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   Helpers
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
      detail,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/* =========================
   API Handler
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dtc, sintoma, vehiculo, notas, nivelDetalle } = body;

    if (!dtc && !sintoma) {
      return errorResponse(
        400,
        "Debe proporcionar al menos un código DTC o un síntoma"
      );
    }

    // 🔑 Crear OpenAI AQUÍ (runtime, no build)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return errorResponse(
        500,
        "OPENAI_API_KEY no está definida en el entorno"
      );
    }

    const client = new OpenAI({ apiKey });

    const prompt = `
Eres un técnico automotriz profesional.

Datos:
- Código DTC: ${dtc || "N/A"}
- Síntoma: ${sintoma || "N/A"}
- Vehículo: ${vehiculo || "N/A"}
- Notas: ${notas || "N/A"}
- Nivel de detalle: ${nivelDetalle || "normal"}

Entrega:
1. Posibles causas (ordenadas)
2. Pruebas recomendadas
3. Reparaciones probables
4. Advertencias importantes
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un experto en diagnóstico automotriz." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    return NextResponse.json({
      ok: true,
      result: completion.choices[0].message.content,
    });
  } catch (err: any) {
    return errorResponse(
      500,
      "Error interno en /api/diagnosticar",
      err?.message || String(err)
    );
  }
}
