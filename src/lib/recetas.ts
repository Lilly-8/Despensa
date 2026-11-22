import AsyncStorage from '@react-native-async-storage/async-storage';
import { Producto } from './almacenamiento';
import { diasRestantes, hoy } from './fechas';
import { normalizarTexto } from './texto';

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

// ---------- Productos que se mandan ----------

// Los productos que sirven para cocinar: activos, con fecha y sin caducar
export function productosParaRecetas(productos: Producto[]): Producto[] {
  return productos.filter(
    (p) => p.estado === 'activo' && p.fechaCaducidad !== '' && diasRestantes(p.fechaCaducidad) >= 0
  );
}

// ---------- Caché ----------
// Se guarda la última respuesta junto con una "huella" de la despensa con la que
// se pidió. Si la huella de hoy es igual, la despensa no cambió y no hace falta
// volver a pedir (cuida la cuota gratuita de Gemini y evita esperar un minuto).

export interface CacheRecetas {
  clave: string; // huella de la despensa con la que se pidieron
  recetas: Receta[];
  guardadoEn: string; // fecha y hora, en formato ISO
}

const CLAVE_CACHE = 'cache_recetas';

// Huella de la despensa: la fecha de hoy + nombre, fecha, cantidad y unidad de
// cada producto, ordenados para que el orden no importe.
// Incluye hoy porque las recetas dicen "caducan mañana": al día siguiente ya no sirven.
export function claveDespensa(productos: Producto[]): string {
  const partes = productos
    .map((p) => `${p.nombre}|${p.fechaCaducidad}|${p.cantidad}|${p.unidad}`)
    .sort();
  return hoy() + '#' + partes.join(';');
}

// Lee la caché. Si no hay o viene mal, regresa null.
export async function leerCacheRecetas(): Promise<CacheRecetas | null> {
  try {
    const texto = await AsyncStorage.getItem(CLAVE_CACHE);
    if (!texto) return null;

    const cache = JSON.parse(texto);
    // Se valida igual que la respuesta del servidor
    if (!cache || typeof cache.clave !== 'string' || !Array.isArray(cache.recetas)) return null;
    const recetas: Receta[] = cache.recetas.filter(esRecetaValida);
    if (recetas.length === 0) return null;

    return { clave: cache.clave, recetas: recetas, guardadoEn: String(cache.guardadoEn) };
  } catch (error) {
    console.error('Error al leer la caché de recetas:', error);
    return null;
  }
}

// Guarda la respuesta. Si falla no pasa nada grave: la próxima vez se vuelve a pedir.
export async function guardarCacheRecetas(clave: string, recetas: Receta[]): Promise<void> {
  try {
    const cache: CacheRecetas = { clave, recetas, guardadoEn: new Date().toISOString() };
    await AsyncStorage.setItem(CLAVE_CACHE, JSON.stringify(cache));
  } catch (error) {
    console.error('Error al guardar la caché de recetas:', error);
  }
}

// ---------- Qué ingredientes tengo ----------
// No se confía en lo que diga la IA: la app compara cada ingrediente con la
// despensa actual. Así siempre está al día (si compras jitomate después, la
// receta guardada ya lo muestra como "tienes").

// Palabras que no ayudan a comparar ("Tortillas de maíz" → tortillas, maiz)
const PALABRAS_VACIAS = ['con', 'del', 'las', 'los', 'una', 'para', 'sin', 'por'];

// También la usa la tabla de vida útil (src/lib/vidaUtil.ts)
export function palabras(texto: string): string[] {
  return normalizarTexto(texto)
    .split(/[^a-zñ]+/)
    .filter((p) => p.length > 2 && !PALABRAS_VACIAS.includes(p));
}

// Misma palabra aceptando plural: huevo/huevos, limon/limones
export function mismaPalabra(a: string, b: string): boolean {
  return a === b || a === b + 's' || a === b + 'es' || b === a + 's' || b === a + 'es';
}

// ¿Este ingrediente está en la despensa? Compara palabra por palabra
// ("Jamón de pavo" encuentra "Jamón"; "Sal" NO encuentra "Salsa").
// El agua es la única excepción: siempre se tiene.
export function tengoIngrediente(nombreIngrediente: string, productos: Producto[]): boolean {
  if (palabras(nombreIngrediente)[0] === 'agua') return true;
  return productos.some((producto) => mismoNombre(nombreIngrediente, producto.nombre));
}

// ¿Dos nombres hablan de lo mismo? Basta con que compartan una palabra
// ("Jamón de pavo" y "Jamón" sí; "Sal" y "Salsa" no).
// Sirve para la despensa y para la lista de compras.
export function mismoNombre(nombreA: string, nombreB: string): boolean {
  const deB = palabras(nombreB);
  return palabras(nombreA).some((palabra) => deB.some((otra) => mismaPalabra(palabra, otra)));
}

// La misma receta, con "tengo" recalculado contra lo que sí se puede usar
export function conIngredientesAlDia(receta: Receta, productos: Producto[]): Receta {
  // Activos y sin caducar. Los que no tienen fecha (sal, arroz…) sí cuentan.
  const disponibles = productos.filter(
    (p) => p.estado === 'activo' && (p.fechaCaducidad === '' || diasRestantes(p.fechaCaducidad) >= 0)
  );
  return {
    ...receta,
    ingredientes: receta.ingredientes.map((ingrediente) => ({
      ...ingrediente,
      tengo: tengoIngrediente(ingrediente.nombre, disponibles),
    })),
  };
}
