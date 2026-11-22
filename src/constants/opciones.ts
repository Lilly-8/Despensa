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

export const CATEGORIAS: Opcion[] = [
  { valor: 'lacteos', texto: 'Lácteos' },
  { valor: 'verduras', texto: 'Verduras' },
  { valor: 'frutas', texto: 'Frutas' },
  { valor: 'carnes', texto: 'Carnes' },
  { valor: 'granos', texto: 'Granos' },
  { valor: 'enlatados', texto: 'Enlatados' },
  { valor: 'bebidas', texto: 'Bebidas' },
  { valor: 'otros', texto: 'Otros' },
];
