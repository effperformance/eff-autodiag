import { OpenAI } from "openai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function err(status: number, mensaje: string, detalle?: any) {
  return NextResponse.json(
    {
      ok: false,
      httpStatus: status,
      mensaje,
      detalle,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

function normalizeVehicleAny(v: any) {
  // Aquí soportamos tu UI actual (vehiculo como string) o vehiculo como objeto
  if (typeof v === "string") {
    const s = v.trim();
    return {
      hasAny: Boolean(s),
      display: s || "N/A",
      anio: "N/A",
      marca: "N/A",
      modelo: "N/A",
      motor: "N/A",
    };
  }

  const anio = String(v?.anio ?? "").trim();
  const marca = String(v?.marca ?? "").trim();
  const modelo = String(v?.modelo ?? "").trim();
  const motor = String(v?.motor ?? "").trim();
  const hasAny = Boolean(anio || marca || modelo || motor);

  const display = hasAny ? `${anio} ${marca} ${modelo} — Motor: ${motor}`.trim() : "N/A";

  return {
    hasAny,
    display,
    anio: anio || "N/A",
    marca: marca || "N/A",
    modelo: modelo || "N/A",
    motor: motor || "N/A",
  };
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return err(500, "Falta OPENAI_API_KEY en .env.local");
    }

    const body = await req.json();

    const codigoRaw: string = String(body?.codigo ?? "").trim();
    const sintomaRaw: string = String(body?.sintoma ?? "").trim();
    const notasRaw: string = String(body?.notas ?? body?.prueba ?? "").trim();
    const fecha: string = String(body?.fecha ?? new Date().toISOString());

    const veh = normalizeVehicleAny(body?.vehiculo);

    if (!codigoRaw && !sintomaRaw) {
      return err(400, "Envía al menos 'codigo' o 'sintoma'.");
    }

    // Múltiples DTC separados por coma/salto de línea
    const codigos = codigoRaw
      .split(/[,;\n]/g)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 8);

    // Forzar MASTER siempre (tu requisito)
    const nivelDetalle = "pro";

    const system = `
Eres un Master Diagnostic Technician (nivel dealer) experto en drivability, CAN/OBD2 y estrategias OEM.
No inventas. No adivinas. Siempre pides datos faltantes y propones pruebas dirigidas.
Piensa en: síntomas, freeze frame, live data, pruebas activas, confirmación y verificación post-reparación.
Si el vehículo está especificado, adapta causas típicas y pruebas a esa plataforma/motor.
`.trim();

    const user = `
MODO: MASTER (PRO) — objetivo: diagnóstico de nivel técnico, con pasos verificables y prioridades.

Vehículo:
- ${veh.display}

Caso:
- DTC(s): ${codigos.length ? codigos.join(", ") : "N/A"}
- Síntoma: ${sintomaRaw || "N/A"}
- Notas: ${notasRaw || "N/A"}
- Fecha: ${fecha}

SALIDA: usa este formato EXACTO (texto, no JSON), y manténlo práctico.

### Resumen rápido (1–3 líneas)
- (qué indica el código y cómo encaja con el síntoma)

### Preguntas clave (si falta info)
- (máx 6 preguntas, súper específicas; si no hace falta, escribe "N/A")

### Causas probables (priorizadas)
1) ...
2) ...
3) ...
(usa 3–5, y di el “por qué” en una frase cada una)

### Pruebas recomendadas (paso a paso)
1) Prueba + cómo hacerla + qué datos mirar (live data / valores esperados cuando aplique)
2) ...
Incluye ramas tipo: “Si A → haz B; si no → haz C”.
(8–14 pasos si hace falta, pero NO relleno)

### Valores / Pistas (cuando aplique)
- STFT/LTFT: qué sería normal y qué sería sospechoso
- MAF g/s o MAP kPa: referencia aproximada
- Presión de combustible: referencia si aplica
(Si no aplica, escribe "N/A")

### Qué NO hacer
- (2–4 bullets: cambios de piezas sin prueba, limpiar códigos sin data, etc.)

### Urgencia
Baja / Media / Alta (1 línea y por qué)

REGLAS MASTER:
- Evita “cambia X” sin prueba confirmatoria.
- Prioriza pruebas de bajo costo/tiempo primero.
- Señala pitfalls comunes (conectores, fugas, sensores aftermarket, data engañosa).
- Mantén máximo ~2600 caracteres (profesional pero sin novela).
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const respuesta = completion.choices?.[0]?.message?.content?.trim() || "";

    return NextResponse.json({
      ok: true,
      input: {
        vehiculo: veh,
        codigo: codigoRaw,
        sintoma: sintomaRaw,
        notas: notasRaw,
        nivelDetalle,
        fecha,
      },
      respuesta,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e);

    if (msg.includes("429")) return err(429, "Límite / cuota alcanzada (429).", msg);
    if (msg.includes("401")) return err(401, "API Key inválida/no autorizada (401).", msg);
    if (msg.includes("403")) return err(403, "Acceso denegado (403). Revisa billing/permisos.", msg);

    return err(500, "Error interno en el servidor.", msg);
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    mensaje: "API lista ✅ Usa POST a /api/diagnosticar",
    timestamp: new Date().toISOString(),
  });
}
