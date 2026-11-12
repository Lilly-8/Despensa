import { Producto } from './almacenamiento';
import { hoy } from './fechas';

// Formato que devuelve la Edge Function "recetas" (docs/arquitectura.md, sección Backend)
export interface Ingrediente {
  nombre: string;
  cantidad: string; // "1 taza", "50 g"
  tengo: boolean; // true si está en la despensa
}

export interface Receta {
  titulo: string;
  imagen: string | null; // la IA no da fotos
  tiempo_min: number;
  ingredientes: Ingrediente[];
  pasos: string[];
  aprovecha: string[]; // ej. "espinacas (caducan mañana)"
  fuente: string; // "ia" o "spoonacular"
}

// La dirección y la llave vienen de .env.local (Expo lee las variables EXPO_PUBLIC_*).
// La publishable key es pública: solo identifica a la app. La key de Gemini
// vive en Supabase y la app nunca la ve.
const URL_RECETAS = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/recetas';
const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// La función prueba dos modelos de 40 s cada uno; esperamos un poco más
const SEGUNDOS_MAXIMOS = 90;

// ---------- Validación ----------
// Lo que llega por internet puede venir mal: se revisa antes de usarlo.

function esIngredienteValido(ingrediente: any): boolean {
  return (
    ingrediente !== null &&
    typeof ingrediente === 'object' &&
    typeof ingrediente.nombre === 'string' &&
    typeof ingrediente.cantidad === 'string' &&
    typeof ingrediente.tengo === 'boolean'
  );
}

function esListaDeTextos(lista: any): boolean {
  return Array.isArray(lista) && lista.every((texto) => typeof texto === 'string');
}

function esRecetaValida(receta: any): boolean {
  return (
    receta !== null &&
    typeof receta === 'object' &&
    typeof receta.titulo === 'string' &&
    receta.titulo.trim() !== '' &&
    typeof receta.tiempo_min === 'number' &&
    Array.isArray(receta.ingredientes) &&
    receta.ingredientes.every(esIngredienteValido) &&
    esListaDeTextos(receta.pasos) &&
    esListaDeTextos(receta.aprovecha)
  );
}

// ---------- Petición ----------

// Pide recetas a la Edge Function con los productos activos que tienen fecha.
// Regresa solo las recetas válidas. Si algo falla, lanza un Error con un
// mensaje en español listo para mostrar al usuario.
export async function pedirRecetas(productos: Producto[]): Promise<Receta[]> {
  const cuerpo = {
    productos: productos.map((p) => ({
      nombre: p.nombre,
      fechaCaducidad: p.fechaCaducidad,
      cantidad: p.cantidad,
      unidad: p.unidad,
    })),
    hoy: hoy(), // fecha local del teléfono, para que "caduca mañana" sea de México
  };

  // AbortController: permite cancelar el fetch si tarda demasiado
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), SEGUNDOS_MAXIMOS * 1000);

  let respuesta: Response;
  try {
    respuesta = await fetch(URL_RECETAS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: PUBLISHABLE_KEY,
      },
      body: JSON.stringify(cuerpo),
      signal: control.signal,
    });
  } catch (error) {
    // Sin internet, servidor caído o se acabó el tiempo
    throw new Error(
      control.signal.aborted
        ? 'Las recetas tardaron demasiado. Intenta de nuevo.'
        : 'No hay conexión con el servidor. Revisa tu internet.'
    );
  } finally {
    clearTimeout(temporizador);
  }

  // Leer el JSON (si no es JSON, la respuesta vino mal)
  let datos: any;
  try {
    datos = await respuesta.json();
  } catch (error) {
    throw new Error('La respuesta del servidor vino incompleta. Intenta de nuevo.');
  }

  // La función manda { error: "..." } cuando algo sale mal
  if (!respuesta.ok) {
    console.log('Recetas: el servidor respondió', respuesta.status, datos);
    throw new Error(
      typeof datos?.error === 'string' ? datos.error : 'No se pudieron generar recetas.'
    );
  }

  if (!datos || !Array.isArray(datos.recetas)) {
    throw new Error('La respuesta del servidor vino incompleta. Intenta de nuevo.');
  }

  // Se quedan solo las recetas completas; las incompletas se descartan
  const validas: Receta[] = datos.recetas.filter(esRecetaValida);
  if (validas.length < datos.recetas.length) {
    console.log(`Recetas: se descartaron ${datos.recetas.length - validas.length} incompletas`);
  }
  if (validas.length === 0) {
    throw new Error('No se pudieron generar recetas. Intenta de nuevo.');
  }

  return validas;
}
