import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  dtc?: string;
  sintoma?: string;
  vehiculo?: string;
  notas?: string;
  nivelDetalle?: "corto" | "normal" | "profesional";
};

function jsonError(status: number, message: string, detalle?: unknown) {
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

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const dtc = (body.dtc ?? "").trim();
    const sintoma = (body.sintoma ?? "").trim();
    const vehiculo = (body.vehiculo ?? "").trim();
    const notas = (body.notas ?? "").trim();
    const nivelDetalle = body.nivelDetalle ?? "normal";

    if (!dtc && !sintoma) {
      return jsonError(400, "Debes proporcionar al menos un código DTC o un síntoma.");
    }

    // ✅ Leer key SOLO en runtime, dentro del handler
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return jsonError(
        500,
        "Falta OPENAI_API_KEY en el servidor (Vercel env vars o .env.local).",
        "Configura OPENAI_API_KEY y redeploy/restart."
      );
    }

    // ⚠️ No loguees el key completo. Si quieres validar, solo largo:
    // console.log("OPENAI_API_KEY length:", apiKey.length);

    const client = new OpenAI({ apiKey });

    const detailMap: Record<string, string> = {
      corto: "Respuesta breve y directa, en bullets.",
      normal: "Respuesta balanceada: explicación clara + pasos recomendados.",
      profesional: "Modo profesional: diagnóstico estructurado con pruebas, valores esperados, y decisiones.",
    };

    const prompt = `
Eres un técnico automotriz experto. Responde en español.
Entrega un diagnóstico y plan de pruebas paso a paso.

Datos:
- DTC: ${dtc || "(no provisto)"}
- Síntoma: ${sintoma || "(no provisto)"}
- Vehículo: ${vehiculo || "(no provisto)"}
- Notas: ${notas || "(no provisto)"}

Nivel: ${nivelDetalle} (${detailMap[nivelDetalle] ?? detailMap.normal})

Formato de salida:
1) Resumen (1-3 líneas)
2) Causas probables (ordenadas por probabilidad)
3) Pruebas recomendadas (con herramientas: escáner, multímetro, osciloscopio si aplica)
4) Valores/criterios esperados (si aplica)
5) Reparación sugerida (y qué NO hacer todavía)
6) Preguntas clave para cerrar el diagnóstico
`.trim();

    // ✅ Usa Responses API (más moderno) o Chat Completions si tú ya estabas usando eso.
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

    const result = await client.responses.create({
      model,
      input: prompt,
    });

    const text =
      (result.output_text ?? "").trim() ||
      "No se pudo generar respuesta. Intenta nuevamente.";

    return NextResponse.json({
      ok: true,
      httpStatus: 200,
      model,
      dtc,
      sintoma,
      vehiculo,
      notas,
      nivelDetalle,
      respuesta: text,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    // Devuelve error sin exponer secretos
    const msg = err?.message || String(err);
    return jsonError(500, "Error interno en /api/diagnosticar", msg);
  }
}
