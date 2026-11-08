import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colores, espacios, bordes } from '../constants/colores';

interface BotonProps {
  texto: string;
  onPress: () => void;
  secundario?: boolean; 
  desactivado?: boolean;
}

export default function Boton({ texto, onPress, secundario, desactivado }: BotonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.boton,
        secundario && styles.botonSecundario,
        desactivado && styles.botonDesactivado,
      ]}
      onPress={onPress}
      disabled={desactivado}
    >
      <Text style={[styles.texto, secundario && styles.textoSecundario]}>
        {texto}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  boton: {
    backgroundColor: colores.primario,
    borderWidth: bordes.grosor,
    borderColor: colores.primario,
    borderRadius: bordes.radio,
    paddingVertical: espacios.m,
    paddingHorizontal: espacios.l,
    alignItems: 'center',
  },
  botonSecundario: {
    backgroundColor: 'transparent',
  },
  botonDesactivado: {
    opacity: 0.5,
  },
  texto: {
    fontSize: 16,
    fontWeight: '600',
    color: colores.textoSobrePrimario,
  },
  textoSecundario: {
    color: colores.primario,
  },
});
