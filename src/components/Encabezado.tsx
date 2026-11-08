import { StyleSheet, Text, View } from 'react-native';
import { colores, espacios, bordes } from '../constants/colores';

interface EncabezadoProps {
  etiqueta: string;
  titulo: string;
  descripcion?: string;
}

export default function Encabezado({ etiqueta, titulo, descripcion }: EncabezadoProps) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.titulo}>{titulo}</Text>
      {descripcion ? <Text style={styles.descripcion}>{descripcion}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    paddingTop: espacios.xl,
    paddingBottom: espacios.l,
    borderBottomWidth: bordes.grosor,
    borderBottomColor: colores.borde,
  },
  etiqueta: {
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colores.primario,
    marginBottom: espacios.s,
  },
  titulo: {
    fontSize: 32,
    fontWeight: '700',
    color: colores.texto,
    marginBottom: espacios.s,
  },
  descripcion: {
    fontSize: 16,
    lineHeight: 24,
    color: colores.textoSuave,
  },
});
