import tablaVidaUtil from '../../assets/vida_util.json';
import { hoy, sumarDias } from './fechas';
import { mismaPalabra, palabras } from './recetas';

// Fechas sugeridas para alimentos que no traen fecha impresa (frutas,
// verduras, carnes...). Los días salen de FoodKeeper (USDA, dominio público):
// el valor mayor de cada rango, contando desde el día de compra.
// La tabla se generó una vez fuera de la app (ver docs/arquitectura.md).

export interface VidaUtil {
  nombre: string; // "jitomate"
  sinonimos: string[]; // ["tomate"]
  categoria: string;
  refrigerador: number | null; // días; null = FoodKeeper no da un número
  alacena: number | null;
  congelador: number | null;
  foodkeeper: number; // id del alimento en FoodKeeper, para rastrear el dato
}

const TABLA: VidaUtil[] = tablaVidaUtil;

type Ubicacion = 'refrigerador' | 'congelador' | 'alacena';

const TEXTO_LUGAR = {
  refrigerador: 'el refrigerador',
  alacena: 'la alacena',
  congelador: 'el congelador',
};

// ¿Todas las palabras de "nombreTabla" están en el nombre del producto?
// "Pechuga de pollo" tiene "pollo"; "Carne molida de res" tiene "carne" y "molida".
function contiene(nombreProducto: string, nombreTabla: string): boolean {
  const delProducto = palabras(nombreProducto);
  return palabras(nombreTabla).every((palabra) =>
    delProducto.some((otra) => mismaPalabra(palabra, otra))
  );
}

// La tabla es de alimentos frescos. Si el nombre dice que es procesado
// ("Salsa de tomate", "Jugo de naranja", "Chile en polvo"), no se sugiere nada:
// esos traen fecha impresa.
const PALABRAS_PROCESADO = [
  'salsa', 'jugo', 'pure', 'sopa', 'mermelada', 'polvo', 'lata', 'enlatado',
  'enlatada', 'congelado', 'congelada', 'seco', 'seca', 'deshidratado', 'harina',
];

// El alimento de la tabla que corresponde a ese nombre, o null.
// La tabla trae primero los nombres de varias palabras, así gana el más
// específico ("carne molida" antes que "res").
export function buscarVidaUtil(nombre: string): VidaUtil | null {
  const delProducto = palabras(nombre);
  const esProcesado = PALABRAS_PROCESADO.some((procesado) =>
    delProducto.some((palabra) => mismaPalabra(procesado, palabra))
  );
  if (esProcesado) return null;

  for (const alimento of TABLA) {
    const nombres = [alimento.nombre, ...alimento.sinonimos];
    if (nombres.some((n) => contiene(nombre, n))) return alimento;
  }
  return null;
}

// 2 → "2 días", 45 → "2 meses"
function textoDuracion(dias: number): string {
  if (dias === 1) return '1 día';
  if (dias < 30) return dias + ' días';
  const meses = Math.round(dias / 30);
  return meses === 1 ? '1 mes' : meses + ' meses';
}

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export interface SugerenciaFecha {
  fecha: string; // 'YYYY-MM-DD', o '' si no hay dato para esa ubicación
  nota: string; // texto para mostrar debajo de la fecha
}

// Fecha sugerida para un producto según dónde se guarda.
// null = el alimento no está en la tabla.
export function sugerirFecha(nombre: string, ubicacion: Ubicacion): SugerenciaFecha | null {
  const alimento = buscarVidaUtil(nombre);
  if (!alimento) return null;

  const dias = alimento[ubicacion];

  // Sin dato para ese lugar: decir dónde sí hay
  if (dias === null) {
    let nota = `No hay fecha sugerida para ${alimento.nombre} en ${TEXTO_LUGAR[ubicacion]}.`;
    const otros: Ubicacion[] = ['refrigerador', 'alacena', 'congelador'];
    for (const otro of otros) {
      const diasOtro = alimento[otro];
      if (otro !== ubicacion && diasOtro !== null) {
        nota += ` En ${TEXTO_LUGAR[otro]} dura unos ${textoDuracion(diasOtro)}.`;
        break;
      }
    }
    return { fecha: '', nota: nota };
  }

  let nota = `${conMayuscula(alimento.nombre)}: dura unos ${textoDuracion(dias)} en ${TEXTO_LUGAR[ubicacion]}. Fecha estimada, revísala.`;

  // Carnes y lo que dura muy poco: recordar que se puede congelar
  if (ubicacion === 'refrigerador' && dias <= 3 && alimento.congelador !== null) {
    nota += ` Si no lo vas a usar pronto, congélalo (dura unos ${textoDuracion(alimento.congelador)}).`;
  }

  return { fecha: sumarDias(hoy(), dias), nota: nota };
}
