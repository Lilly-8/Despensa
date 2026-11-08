import { ScrollView, StyleSheet, Text, View } from 'react-native';
import CampoTexto from '../components/CampoTexto';
import ChipFiltro from '../components/ChipFiltro';
import useForm from '../hooks/useForm';
import { colores, espacios } from '../constants/colores';
import { UBICACIONES, UNIDADES, CATEGORIAS } from '../constants/opciones';

interface ProductoForm {
  nombre: string;
  cantidad: string;
  unidad: string;
  categoria: string;
  ubicacion: string;
}

export default function ProductoScreen() {
  const form = useForm<ProductoForm>({
    initialValues: {
      nombre: '',
      cantidad: '1',
      unidad: 'pza',
      categoria: 'otros',
      ubicacion: 'alacena',
    },
    onSubmit: (values) => {
      console.log('Producto:', values);
    },
  });

  return (
    <ScrollView
      style={styles.contenedor}
      contentContainerStyle={styles.contenido}
      keyboardShouldPersistTaps="handled"
    >
      <CampoTexto
        etiqueta="Nombre"
        value={form.values.nombre}
        onChangeText={form.handleChange('nombre')}
        onBlur={form.handleBlur('nombre')}
        placeholder="Leche, jitomate, arroz..."
      />
      <CampoTexto
        etiqueta="Cantidad"
        value={form.values.cantidad}
        onChangeText={form.handleChange('cantidad')}
        onBlur={form.handleBlur('cantidad')}
        keyboardType="decimal-pad"
      />

      <Text style={styles.etiqueta}>Unidad</Text>
      <View style={styles.chips}>
        {UNIDADES.map((opcion) => (
          <ChipFiltro
            key={opcion.valor}
            texto={opcion.texto}
            seleccionado={form.values.unidad === opcion.valor}
            onPress={() => form.handleChange('unidad')(opcion.valor)}
          />
        ))}
      </View>

      <Text style={styles.etiqueta}>Categoría</Text>
      <View style={styles.chips}>
        {CATEGORIAS.map((opcion) => (
          <ChipFiltro
            key={opcion.valor}
            texto={opcion.texto}
            seleccionado={form.values.categoria === opcion.valor}
            onPress={() => form.handleChange('categoria')(opcion.valor)}
          />
        ))}
      </View>

      <Text style={styles.etiqueta}>Ubicación</Text>
      <View style={styles.chips}>
        {UBICACIONES.map((opcion) => (
          <ChipFiltro
            key={opcion.valor}
            texto={opcion.texto}
            seleccionado={form.values.ubicacion === opcion.valor}
            onPress={() => form.handleChange('ubicacion')(opcion.valor)}
          />
        ))}
      </View>
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
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '600',
    color: colores.texto,
    marginBottom: espacios.s,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacios.s,
    marginBottom: espacios.l,
  },
});
