import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colores, espacios, bordes } from '../constants/colores';

interface ChipFiltroProps {
  texto: string;
  seleccionado: boolean;
  onPress: () => void;
}

export default function ChipFiltro({ texto, seleccionado, onPress }: ChipFiltroProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, seleccionado && styles.chipSeleccionado]}
      onPress={onPress}
    >
      <Text style={[styles.texto, seleccionado && styles.textoSeleccionado]}>
        {texto}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: bordes.grosor,
    borderColor: colores.borde,
    borderRadius: bordes.radio,
    paddingVertical: espacios.xs + 2,
    paddingHorizontal: espacios.m,
    backgroundColor: 'transparent',
  },
  chipSeleccionado: {
    backgroundColor: colores.primario,
    borderColor: colores.primario,
  },
  texto: {
    fontSize: 14,
    color: colores.texto,
  },
  textoSeleccionado: {
    color: colores.textoSobrePrimario,
    fontWeight: '600',
  },
});
