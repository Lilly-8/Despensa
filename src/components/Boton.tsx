import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colores, espacios, bordes } from '../constants/colores';

interface BotonProps {
  texto: string;
  onPress: () => void;
  secundario?: boolean;
  peligro?: boolean; 
  desactivado?: boolean;
}

export default function Boton({ texto, onPress, secundario, peligro, desactivado }: BotonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.boton,
        peligro && styles.botonPeligro,
        secundario && styles.botonSecundario,
        desactivado && styles.botonDesactivado,
      ]}
      onPress={onPress}
      disabled={desactivado}
    >
      <Text
        style={[
          styles.texto,
          secundario && styles.textoSecundario,
          secundario && peligro && styles.textoPeligro,
        ]}
      >
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
  botonPeligro: {
    backgroundColor: colores.urgente,
    borderColor: colores.urgente,
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
  textoPeligro: {
    color: colores.urgente,
  },
});
