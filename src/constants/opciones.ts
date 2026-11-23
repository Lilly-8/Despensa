// Largo máximo al escribir. 60 letras alcanzan para nombres reales
// ("Leche Lala entera deslactosada 1 litro" tiene 38) y evitan filas enormes.
export const LARGO_MAXIMO_NOMBRE = 60;
export const LARGO_MAXIMO_CANTIDAD = 6; // "1000.5"

export interface Opcion {
  valor: string;
  texto: string;
}

export const UBICACIONES: Opcion[] = [
  { valor: 'refrigerador', texto: 'Refrigerador' },
  { valor: 'alacena', texto: 'Alacena' },
  { valor: 'congelador', texto: 'Congelador' },
];

export const UNIDADES: Opcion[] = [
  { valor: 'pza', texto: 'pza' },
  { valor: 'kg', texto: 'kg' },
  { valor: 'g', texto: 'gramos' },
  { valor: 'l', texto: 'litro' },
  { valor: 'ml', texto: 'ml' },
  { valor: 'paquete', texto: 'paquete' },
];

// Filtro por caducidad en Despensa. Los valores son los de grupoCaducidad (src/lib/fechas.ts).
export const URGENCIAS: Opcion[] = [
  { valor: 'caducados', texto: 'Caducados' },
  { valor: 'urgente', texto: '3 días o menos' },
  { valor: 'pronto', texto: '7 días o menos' },
  { valor: 'mes', texto: 'Este mes' },
  { valor: 'sinFecha', texto: 'Sin fecha' },
];

// Pensadas para una despensa promedio en México. Limpieza e higiene se dejan
// fuera a propósito: la app gira alrededor de la caducidad de la comida.
// Si se cambia un texto, el valor se queda igual para no afectar lo ya guardado
// (por eso "Lácteos y huevo" sigue siendo 'lacteos').
export const CATEGORIAS: Opcion[] = [
  { valor: 'frutas', texto: 'Frutas' },
  { valor: 'verduras', texto: 'Verduras' },
  { valor: 'carnes', texto: 'Carnes y pescados' },
  { valor: 'lacteos', texto: 'Lácteos y huevo' },
  { valor: 'panaderia', texto: 'Pan y tortillas' },
  { valor: 'granos', texto: 'Granos y pastas' },
  { valor: 'enlatados', texto: 'Enlatados' },
  { valor: 'condimentos', texto: 'Condimentos y salsas' },
  { valor: 'botanas', texto: 'Botanas, galletas y dulces' },
  { valor: 'bebidas', texto: 'Bebidas' },
  { valor: 'preparada', texto: 'Comida preparada' }, // sobras, guisos, comida para llevar
  { valor: 'otros', texto: 'Otros' },
];
