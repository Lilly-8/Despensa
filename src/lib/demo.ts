import {
  guardarListaCompras,
  guardarProductos,
  leerListaCompras,
  leerProductos,
  Producto,
} from './almacenamiento';
import { hoy, sumarDias } from './fechas';

// Datos de demostración para presentar la app en vivo.
// Se AGREGAN a los datos del usuario (no los reemplazan) y se reconocen porque
// su id empieza con "demo-". Así "Borrar datos de demostración" quita solo esos.
// Las fechas se calculan desde el día en que se cargan, así la demo siempre
// muestra lo mismo: caducados, urgentes, de esta semana, de este mes y de largo plazo,
// un resumen del mes con comidos y tirados, y una lista de compras con comprados.

const PREFIJO = 'demo-';

// ¿Este producto o item de compras es de la demostración?
// Lo usan también "Pasar todo a la despensa" y el formulario de producto: lo que
// sale de un comprado de ejemplo también queda marcado como ejemplo.
export function esDemo(id: string): boolean {
  return id.startsWith(PREFIJO);
}

// [nombre, cantidad, unidad, categoría, ubicación, días para caducar, ¿fecha estimada?]
type FilaDemo = [string, number, string, string, Producto['ubicacion'], number, boolean];

const DESPENSA: FilaDemo[] = [
  ['Leche entera', 1, 'l', 'lacteos', 'refrigerador', -2, false],
  ['Tortillas de maíz', 1, 'kg', 'granos', 'refrigerador', -1, false],
  ['Pechuga de pollo', 1, 'kg', 'carnes', 'refrigerador', 1, true],
  ['Espinaca', 1, 'pza', 'verduras', 'refrigerador', 2, true],
  ['Yogur natural', 1, 'l', 'lacteos', 'refrigerador', 3, false],
  ['Jitomate', 2, 'kg', 'verduras', 'alacena', 5, true],
  ['Queso fresco', 1, 'pza', 'lacteos', 'refrigerador', 6, true],
  ['Pan de caja', 1, 'paquete', 'granos', 'alacena', 10, false],
  ['Huevo', 12, 'pza', 'lacteos', 'refrigerador', 20, true],
  ['Cebolla', 1, 'kg', 'verduras', 'refrigerador', 25, true],
  ['Carne molida', 500, 'g', 'carnes', 'congelador', 90, false],
  ['Arroz', 1, 'kg', 'granos', 'alacena', 200, false],
  ['Frijol negro', 1, 'kg', 'granos', 'alacena', 300, false],
  ['Atún en lata', 3, 'pza', 'enlatados', 'alacena', 400, false],
];

// Para el resumen del mes en Inicio: [nombre, categoría, estado]
const YA_NO_ESTAN: [string, string, 'consumido' | 'tirado'][] = [
  ['Aguacate', 'frutas', 'consumido'],
  ['Manzana', 'frutas', 'consumido'],
  ['Calabacita', 'verduras', 'consumido'],
  ['Leche deslactosada', 'lacteos', 'consumido'],
  ['Bistec de res', 'carnes', 'consumido'],
  ['Cilantro', 'verduras', 'tirado'],
  ['Fresas', 'frutas', 'tirado'],
];

// [nombre, cantidad, ¿comprado?]. Los comprados sirven para mostrar
// "Pasar todo a la despensa": limones y cilantro tienen fecha sugerida,
// las galletas no (son empacadas).
const COMPRAS: [string, number, boolean][] = [
  ['Jabón para trastes', 1, false],
  ['Café', 1, false],
  ['Aguacate', 3, false],
  ['Limones', 1, true],
  ['Cilantro', 1, true],
  ['Galletas Marías', 1, true],
];

// Agrega los datos de ejemplo a la despensa y a la lista de compras.
// Si ya estaban, primero quita los anteriores para que no se dupliquen.
export async function cargarDatosDemo(): Promise<void> {
  const fechaHoy = hoy();
  const creadoEn = new Date().toISOString();

  // Lo del usuario se queda; solo se reemplazan los ejemplos anteriores
  const productos = (await leerProductos()).filter((p) => !esDemo(p.id));
  const lista = (await leerListaCompras()).filter((item) => !esDemo(item.id));

  let numero = 1;
  for (const [nombre, cantidad, unidad, categoria, ubicacion, dias, estimada] of DESPENSA) {
    productos.push({
      id: PREFIJO + numero,
      nombre,
      categoria,
      cantidad,
      unidad,
      ubicacion,
      fechaCaducidad: sumarDias(fechaHoy, dias),
      fechaEstimada: estimada,
      estado: 'activo',
      creadoEn,
    });
    numero++;
  }

  for (const [nombre, categoria, estado] of YA_NO_ESTAN) {
    productos.push({
      id: PREFIJO + numero,
      nombre,
      categoria,
      cantidad: 1,
      unidad: 'pza',
      ubicacion: 'refrigerador',
      fechaCaducidad: sumarDias(fechaHoy, -1),
      fechaEstimada: false,
      estado,
      creadoEn,
      fechaSalida: fechaHoy, // hoy, para que cuente en el resumen de este mes
    });
    numero++;
  }

  for (const [nombre, cantidad, comprado] of COMPRAS) {
    lista.push({ id: PREFIJO + 'compra-' + numero, nombre, cantidad, unidad: 'pza', comprado });
    numero++;
  }

  await guardarProductos(productos);
  await guardarListaCompras(lista);
}

// Quita solo los datos de ejemplo; lo del usuario no se toca
export async function borrarDatosDemo(): Promise<void> {
  const productos = await leerProductos();
  await guardarProductos(productos.filter((p) => !esDemo(p.id)));

  const lista = await leerListaCompras();
  await guardarListaCompras(lista.filter((item) => !esDemo(item.id)));
}
