import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leerProductos, Producto } from '../lib/almacenamiento';
import { conIngredientesAlDia, Receta } from '../lib/recetas';
import { colores, espacios, bordes } from '../constants/colores';

// Detalle de una receta. La receta completa llega por los parámetros de
// navegación desde RecetasScreen: navigation.navigate('Receta', { receta })
export default function RecetaScreen({ route }: any) {
  const [productos, setProductos] = useState<Producto[] | null>(null); // null = cargando

  // La despensa actual, para saber qué ingredientes tienes
  useEffect(() => {
    const cargar = async () => {
      setProductos(await leerProductos());
    };
    cargar();
  }, []);

  // "Tengo" calculado contra tu despensa, no con lo que dijo la IA.
  // Mientras se lee la despensa (milisegundos) se usa la receta tal cual llegó.
  const receta: Receta = productos
    ? conIngredientesAlDia(route.params.receta, productos)
    : route.params.receta;

  const tengo = receta.ingredientes.filter((i) => i.tengo);
  const faltan = receta.ingredientes.filter((i) => !i.tengo);

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido}>
      <Text style={styles.titulo}>{receta.titulo}</Text>

      <View style={styles.tiempo}>
        <Ionicons name="time-outline" size={18} color={colores.textoSuave} />
        <Text style={styles.tiempoTexto}>{receta.tiempo_min} min</Text>
      </View>

      {/* Lo que aprovecha de la despensa (lo que está por caducar) */}
      {receta.aprovecha.length > 0 ? (
        <View style={styles.aprovecha}>
          <Text style={styles.aprovechaTitulo}>Aprovecha</Text>
          <Text style={styles.aprovechaTexto}>{receta.aprovecha.join(', ')}</Text>
        </View>
      ) : null}

      {/* Ingredientes que ya tienes */}
      <Text style={styles.seccion}>Tienes · {tengo.length}</Text>
      {tengo.length === 0 ? (
        <Text style={styles.nada}>Ninguno de tu despensa.</Text>
      ) : (
        tengo.map((ingrediente, index) => (
          <View key={'tengo-' + index} style={styles.ingrediente}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colores.primario} />
            <Text style={styles.ingredienteNombre}>{ingrediente.nombre}</Text>
            <Text style={styles.ingredienteCantidad}>{ingrediente.cantidad}</Text>
          </View>
        ))
      )}

      {/* Ingredientes que faltan */}
      <Text style={styles.seccion}>Te faltan · {faltan.length}</Text>
      {faltan.length === 0 ? (
        <Text style={styles.nada}>Tienes todo lo necesario.</Text>
      ) : (
        faltan.map((ingrediente, index) => (
          <View key={'falta-' + index} style={styles.ingrediente}>
            <Ionicons name="ellipse-outline" size={20} color={colores.textoSuave} />
            <Text style={styles.ingredienteNombre}>{ingrediente.nombre}</Text>
            <Text style={styles.ingredienteCantidad}>{ingrediente.cantidad}</Text>
          </View>
        ))
      )}

      {/* Pasos, numerados */}
      <Text style={styles.seccion}>Pasos</Text>
      {receta.pasos.map((paso, index) => (
        <View key={'paso-' + index} style={styles.paso}>
          <Text style={styles.pasoNumero}>{index + 1}</Text>
          <Text style={styles.pasoTexto}>{paso}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    padding: espacios.l,
    paddingBottom: espacios.xxl,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    color: colores.texto,
    marginBottom: espacios.s,
  },
  tiempo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.xs,
    marginBottom: espacios.l,
  },
  tiempoTexto: {
    fontSize: 15,
    color: colores.textoSuave,
  },
  aprovecha: {
    padding: espacios.m,
    borderWidth: bordes.grosor,
    borderColor: colores.borde,
    borderRadius: bordes.radio,
    borderLeftWidth: 3,
    borderLeftColor: colores.primario,
    gap: espacios.xs,
  },
  aprovechaTitulo: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colores.primario,
  },
  aprovechaTexto: {
    fontSize: 15,
    lineHeight: 22,
    color: colores.texto,
  },
  seccion: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colores.texto,
    paddingTop: espacios.l,
    paddingBottom: espacios.s,
    marginBottom: espacios.xs,
    borderBottomWidth: bordes.grosor,
    borderBottomColor: colores.borde,
  },
  nada: {
    fontSize: 15,
    color: colores.textoSuave,
    paddingVertical: espacios.s,
  },
  ingrediente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.s,
    paddingVertical: espacios.s,
  },
  ingredienteNombre: {
    flex: 1,
    fontSize: 16,
    color: colores.texto,
  },
  ingredienteCantidad: {
    fontSize: 14,
    color: colores.textoSuave,
  },
  paso: {
    flexDirection: 'row',
    gap: espacios.m,
    paddingVertical: espacios.s,
  },
  pasoNumero: {
    width: 24,
    fontSize: 16,
    fontWeight: '700',
    color: colores.primario,
  },
  pasoTexto: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: colores.texto,
  },
});
