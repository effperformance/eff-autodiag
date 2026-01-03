"use client";

import { useEffect, useMemo, useState } from "react";

type Paso = 0 | 1 | 2 | 3 | 4 | 5;

const STORAGE_KEY = "eff_autodiag_vehicle_v1";

const MAKES_MODELS: Record<string, string[]> = {
  Honda: ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "Fit", "Ridgeline", "HR-V", "Otro…"],
  Toyota: ["Corolla", "Camry", "RAV4", "Tacoma", "Tundra", "Highlander", "4Runner", "Prius", "Otro…"],
  Nissan: ["Sentra", "Altima", "Maxima", "Rogue", "Murano", "Pathfinder", "Frontier", "Titan", "Otro…"],
  Ford: ["F-150", "Mustang", "Explorer", "Escape", "Fusion", "Focus", "Ranger", "Expedition", "Otro…"],
  Chevrolet: ["Silverado", "Camaro", "Malibu", "Equinox", "Tahoe", "Suburban", "Colorado", "Traverse", "Otro…"],
  GMC: ["Sierra", "Yukon", "Acadia", "Terrain", "Canyon", "Otro…"],
  Dodge: ["Charger", "Challenger", "Durango", "Ram 1500", "Otro…"],
  Jeep: ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Renegade", "Gladiator", "Otro…"],
  BMW: ["3 Series", "5 Series", "X3", "X5", "Otro…"],
  Mercedes: ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "Otro…"],
  Volkswagen: ["Jetta", "Golf", "Passat", "Tiguan", "Atlas", "Otro…"],
  Hyundai: ["Elantra", "Sonata", "Tucson", "Santa Fe", "Otro…"],
  Kia: ["Forte", "Optima/K5", "Sportage", "Sorento", "Telluride", "Otro…"],
  Mazda: ["Mazda3", "Mazda6", "CX-5", "CX-9", "Otro…"],
  Subaru: ["Impreza", "Crosstrek", "Forester", "Outback", "WRX", "Otro…"],
  Audi: ["A4", "A6", "Q5", "Q7", "Otro…"],
  Lexus: ["IS", "ES", "RX", "GX", "Otro…"],
  "Otro…": ["Otro…"],
};

function buildYears(minYear = 1990) {
  const current = new Date().getFullYear() + 1;
  const years: string[] = [];
  for (let y = current; y >= minYear; y--) years.push(String(y));
  return years;
}

type SavedVehicle = {
  modoVehiculo: "seleccionar" | "escribir";
  year: string;
  make: string;
  model: string;
  engine: string;
  makeOtro: string;
  modelOtro: string;
};

export default function Home() {
  // Modo de entrada del vehículo
  const [modoVehiculo, setModoVehiculo] = useState<"seleccionar" | "escribir">("seleccionar");

  // Vehículo
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [engine, setEngine] = useState("");

  // Aux "Otro…"
  const [makeOtro, setMakeOtro] = useState("");
  const [modelOtro, setModelOtro] = useState("");

  // Diagnóstico
  const [input, setInput] = useState("");
  const [respuesta, setRespuesta] = useState("");

  const [detalle, setDetalle] = useState("");
  const [paso, setPaso] = useState<Paso>(0);

  const [temp, setTemp] = useState("");
  const [cel, setCel] = useState("");
  const [condicion, setCondicion] = useState("");
  const [extras, setExtras] = useState("");

  const years = useMemo(() => buildYears(1990), []);
  const makes = useMemo(() => Object.keys(MAKES_MODELS), []);
  const modelsForMake = useMemo(() => {
    const m = make || "";
    return MAKES_MODELS[m] ?? ["Otro…"];
  }, [make]);

  // 1) Cargar vehículo guardado al iniciar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const v = JSON.parse(raw) as SavedVehicle;

      if (v?.modoVehiculo) setModoVehiculo(v.modoVehiculo);
      if (v?.year) setYear(v.year);
      if (v?.make) setMake(v.make);
      if (v?.model) setModel(v.model);
      if (v?.engine) setEngine(v.engine);
      if (v?.makeOtro) setMakeOtro(v.makeOtro);
      if (v?.modelOtro) setModelOtro(v.modelOtro);
    } catch {
      // si algo falla, ignoramos y seguimos sin romper la app
    }
  }, []);

  // 2) Guardar vehículo automáticamente cuando cambie
  useEffect(() => {
    const payload: SavedVehicle = {
      modoVehiculo,
      year,
      make,
      model,
      engine,
      makeOtro,
      modelOtro,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // sin romper si el storage falla
    }
  }, [modoVehiculo, year, make, model, engine, makeOtro, modelOtro]);

  function resetCaso() {
    setInput("");
    setRespuesta("");
    setDetalle("");
    setPaso(0);
    setTemp("");
    setCel("");
    setCondicion("");
    setExtras("");
  }

  function resetTotal() {
    resetCaso();

    setModoVehiculo("seleccionar");
    setYear("");
    setMake("");
    setModel("");
    setEngine("");
    setMakeOtro("");
    setModelOtro("");

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function getFinalMake() {
    if (modoVehiculo === "escribir") return make.trim();
    if (make === "Otro…") return makeOtro.trim();
    return make.trim();
  }

  function getFinalModel() {
    if (modoVehiculo === "escribir") return model.trim();
    if (model === "Otro…") return modelOtro.trim();
    return model.trim();
  }

  function vehicleOK() {
    const y = year.trim();
    const mk = getFinalMake();
    const md = getFinalModel();
    const en = engine.trim();
    return y !== "" && mk !== "" && md !== "" && en !== "";
  }

  function vehicleLabel() {
    return `${year} ${getFinalMake()} ${getFinalModel()} (${engine})`;
  }

  function diagnosticar() {
    const texto = input.trim().toUpperCase();

    if (!vehicleOK()) {
      setRespuesta("Primero completa Año, Marca, Modelo y Motor.");
      return;
    }

    if (!texto) {
      setRespuesta("Escribe un código OBD-II (ej: P0171) o describe el síntoma.");
      return;
    }

    // reset del flujo guiado (manteniendo el input)
    setPaso(0);
    setDetalle("");
    setTemp("");
    setCel("");
    setCondicion("");
    setExtras("");

    const codigos: Record<string, string> = {
      P0171: "P0171 = Mezcla pobre (Bank 1). Revisa fugas de vacío, MAF, presión de gasolina.",
      P0300: "P0300 = Misfire aleatorio. Revisa bujías, bobinas, inyectores.",
      P0420: "P0420 = Eficiencia del catalizador baja.",
    };

    if (codigos[texto]) {
      setRespuesta(`Vehículo: ${vehicleLabel()}\n\n${codigos[texto]}`);
    } else {
      setRespuesta(
        `Vehículo: ${vehicleLabel()}\n\n` +
          `No tengo ${texto} aún. Vamos a diagnosticar por preguntas.\n\nPaso 1: Describe el síntoma en una frase.`
      );
      setPaso(1);
    }
  }

  function enviarDetalle() {
    const t = detalle.trim();
    if (!t) return;

    setRespuesta((prev) => prev + `\n\nSíntoma: ${t}\n\nPaso 2: ¿Sucede en frío, en caliente, o en ambos?`);
    setPaso(2);
  }

  function enviarTemp() {
    if (!temp) return;

    setRespuesta((prev) => prev + `\n\nTemperatura: ${temp}\n\nPaso 3: ¿El Check Engine está fijo, parpadea, o a veces?`);
    setPaso(3);
  }

  function enviarCEL() {
    if (!cel) return;

    setRespuesta(
      (prev) =>
        prev +
        `\n\nCheck Engine: ${cel}\n\nPaso 4: ¿Cuándo pasa más? (idle / acelerando / crucero / al arrancar)`
    );
    setPaso(4);
  }

  function enviarCondicion() {
    if (!condicion) return;

    setRespuesta((prev) => prev + `\n\nCondición: ${condicion}\n\nPaso 5: ¿Notas algo extra?`);
    setPaso(5);
  }

  function finalizar() {
    const t = extras.trim();
    if (!t) return;

    setRespuesta(
      (prev) =>
        prev +
        `\n\nExtras: ${t}\n\n✅ Resumen completo.\n\n` +
        `VEHÍCULO:\n- ${vehicleLabel()}\n\n` +
        `RESUMEN:\n- Síntoma: ${detalle}\n- Temp: ${temp}\n- CEL: ${cel}\n- Condición: ${condicion}\n- Extras: ${extras}`
    );
  }

  return (
    <main style={{ padding: 40, maxWidth: 980 }}>
      <h1>EFF AutoDiag</h1>
      <p>Chatbot de diagnóstico automotriz</p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={resetCaso} style={{ padding: "8px 14px" }}>
          Reset caso (mantiene vehículo)
        </button>
        <button onClick={resetTotal} style={{ padding: "8px 14px" }}>
          Reset total (borra vehículo)
        </button>

        <div style={{ marginLeft: 10 }}>
          <strong>Modo vehículo:</strong>{" "}
          <button
            onClick={() => setModoVehiculo("seleccionar")}
            style={{ padding: "6px 10px", marginLeft: 8 }}
            disabled={modoVehiculo === "seleccionar"}
          >
            Seleccionar
          </button>
          <button
            onClick={() => setModoVehiculo("escribir")}
            style={{ padding: "6px 10px", marginLeft: 6 }}
            disabled={modoVehiculo === "escribir"}
          >
            Escribir
          </button>
        </div>
      </div>

      <br />

      {/* DATOS DEL VEHÍCULO */}
      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
        <strong>Datos del vehículo (se guardan automáticamente)</strong>

        {modoVehiculo === "seleccionar" ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              <select value={year} onChange={(e) => setYear(e.target.value)} style={{ padding: 10, width: 170 }}>
                <option value="">Año…</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <select
                value={make}
                onChange={(e) => {
                  const v = e.target.value;
                  setMake(v);
                  setModel("");
                  setMakeOtro("");
                  setModelOtro("");
                }}
                style={{ padding: 10, width: 220 }}
              >
                <option value="">Marca…</option>
                {makes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {make === "Otro…" && (
                <input
                  value={makeOtro}
                  onChange={(e) => setMakeOtro(e.target.value)}
                  placeholder="Escribe la marca"
                  style={{ padding: 10, width: 220 }}
                />
              )}

              <select
                value={model}
                onChange={(e) => {
                  const v = e.target.value;
                  setModel(v);
                  setModelOtro("");
                }}
                style={{ padding: 10, width: 240 }}
                disabled={!make}
              >
                <option value="">{make ? "Modelo…" : "Selecciona marca primero"}</option>
                {make &&
                  modelsForMake.map((md) => (
                    <option key={md} value={md}>
                      {md}
                    </option>
                  ))}
              </select>

              {model === "Otro…" && (
                <input
                  value={modelOtro}
                  onChange={(e) => setModelOtro(e.target.value)}
                  placeholder="Escribe el modelo"
                  style={{ padding: 10, width: 240 }}
                />
              )}

              <input
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                placeholder="Motor (ej: 1.8 R18 / 5.3 V8 / M104.032)"
                style={{ padding: 10, width: 340 }}
                onKeyDown={(e) => e.key === "Enter" && diagnosticar()}
              />
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Año (ej: 2015)" style={{ padding: 10, width: 170 }} />
              <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Marca (ej: Honda)" style={{ padding: 10, width: 220 }} />
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Modelo (ej: Civic)" style={{ padding: 10, width: 240 }} />
              <input
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                placeholder="Motor (ej: 1.8 R18 / M104.032)"
                style={{ padding: 10, width: 340 }}
                onKeyDown={(e) => e.key === "Enter" && diagnosticar()}
              />
            </div>
          </>
        )}

        <div style={{ marginTop: 8, fontSize: 13 }}>
          Estado: {vehicleOK() ? "✅ Completo" : "⚠️ Falta completar Año / Marca / Modelo / Motor"}
        </div>
      </div>

      <br />

      {/* INPUT PRINCIPAL */}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && diagnosticar()}
        placeholder="Código OBD-II (ej: P0171) o síntoma"
        style={{ padding: 10, width: 520 }}
      />

      <br />
      <br />

      <button onClick={diagnosticar} style={{ padding: "8px 14px" }}>
        Diagnosticar
      </button>

      {respuesta && (
        <div style={{ marginTop: 20 }}>
          <strong>Resultado:</strong>
          <p style={{ whiteSpace: "pre-line" }}>{respuesta}</p>
        </div>
      )}

      {/* PASO 1 */}
      {paso === 1 && (
        <>
          <br />
          <br />
          <input
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviarDetalle()}
            placeholder="Describe el síntoma en una frase"
            style={{ padding: 10, width: 520 }}
          />
          <br />
          <br />
          <button onClick={enviarDetalle} style={{ padding: "8px 14px" }}>
            Enviar síntoma
          </button>
        </>
      )}

      {/* PASO 2 */}
      {paso === 2 && (
        <>
          <br />
          <br />
          <select value={temp} onChange={(e) => setTemp(e.target.value)} style={{ padding: 10 }}>
            <option value="">Selecciona…</option>
            <option value="Frío">Frío</option>
            <option value="Caliente">Caliente</option>
            <option value="Ambos">Ambos</option>
          </select>
          <br />
          <br />
          <button onClick={enviarTemp} style={{ padding: "8px 14px" }}>
            Siguiente
          </button>
        </>
      )}

      {/* PASO 3 */}
      {paso === 3 && (
        <>
          <br />
          <br />
          <select value={cel} onChange={(e) => setCel(e.target.value)} style={{ padding: 10 }}>
            <option value="">Selecciona…</option>
            <option value="Fijo">Fijo</option>
            <option value="Parpadea">Parpadea</option>
            <option value="A veces">A veces</option>
          </select>
          <br />
          <br />
          <button onClick={enviarCEL} style={{ padding: "8px 14px" }}>
            Siguiente
          </button>
        </>
      )}

      {/* PASO 4 */}
      {paso === 4 && (
        <>
          <br />
          <br />
          <select value={condicion} onChange={(e) => setCondicion(e.target.value)} style={{ padding: 10 }}>
            <option value="">Selecciona…</option>
            <option value="Idle">Idle</option>
            <option value="Acelerando">Acelerando</option>
            <option value="Crucero">Crucero</option>
            <option value="Al arrancar">Al arrancar</option>
          </select>
          <br />
          <br />
          <button onClick={enviarCondicion} style={{ padding: "8px 14px" }}>
            Siguiente
          </button>
        </>
      )}

      {/* PASO 5 */}
      {paso === 5 && (
        <>
          <br />
          <br />
          <input
            value={extras}
            onChange={(e) => setExtras(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && finalizar()}
            placeholder="Extras: olor gasolina, humo, pérdida potencia, consumo alto..."
            style={{ padding: 10, width: 640 }}
          />
          <br />
          <br />
          <button onClick={finalizar} style={{ padding: "8px 14px" }}>
            Finalizar
          </button>
        </>
      )} 
      <hr style={{ marginTop: 24, marginBottom: 16 }} />

<footer style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.4 }}>
  <strong>Disclaimer:</strong> Esta herramienta ofrece una guía educativa y sugerencias de diagnóstico.
  No reemplaza pruebas reales (scanner, data en vivo, smoke test, multímetro/oscilo) ni el criterio de un técnico.
  Verifica siempre con procedimientos del fabricante.

  <div style={{ marginTop: 8 }}>
    <strong>Privacidad:</strong> Evita incluir datos personales (nombre, placa, VIN, dirección).
  </div>

  <div style={{ marginTop: 8 }}>
    <strong>Contacto:</strong> EFF Performance Auto Solutions — effperformance@yahoo.com
  </div>
</footer>

       </main>
  );
}
