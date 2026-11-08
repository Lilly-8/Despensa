import { StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Encabezado from '../components/Encabezado';
import { colores, espacios, bordes } from '../constants/colores';

export default function DespensaScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <Encabezado
        etiqueta="Despensa"
        titulo="Tus productos"
      />

      <TouchableOpacity
        style={styles.botonAgregar}
        onPress={() => navigation.navigate('Producto')}
      >
        <Ionicons name="add" size={28} color={colores.textoSobrePrimario} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
    paddingHorizontal: espacios.l,
  },
  botonAgregar: {
    position: 'absolute',
    right: espacios.l,
    bottom: espacios.l,
    width: 56,
    height: 56,
    borderRadius: bordes.radio,
    backgroundColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
