import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colores, espacios, bordes } from '../constants/colores';

interface AccionesProductoProps {
  onComi: () => void;
  onTire: () => void;
  onEliminar: () => void;
}

// Las tres salidas de un producto, en una fila con bordes finos.
// Las usan la pantalla de Producto (uno) y la barra de selección (varios),
// para que las mismas acciones se vean igual en toda la app.
export default function AccionesProducto({ onComi, onTire, onEliminar }: AccionesProductoProps) {
  return (
    <View style={styles.acciones}>
      <TouchableOpacity style={styles.accion} onPress={onComi}>
        <Ionicons name="restaurant-outline" size={22} color={colores.primario} />
        <Text style={styles.texto}>Me lo comí</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.accion, styles.divisor]} onPress={onTire}>
        <Ionicons name="trash-outline" size={22} color={colores.texto} />
        <Text style={styles.texto}>Lo tiré</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.accion, styles.divisor]} onPress={onEliminar}>
        <Ionicons name="close-circle-outline" size={22} color={colores.urgente} />
        <Text style={[styles.texto, styles.textoPeligro]}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  acciones: {
    flexDirection: 'row',
    borderWidth: bordes.grosor,
    borderColor: colores.borde,
    borderRadius: bordes.radio,
  },
  accion: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: espacios.s,
  },
  divisor: {
    borderLeftWidth: bordes.grosor,
    borderLeftColor: colores.borde,
  },
  texto: {
    marginTop: espacios.xs,
    fontSize: 14,
    fontWeight: '600',
    color: colores.texto,
  },
  textoPeligro: {
    color: colores.urgente,
  },
});
