// app/api/diagnosticar/route.ts
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  dtc?: string;
  sintoma?: string;
  vehiculo?: string;
  notas?: string;
  nivel?: "normal" | "pro" | "max";
};

function jsonError(status: number, message: string, detalle?: any) {
  return NextResponse.json(
    {
      ok: false,
      httpStatus: status,
      message,
      detalle,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const dtc = (body.dtc ?? "").trim();
    const sintoma = (body.sintoma ?? "").trim();
    const vehiculo = (body.vehiculo ?? "").trim();
    const notas = (body.notas ?? "").trim();
    const nivel = body.nivel ?? "normal";

    if (!dtc && !sintoma) {
      return jsonError(400, "Debe proporcionar al menos un código DTC o un síntoma.");
    }

    // ✅ Importante: leer la key y crear el cliente DENTRO del handler (no arriba)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError(
        500,
        "Falta OPENAI_API_KEY en el servidor (Vercel Environment Variables).",
        "Configura OPENAI_API_KEY en Vercel y redeploy."
      );
    }

    const client = new OpenAI({ apiKey });

    const detalleTexto =
      nivel === "max"
        ? "muy detallada, técnica, con pruebas eléctricas/valores típicos, y pasos avanzados"
        : nivel === "pro"
        ? "detallada, profesional, con pasos y decisiones claras"
        : "balanceada, clara y práctica";

    const input = `
Eres un técnico automotriz master y asesor de diagnóstico.
Responde en ESPAÑOL, en formato profesional, y de forma ${detalleTexto}.

Datos del caso:
- DTC: ${dtc || "(no provisto)"}
- Síntoma: ${sintoma || "(no provisto)"}
- Vehículo: ${vehiculo || "(no provisto)"}
- Notas: ${notas || "(no provisto)"}

Entrega:
1) Interpretación del DTC/Síntoma (qué significa y qué NO significa).
2) Causas probables (ordenadas por probabilidad).
3) Pruebas rápidas (5–10 min) para confirmar/descartar.
4) Diagnóstico paso a paso (árbol de decisión si aplica).
5) Valores/lecturas esperadas (si aplica: voltajes, ohms, fuel trims, etc).
6) Errores comunes / trampas.
7) Reparaciones sugeridas y cómo validar la reparación.
8) Si falta información, lista EXACTA de preguntas para cerrar el diagnóstico.

No inventes datos del vehículo; si falta, asume genérico y dilo.
`.trim();

    // ✅ Responses API (SDK oficial)
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input,
    });

    const text = (response as any).output_text ?? "";

    return NextResponse.json({
      ok: true,
      httpStatus: 200,
      timestamp: new Date().toISOString(),
      data: {
        dtc,
        sintoma,
        vehiculo,
        nivel,
        respuesta: text,
      },
      raw: response,
    });
  } catch (err: any) {
    return jsonError(500, "Error interno en /api/diagnosticar", err?.message ?? err);
  }
}

// (Opcional) Para probar rápido en el browser sin frontend
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "API lista. Usa POST con JSON { dtc, sintoma, vehiculo, notas, nivel }",
  });
}
