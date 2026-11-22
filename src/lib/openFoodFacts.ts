import { DatosCodigo } from './almacenamiento';

// Búsqueda de productos por código de barras en Open Food Facts
// (base de datos abierta, no pide key). Se usa la API v3:
// GET /api/v3/product/<código>?fields=product_name,product_name_es,categories_tags
//   - encontrado:    HTTP 200, { status: "success", product: { product_name_es, ... } }
//   - no encontrado: HTTP 404, { status: "failure", result: { id: "product_not_found" } }

const URL_PRODUCTO = 'https://world.openfoodfacts.org/api/v3/product/';

// Open Food Facts pide identificar la app con un User-Agent.
// Va solo el nombre genérico de la app, sin datos personales.
const USER_AGENT = 'DespensaApp/1.0';

const SEGUNDOS_MAXIMOS = 10;

// ---------- Categoría y ubicación ----------
// categories_tags trae etiquetas en inglés de general a específico, por ejemplo
// la leche: ["en:dairies", "en:milks-liquid-and-powder", "en:milks"].
// Se revisan en este orden y gana la primera regla que coincida.
// Bebidas va primero porque los jugos también traen "en:fruits".
const REGLAS_CATEGORIA = [
  { etiquetas: ['en:beverages'], categoria: 'bebidas' },
  { etiquetas: ['en:dairies'], categoria: 'lacteos' },
  { etiquetas: ['en:meats', 'en:poultry', 'en:fishes'], categoria: 'carnes' },
  { etiquetas: ['en:vegetables'], categoria: 'verduras' },
  { etiquetas: ['en:fruits'], categoria: 'frutas' },
  { etiquetas: ['en:canned-foods'], categoria: 'enlatados' },
  {
    etiquetas: ['en:cereals-and-their-products', 'en:breads', 'en:pastas', 'en:legumes'],
    categoria: 'granos',
  },
];

function categoriaDesdeEtiquetas(etiquetas: string[]): string {
  for (const regla of REGLAS_CATEGORIA) {
    if (regla.etiquetas.some((etiqueta) => etiquetas.includes(etiqueta))) {
      return regla.categoria;
    }
  }
  return 'otros';
}

// Dónde se suele guardar. Es solo una sugerencia: el usuario la cambia en el
// formulario y la caché recuerda lo que eligió.
function ubicacionSugerida(categoria: string): 'refrigerador' | 'alacena' {
  if (categoria === 'lacteos' || categoria === 'carnes' || categoria === 'verduras') {
    return 'refrigerador';
  }
  return 'alacena';
}

// ---------- Búsqueda ----------

// Regresa nombre, categoría y ubicación sugerida, o null si el código no está
// en la base. Si no hay internet, tarda demasiado o la respuesta viene mal,
// lanza un Error con un mensaje en español listo para mostrar.
export async function buscarProductoPorCodigo(codigo: string): Promise<DatosCodigo | null> {
  const url = URL_PRODUCTO + codigo + '?fields=product_name,product_name_es,categories_tags';

  // AbortController: cancela la consulta si tarda demasiado
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), SEGUNDOS_MAXIMOS * 1000);

  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: control.signal,
    });
  } catch {
    throw new Error(
      control.signal.aborted
        ? 'La búsqueda del código tardó demasiado.'
        : 'No hay conexión para buscar el código.'
    );
  } finally {
    clearTimeout(temporizador);
  }

  // 404 = el código no está en Open Food Facts (no es un error de la app)
  if (respuesta.status === 404) return null;

  if (!respuesta.ok) {
    console.log('Open Food Facts respondió', respuesta.status);
    throw new Error('No se pudo consultar el código.');
  }

  let datos: any;
  try {
    datos = await respuesta.json();
  } catch {
    throw new Error('No se pudo consultar el código.');
  }

  // De preferencia el nombre en español; si no hay, el nombre general
  const producto = datos?.product;
  const nombre = producto?.product_name_es || producto?.product_name || '';
  if (typeof nombre !== 'string' || !nombre.trim()) return null; // sin nombre no sirve

  const etiquetas = Array.isArray(producto?.categories_tags) ? producto.categories_tags : [];
  const categoria = categoriaDesdeEtiquetas(etiquetas);

  return {
    nombre: nombre.trim(),
    categoria: categoria,
    ubicacion: ubicacionSugerida(categoria),
  };
}
