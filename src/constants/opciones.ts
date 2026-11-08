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
