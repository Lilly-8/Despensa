import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

// Selección múltiple de productos (Inicio y Despensa).
// Cada pantalla que lo usa tiene su propia selección: se comparte el código, no los datos.
// Recibe navigation para borrar la selección cada vez que se vuelve a la pantalla.
export default function useSeleccion(navigation: any) {
  const [seleccionados, setSeleccionados] = useState<string[]>([]); // ids marcados
  const enSeleccion = seleccionados.length > 0;

  // Al volver a la pantalla, empieza sin nada seleccionado
  useEffect(() => {
    const sub = navigation.addListener('focus', () => {
      setSeleccionados([]);
    });

    return sub;
  }, [navigation]);

  // Android: el botón de atrás quita la selección en vez de salir de la pantalla
  useEffect(() => {
    if (!enSeleccion) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSeleccionados([]);
      return true; // ya se manejó: no regresa ni cierra la app
    });

    return () => sub.remove();
  }, [enSeleccion]);

  // Marca o desmarca un producto
  const alternar = (id: string) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((s) => s !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  // Quita toda la selección
  const limpiar = () => {
    setSeleccionados([]);
  };

  return { seleccionados, enSeleccion, alternar, limpiar };
}
