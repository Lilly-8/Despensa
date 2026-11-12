// Edge Function "recetas"
// Recibe los productos de la despensa con su fecha de caducidad,
// le pide recetas a Gemini priorizando lo que caduca pronto
// y devuelve { recetas: [...] } con el formato de docs/arquitectura.md (Backend).

// Tipos del runtime de Supabase (Deno)
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

// ---------- Datos ----------

// Lo que manda la app por cada producto
interface ProductoEntrada {
  nombre: string;
  fechaCaducidad: string; // 'YYYY-MM-DD'
  cantidad?: number;
  unidad?: string;
}

interface Ingrediente {
  nombre: string;
  cantidad: string;
  tengo: boolean;
}

// Formato final que recibe la app
interface Receta {
  titulo: string;
  imagen: string | null; // la IA no da fotos; Spoonacular la llenará después
  tiempo_min: number;
  ingredientes: Ingrediente[];
  pasos: string[];
  aprovecha: string[];
  fuente: string; // "ia" o "spoonacular"
}

// ---------- Configuración de Gemini ----------

const URL_GEMINI = "https://generativelanguage.googleapis.com/v1beta/interactions";
// Se prueban en orden: si el primero está saturado (503), llegó a su
// límite de uso (429) o no contesta a tiempo, se intenta con el siguiente.
const MODELOS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
// Tiempo máximo de espera por modelo. Supabase corta la función a los 150 s,
// así que 2 intentos de 40 s caben con margen.
const SEGUNDOS_POR_MODELO = 40;
const MAX_PRODUCTOS = 30; // para no mandar un prompt enorme

const INSTRUCCIONES = `Eres un asistente de cocina para una familia mexicana.
Tu objetivo es evitar que se desperdicie comida.

Reglas:
- Propón exactamente 3 recetas caseras y realistas, en español de México.
- Cada receta debe usar al menos un producto marcado como URGENTE si hay alguno.
  Da prioridad a los que caducan antes.
- Usa sobre todo productos de la despensa. Puedes agregar pocos ingredientes extra.
- En "ingredientes", "tengo" es true solo si el ingrediente está en la despensa.
  Sal, pimienta, aceite y agua cuentan como que sí los tiene.
- En "aprovecha" lista solo productos de la despensa que caducan en 7 días o menos,
  con el formato "espinacas (caducan mañana)" o "leche (caduca en 3 días)".
- "tiempo_min" es el tiempo total en minutos.
- Los pasos son cortos y claros, sin numerarlos.`;

// Esquema que obliga a Gemini a responder con esta forma exacta (modo JSON).
// No pedimos "imagen" ni "fuente": esos los ponemos nosotros.
const ESQUEMA = {
  type: "object",
  properties: {
    recetas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          tiempo_min: { type: "integer" },
          ingredientes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nombre: { type: "string" },
                cantidad: { type: "string" },
                tengo: { type: "boolean" },
              },
              required: ["nombre", "cantidad", "tengo"],
            },
          },
          pasos: { type: "array", items: { type: "string" } },
          aprovecha: { type: "array", items: { type: "string" } },
        },
        required: ["titulo", "tiempo_min", "ingredientes", "pasos", "aprovecha"],
      },
    },
  },
  required: ["recetas"],
};

// ---------- Funciones de ayuda ----------

// Días que faltan entre hoy y la fecha de caducidad (las dos 'YYYY-MM-DD')
function diasParaCaducar(hoy: string, fechaCaducidad: string): number {
  const unDia = 24 * 60 * 60 * 1000;
  const inicio = new Date(hoy + "T00:00:00Z").getTime();
  const fin = new Date(fechaCaducidad + "T00:00:00Z").getTime();
  return Math.round((fin - inicio) / unDia);
}

function textoCaducidad(dias: number): string {
  if (dias === 0) return "caduca hoy";
  if (dias === 1) return "caduca mañana";
  return "caduca en " + dias + " días";
}

// Arma la lista de productos que va dentro del prompt, ya ordenada por caducidad
function armarListaProductos(productos: ProductoEntrada[], hoy: string): string {
  let lista = "";
  for (const producto of productos) {
    const dias = diasParaCaducar(hoy, producto.fechaCaducidad);
    let linea = "- " + producto.nombre;
    if (producto.cantidad) {
      let cantidad = String(producto.cantidad);
      if (producto.unidad) {
        cantidad += " " + producto.unidad;
      }
      linea += " (" + cantidad + ")";
    }
    linea += ": " + textoCaducidad(dias);
    if (dias <= 3) {
      linea += " [URGENTE]";
    }
    lista += linea + "\n";
  }
  return lista;
}

function respuestaError(mensaje: string, status: number): Response {
  return Response.json({ error: mensaje }, { status: status });
}

// ---------- Función principal ----------

export default {
  // Solo acepta peticiones con la publishable key en el header "apikey"
  fetch: withSupabase({ auth: ["publishable"] }, async (req) => {
    if (req.method !== "POST") {
      return respuestaError("Usa POST", 405);
    }

    // 1. Leer y validar lo que manda la app
    let productos: ProductoEntrada[] = [];
    let hoy = "";
    try {
      const cuerpo = await req.json();
      productos = cuerpo.productos;
      // La app manda su fecha local; si no, usamos la fecha del servidor (UTC)
      hoy = cuerpo.hoy ?? new Date().toISOString().slice(0, 10);
    } catch {
      return respuestaError("El cuerpo debe ser JSON", 400);
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      return respuestaError("Manda { productos: [{ nombre, fechaCaducidad }] }", 400);
    }

    for (const producto of productos) {
      if (!producto.nombre || !producto.fechaCaducidad) {
        return respuestaError("Cada producto necesita nombre y fechaCaducidad", 400);
      }
    }

    // 2. Quitar lo ya caducado (no se recomienda cocinarlo),
    //    ordenar por fecha (lo que caduca antes, primero) y limitar la cantidad
    const vigentes = productos.filter(
      (producto) => diasParaCaducar(hoy, producto.fechaCaducidad) >= 0,
    );
    if (vigentes.length === 0) {
      return respuestaError("Todos los productos ya caducaron", 400);
    }
    vigentes.sort((a, b) => a.fechaCaducidad.localeCompare(b.fechaCaducidad));
    const seleccion = vigentes.slice(0, MAX_PRODUCTOS);

    // 3. Llamar a Gemini
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("Falta el secret GEMINI_API_KEY");
      return respuestaError("El servidor no está configurado", 500);
    }

    const prompt = "Productos en mi despensa, ordenados del que caduca antes al que caduca después:\n" +
      armarListaProductos(seleccion, hoy) +
      "\nSugiere 3 recetas.";

    // Respuesta completa de Gemini (null mientras ningún modelo haya contestado)
    let datos: any = null;
    for (const modelo of MODELOS) {
      try {
        const respuesta = await fetch(URL_GEMINI, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
            "Api-Revision": "2026-05-20",
          },
          body: JSON.stringify({
            model: modelo,
            system_instruction: INSTRUCCIONES,
            input: prompt,
            response_format: {
              type: "text",
              mime_type: "application/json",
              schema: ESQUEMA,
            },
            generation_config: { thinking_level: "low" }, // responde más rápido
            store: false, // no guardar la conversación en Google
          }),
          // Si Gemini no termina de responder en este tiempo, se cancela la petición
          signal: AbortSignal.timeout(SEGUNDOS_POR_MODELO * 1000),
        });

        if (respuesta.ok) {
          datos = await respuesta.json();
          console.log("Recetas generadas con " + modelo);
          break;
        }
        console.error("Gemini (" + modelo + ") respondió", respuesta.status, await respuesta.text());
        // Cualquier otro error (key mala, petición mal formada) no se arregla cambiando de modelo
        if (respuesta.status !== 503 && respuesta.status !== 429) {
          break;
        }
      } catch (error) {
        // Se acabó el tiempo o falló la red: probamos con el siguiente modelo
        console.error("Gemini (" + modelo + ") no respondió:", error);
      }
    }

    if (!datos) {
      return respuestaError("No se pudieron generar recetas", 502);
    }

    // El texto viene en el paso "model_output": steps[].content[].text
    let textoGemini = "";
    for (const paso of datos.steps ?? []) {
      if (paso.type === "model_output") {
        for (const parte of paso.content ?? []) {
          if (parte.type === "text") {
            textoGemini += parte.text;
          }
        }
      }
    }

    // 4. Convertir el texto a JSON y completar el formato de la app
    let recetasIA: Receta[] = [];
    try {
      recetasIA = JSON.parse(textoGemini).recetas;
    } catch {
      console.error("Gemini no devolvió JSON válido:", textoGemini);
      return respuestaError("No se pudieron generar recetas", 502);
    }

    const recetas: Receta[] = recetasIA.map((receta) => ({
      titulo: receta.titulo,
      imagen: null,
      tiempo_min: receta.tiempo_min,
      ingredientes: receta.ingredientes,
      pasos: receta.pasos,
      aprovecha: receta.aprovecha,
      fuente: "ia",
    }));

    return Response.json({ recetas: recetas });
  }),
};
