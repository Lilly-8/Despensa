// Edge Function "recetas"
// Recibe una lista de productos y devuelve una receta.
// Por ahora la receta es fija (de prueba); después la generará Gemini.

// Tipos del runtime de Supabase (Deno)
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface Receta {
  titulo: string;
  ingredientes: string[];
  pasos: string[];
  minutos: number;
}

// auth: "publishable" -> solo acepta peticiones que traigan la publishable key
// del proyecto en el header "apikey". Sin ella responde 401.
export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Usa POST" }, { status: 405 });
    }

    let productos: string[] = [];
    try {
      const cuerpo = await req.json();
      productos = cuerpo.productos;
    } catch {
      return Response.json({ error: "El cuerpo debe ser JSON" }, { status: 400 });
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      return Response.json(
        { error: "Manda { productos: [\"...\"] } con al menos un producto" },
        { status: 400 },
      );
    }

    const receta: Receta = {
      titulo: "Omelette de prueba",
      ingredientes: ["2 huevos", "1/4 de cebolla", "1 jitomate", "Sal al gusto"],
      pasos: [
        "Pica la cebolla y el jitomate.",
        "Bate los huevos con una pizca de sal.",
        "Sofríe la verdura 2 minutos y agrega el huevo.",
        "Cocina a fuego bajo hasta que cuaje y dobla a la mitad.",
      ],
      minutos: 10,
    };

    // Devolvemos también los productos recibidos para comprobar que llegaron bien
    return Response.json({ productosRecibidos: productos, receta: receta });
  }),
};
