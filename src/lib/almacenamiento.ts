import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Producto {
  id: string; 
  nombre: string;
  categoria: string; 
  cantidad: number;
  unidad: string; 
  ubicacion: 'refrigerador' | 'congelador' | 'alacena';
  fechaCaducidad: string; 
  fechaEstimada: boolean; 
  codigoBarras?: string;
  notificacionId?: string; 
  estado: 'activo' | 'consumido' | 'tirado';
  creadoEn: string;
}

const CLAVE_PRODUCTOS = 'productos';

export async function leerProductos(): Promise<Producto[]> {
  try {
    const texto = await AsyncStorage.getItem(CLAVE_PRODUCTOS);
    return JSON.parse(texto || '[]');
  } catch (error) {
    console.error('Error al leer productos:', error);
    return [];
  }
}

// Si falla, el error llega a la pantalla para que pueda avisar al usuario.
export async function guardarProductos(productos: Producto[]): Promise<void> {
  await AsyncStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(productos));
}

// Agrega un producto nuevo al final de la lista
export async function agregarProducto(producto: Producto): Promise<void> {
  const productos = await leerProductos();
  productos.push(producto);
  await guardarProductos(productos);
}

// Busca un producto por su id. Si no existe, regresa undefined.
export async function obtenerProducto(id: string): Promise<Producto | undefined> {
  const productos = await leerProductos();
  return productos.find((p) => p.id === id);
}

// Reemplaza el producto que tenga el mismo id por la version nueva.
export async function actualizarProducto(productoActualizado: Producto): Promise<void> {
  const productos = await leerProductos();
  const nuevos = productos.map((p) =>
    p.id === productoActualizado.id ? productoActualizado : p
  );
  await guardarProductos(nuevos);
}

// Quita de la lista el producto con ese id.
export async function eliminarProducto(id: string): Promise<void> {
  const productos = await leerProductos();
  const nuevos = productos.filter((p) => p.id !== id);
  await guardarProductos(nuevos);
}

// Ajustes según el modelo de datos de docs/arquitectura.md
export interface Ajustes {
  diasAnticipacion: number; // por defecto 2
  horaAviso: string; // 'HH:MM', por defecto '09:00'
}

const CLAVE_AJUSTES = 'ajustes';

export const AJUSTES_POR_DEFECTO: Ajustes = {
  diasAnticipacion: 2,
  horaAviso: '09:00',
};

// Lee los ajustes. Si nunca se han guardado, regresa los de por defecto.
export async function leerAjustes(): Promise<Ajustes> {
  try {
    const texto = await AsyncStorage.getItem(CLAVE_AJUSTES);
    if (!texto) return AJUSTES_POR_DEFECTO;
    // Lo guardado encima de los de por defecto, por si falta algún campo
    return { ...AJUSTES_POR_DEFECTO, ...JSON.parse(texto) };
  } catch (error) {
    console.error('Error al leer ajustes:', error);
    return AJUSTES_POR_DEFECTO;
  }
}

// Si falla, el error llega a la pantalla para que pueda avisar al usuario.
export async function guardarAjustes(ajustes: Ajustes): Promise<void> {
  await AsyncStorage.setItem(CLAVE_AJUSTES, JSON.stringify(ajustes));
}
