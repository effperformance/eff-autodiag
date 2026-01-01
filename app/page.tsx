"use client";

import React, { useMemo, useState } from "react";

type ApiOK = {
  ok: true;
  input?: any;
  respuesta: string;
  timestamp?: string;
};

type ApiFail = {
  ok: false;
  httpStatus?: number;
  mensaje?: string;
  detalle?: any;
  timestamp?: string;
};

type ApiResponse = ApiOK | ApiFail | any;

type DetailLevel = "rapido" | "normal" | "pro";

type SectionKey =
  | "causas"
  | "pruebas"
  | "recomendaciones"
  | "errores_comunes"
  | "urgencia"
  | "notas"
  | "otros";

type Section = {
  key: SectionKey;
  title: string;
  icon: string;
  lines: string[];
};

const ICONS: Record<SectionKey, string> = {
  causas: "🧩",
  pruebas: "🧪",
  recomendaciones: "🛠️",
  errores_comunes: "⚠️",
  urgencia: "🚦",
  notas: "📝",
  otros: "📌",
};

function normalize(text: string) {
  return (text || "").toLowerCase().trim();
}

function guessSectionKey(title: string): SectionKey {
  const t = normalize(title);

  if (t.includes("causa")) return "causas";
  if (t.includes("prueba") || t.includes("test") || t.includes("verificar")) return "pruebas";
  if (t.includes("recomend") || t.includes("pasos") || t.includes("soluci") || t.includes("repair")) return "recomendaciones";
  if (t.includes("error") && t.includes("comun")) return "errores_comunes";
  if (t.includes("urgenc") || t.includes("prioridad") || t.includes("riesgo")) return "urgencia";
  if (t.includes("nota")) return "notas";

  return "otros";
}

function cleanHeading(line: string) {
  let s = line.trim();
  s = s.replace(/^#{1,6}\s+/, ""); // remove markdown heading
  s = s.replace(/^\d+\)\s+/, ""); // remove "1) "
  s = s.replace(/^\*\*(.+)\*\*:?$/, "$1"); // remove ** **
  s = s.replace(/:$/, "");
  return s.trim();
}

function isHeading(line: string) {
  const s = line.trim();
  if (!s) return false;

  // Markdown headings
  if (/^#{1,6}\s+/.test(s)) return true;

  // **Heading**
  if (/^\*\*.+\*\*:?$/.test(s)) return true;

  // 1) Heading
  if (/^\d+\)\s+/.test(s)) return true;

  // Common Spanish headings
  if (
    /^(causas|pruebas|recomendaciones|pasos|diagn[oó]stico|nivel de urgencia|urgencia|errores comunes|notas)\b/i.test(
      s
    )
  )
    return true;

  return false;
}

function splitIntoSections(text: string): Section[] {
  const raw = (text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return [];

  const lines = raw.split("\n");

  const out: Section[] = [];
  let currentTitle = "Respuesta";
  let currentLines: string[] = [];

  const pushCurrent = () => {
    const body = currentLines.join("\n").trim();
    if (!body) return;

    const key = guessSectionKey(currentTitle);
    out.push({
      key,
      title: currentTitle,
      icon: ICONS[key],
      lines: currentLines.map((l) => l.trimEnd()),
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (isHeading(trimmed)) {
      pushCurrent();
      currentTitle = cleanHeading(trimmed) || "Sección";
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  pushCurrent();

  // If everything ended up in “Respuesta” and it's huge, keep it as "otros"
  if (out.length === 1 && out[0].title === "Respuesta") {
    out[0].key = "otros";
    out[0].icon = ICONS.otros;
  }

  return out;
}

function renderLines(lines: string[]) {
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let blockCount = 0;

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) {
      blocks.push(
        <p key={`p-${blockCount++}`} style={{ margin: "10px 0", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {text}
        </p>
      );
    }
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length) {
      blocks.push(
        <ul key={`ul-${blockCount++}`} style={{ margin: "10px 0 10px 18px", lineHeight: 1.5 }}>
          {listItems.map((it, idx) => (
            <li key={`li-${blockCount++}-${idx}`} style={{ margin: "6px 0" }}>
              {it}
            </li>
          ))}
        </ul>
      );
    }
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushList();
      flushParagraph();
      continue;
    }

    // - item / • item
    const m = line.match(/^[-•]\s+(.*)$/);
    if (m) {
      flushParagraph();
      listItems.push(m[1].trim());
      continue;
    }

    // "1." list item
    const n = line.match(/^\d+\.\s+(.*)$/);
    if (n) {
      flushParagraph();
      listItems.push(n[1].trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushList();
  flushParagraph();
  return blocks;
}

function formatTextForDownload(payload: ApiResponse, detailLabel: string) {
  const now = new Date().toISOString();
  const ok = payload?.ok === true;
  const header = [
    "EFF AutoDiag — Reporte",
    `Generado: ${now}`,
    `Nivel de detalle: ${detailLabel}`,
    "",
  ];

  if (!ok) {
    const lines = [
      ...header,
      "ESTADO: ERROR",
      `HTTP: ${payload?.httpStatus ?? "N/A"}`,
      `Mensaje: ${payload?.mensaje ?? "Sin mensaje"}`,
      "",
      "Detalle:",
      typeof payload?.detalle === "string" ? payload.detalle : JSON.stringify(payload?.detalle ?? payload, null, 2),
      "",
    ];
    return lines.join("\n");
  }

  const input = payload?.input ? JSON.stringify(payload.input, null, 2) : "";
  const respuesta = typeof payload?.respuesta === "string" ? payload.respuesta : "";

  return [...header, "ESTADO: OK", "", "INPUT:", input || "(sin input)", "", "RESPUESTA:", respuesta].join("\n");
}

export default function Home() {
  const [codigo, setCodigo] = useState("P0172");
  const [sintoma, setSintoma] = useState("judder");
  const [vehiculo, setVehiculo] = useState("");
  const [notas, setNotas] = useState("");
  const [nivel, setNivel] = useState<DetailLevel>("normal");

  const [resultado, setResultado] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const ok = resultado?.ok === true;

  const pretty = useMemo(() => {
    if (!resultado) return "";
    try {
      return JSON.stringify(resultado, null, 2);
    } catch {
      return String(resultado);
    }
  }, [resultado]);

  const respuestaTexto = useMemo(() => {
    if (resultado?.ok === true && typeof resultado?.respuesta === "string") return resultado.respuesta;
    return "";
  }, [resultado]);

  const sections = useMemo(() => splitIntoSections(respuestaTexto), [respuestaTexto]);

  const detailLabel = useMemo(() => {
    if (nivel === "rapido") return "Rápido";
    if (nivel === "pro") return "Pro";
    return "Normal";
  }, [nivel]);

  async function diagnosticar() {
    setCopied(false);
    setLoading(true);
    setResultado(null);

    try {
      const res = await fetch("/api/diagnosticar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: codigo.trim(),
          sintoma: sintoma.trim(),
          vehiculo: vehiculo.trim() || undefined,
          notas: notas.trim() || undefined,
          nivelDetalle: nivel, // <- se envía al backend
          fecha: new Date().toISOString(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setResultado({
          ok: false,
          httpStatus: res.status,
          mensaje: "La API respondió con error (no OK).",
          detalle: data,
          timestamp: new Date().toISOString(),
        });
      } else {
        setResultado(data);
      }
    } catch (error: any) {
      setResultado({
        ok: false,
        httpStatus: 0,
        mensaje: "Error llamando la API (fetch falló).",
        detalle: String(error?.message || error),
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }

  async function copiarRespuesta() {
    if (!respuestaTexto) return;
    try {
      await navigator.clipboard.writeText(respuestaTexto);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // si falla el clipboard, no rompemos nada
    }
  }

  function descargarTXT() {
    if (!resultado) return;
    const content = formatTextForDownload(resultado, detailLabel);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const safeCode = (codigo || "DTC").replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `EFF_AutoDiag_${safeCode}_${new Date().toISOString().slice(0, 10)}.txt`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const canRun = codigo.trim().length > 0 && sintoma.trim().length > 0;

  return (
    <main
      style={{
        padding: 18,
        fontFamily: "Arial, sans-serif",
        maxWidth: 1050,
        margin: "0 auto",
        color: "#111",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>EFF AutoDiag</h1>
          <p style={{ margin: "6px 0 0", color: "#555" }}>Frontend → API → Respuesta (modo profesional)</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 12,
              border: "1px solid #ddd",
              background: "#fafafa",
              color: "#444",
              whiteSpace: "nowrap",
            }}
          >
            Nivel: <strong>{detailLabel}</strong>
          </span>
        </div>
      </div>

      {/* Form Card */}
      <div
        style={{
          marginTop: 16,
          border: "1px solid #e6e6e6",
          borderRadius: 14,
          background: "#fbfbfb",
          padding: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 12,
          }}
        >
          <div style={{ gridColumn: "span 3" }}>
            <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>Código DTC</label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: P0172"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #cfcfcf",
                outline: "none",
              }}
            />
          </div>

          <div style={{ gridColumn: "span 4" }}>
            <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>Síntoma</label>
            <input
              value={sintoma}
              onChange={(e) => setSintoma(e.target.value)}
              placeholder="Ej: judder, rough idle, no start…"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #cfcfcf",
                outline: "none",
              }}
            />
          </div>

          <div style={{ gridColumn: "span 5" }}>
            <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>Vehículo (opcional)</label>
            <input
              value={vehiculo}
              onChange={(e) => setVehiculo(e.target.value)}
              placeholder="Ej: 2020 VW Passat 2.0T"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #cfcfcf",
                outline: "none",
              }}
            />
          </div>

          <div style={{ gridColumn: "span 12" }}>
            <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>Notas (opcional)</label>
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: ya cambié MAF / hay olor a gasolina / etc."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #cfcfcf",
                outline: "none",
              }}
            />
          </div>

          <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column" }}>
            <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>Nivel de detalle</label>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value as DetailLevel)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #cfcfcf",
                outline: "none",
                background: "#fff",
              }}
            >
              <option value="rapido">Rápido (resumen)</option>
              <option value="normal">Normal (balanceado)</option>
              <option value="pro">Pro (técnico)</option>
            </select>
          </div>

          <div style={{ gridColumn: "span 8", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <button
              onClick={diagnosticar}
              disabled={loading || !canRun}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: loading || !canRun ? "#efefef" : "#fff",
                cursor: loading || !canRun ? "not-allowed" : "pointer",
                fontWeight: 700,
              }}
            >
              {loading ? "Diagnosticando…" : "Diagnosticar"}
            </button>

            <button
              onClick={() => setShowRaw((v) => !v)}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #cfcfcf",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {showRaw ? "Ocultar JSON" : "Ver JSON"}
            </button>

            <button
              onClick={copiarRespuesta}
              disabled={!respuestaTexto}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #0a7",
                background: respuestaTexto ? "#eafff7" : "#f2f2f2",
                cursor: respuestaTexto ? "pointer" : "not-allowed",
                fontWeight: 700,
              }}
            >
              {copied ? "✅ Copiado" : "Copiar respuesta"}
            </button>

            <button
              onClick={descargarTXT}
              disabled={!resultado}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #3b82f6",
                background: resultado ? "#eef5ff" : "#f2f2f2",
                cursor: resultado ? "pointer" : "not-allowed",
                fontWeight: 700,
              }}
            >
              Descargar .txt
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {resultado && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              borderRadius: 14,
              border: ok ? "1px solid #b7ead6" : "1px solid #f2c2c2",
              background: ok ? "#f0fff8" : "#fff5f5",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <strong style={{ fontSize: 15 }}>{ok ? "✅ Diagnóstico generado" : "⚠️ Respuesta con error"}</strong>
                {resultado?.httpStatus ? (
                  <span style={{ fontSize: 12, color: "#666" }}>HTTP: {resultado.httpStatus}</span>
                ) : null}
                {resultado?.timestamp ? (
                  <span style={{ fontSize: 12, color: "#666" }}>ts: {String(resultado.timestamp)}</span>
                ) : null}
              </div>

              <div style={{ fontSize: 12, color: "#555" }}>
                {ok ? "Respuesta presente ✅" : "Revisa detalle / JSON"}
              </div>
            </div>

            {/* Error summary */}
            {!ok && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #f0d0d0",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Mensaje</div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {resultado?.mensaje || "Sin mensaje"}
                  </div>
                  {resultado?.detalle ? (
                    <>
                      <div style={{ fontWeight: 700, marginTop: 10, marginBottom: 6 }}>Detalle</div>
                      <pre
                        style={{
                          margin: 0,
                          padding: 10,
                          borderRadius: 10,
                          background: "#111",
                          color: "#f5f5f5",
                          overflowX: "auto",
                          fontSize: 12,
                        }}
                      >
                        {typeof resultado.detalle === "string"
                          ? resultado.detalle
                          : JSON.stringify(resultado.detalle, null, 2)}
                      </pre>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Formatted response */}
            {ok && respuestaTexto && (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(12, 1fr)",
                    gap: 12,
                  }}
                >
                  {sections.length === 0 ? (
                    <div style={{ gridColumn: "span 12", background: "#fff", border: "1px solid #e6e6e6", borderRadius: 12, padding: 12 }}>
                      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{respuestaTexto}</div>
                    </div>
                  ) : (
                    sections.map((sec, idx) => (
                      <div
                        key={`sec-${idx}`}
                        style={{
                          gridColumn: "span 12",
                          background: "#fff",
                          border: "1px solid #e6e6e6",
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 18 }}>{sec.icon}</span>
                          <h3 style={{ margin: 0, fontSize: 16 }}>{sec.title}</h3>
                        </div>
                        <div style={{ fontSize: 14, color: "#222" }}>{renderLines(sec.lines)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Raw JSON */}
            {showRaw && (
              <pre
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: "#111",
                  color: "#f5f5f5",
                  overflowX: "auto",
                  fontSize: 12,
                }}
              >
                {pretty}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Tiny footer */}
      <p style={{ marginTop: 14, color: "#777", fontSize: 12 }}>
        Tip: Si la PC se pone lenta, cierra pestañas y deja corriendo solo VS Code + 1 browser. Si se traba, para el dev server con <strong>Ctrl + C</strong> en la terminal y vuelve a correr <strong>npm run dev</strong>.
      </p>
    </main>
  );
}
