import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import CampoTexto from '../components/CampoTexto';
import ChipFiltro from '../components/ChipFiltro';
import Boton from '../components/Boton';
import useForm from '../hooks/useForm';
import { agregarProducto, Producto } from '../lib/almacenamiento';
import { fechaATexto, textoAFecha, hoy, sumarDias, formatoMexico } from '../lib/fechas';
import { colores, espacios, bordes } from '../constants/colores';
import { UBICACIONES, UNIDADES, CATEGORIAS } from '../constants/opciones';

interface ProductoForm {
  nombre: string;
  cantidad: string;
  unidad: string;
  categoria: string;
  ubicacion: 'refrigerador' | 'congelador' | 'alacena';
  fechaCaducidad: string; 
}


const ATAJOS_FECHA = [
  { texto: '+3 días', dias: 3 },
  { texto: '+1 semana', dias: 7 },
  { texto: '+1 mes', dias: 30 },
];

export default function ProductoScreen({ navigation }: any) {
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  const form = useForm<ProductoForm>({
    initialValues: {
      nombre: '',
      cantidad: '1',
      unidad: 'pza',
      categoria: 'otros',
      ubicacion: 'alacena',
      fechaCaducidad: '',
    },
    onSubmit: async (values) => {
      const cantidad = Number(values.cantidad.replace(',', '.')) || 1;

      const nuevo: Producto = {
        id: Date.now().toString(),
        nombre: values.nombre.trim(),
        categoria: values.categoria,
        cantidad: cantidad,
        unidad: values.unidad,
        ubicacion: values.ubicacion,
        fechaCaducidad: values.fechaCaducidad,
        fechaEstimada: false,
        estado: 'activo',
        creadoEn: new Date().toISOString(),
      };

      try {
        await agregarProducto(nuevo);
        navigation.goBack();
      } catch (error) {
        Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
      }
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.contenedor}
    >
      <ScrollView
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

        <Text style={styles.etiqueta}>Fecha de caducidad</Text>
        <TouchableOpacity
          style={styles.selectorFecha}
          onPress={() => setMostrarCalendario(true)}
        >
          <Text
            style={form.values.fechaCaducidad ? styles.textoFecha : styles.textoSinFecha}
          >
            {form.values.fechaCaducidad
              ? formatoMexico(form.values.fechaCaducidad)
              : 'Elegir fecha'}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={colores.primario} />
        </TouchableOpacity>

        {mostrarCalendario ? (
          <DateTimePicker
            value={
              form.values.fechaCaducidad
                ? textoAFecha(form.values.fechaCaducidad)
                : new Date()
            }
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            accentColor={colores.primario}
            locale="es-MX"
            onValueChange={(evento, fecha) => {
              setMostrarCalendario(false);
              form.handleChange('fechaCaducidad')(fechaATexto(fecha));
            }}
            onDismiss={() => setMostrarCalendario(false)}
          />
        ) : null}

        <View style={styles.chips}>
          {ATAJOS_FECHA.map((atajo) => {
            const fechaAtajo = sumarDias(hoy(), atajo.dias);
            return (
              <ChipFiltro
                key={atajo.texto}
                texto={atajo.texto}
                seleccionado={form.values.fechaCaducidad === fechaAtajo}
                onPress={() => form.handleChange('fechaCaducidad')(fechaAtajo)}
              />
            );
          })}
        </View>

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

        <Boton
          texto={form.isSubmitting ? 'Guardando...' : 'Guardar'}
          onPress={form.handleSubmit}
          desactivado={form.isSubmitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  selectorFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: bordes.grosor,
    borderColor: colores.borde,
    borderRadius: bordes.radio,
    backgroundColor: colores.superficie,
    paddingVertical: espacios.s + espacios.xs,
    paddingHorizontal: espacios.m,
    marginBottom: espacios.s,
  },
  textoFecha: {
    fontSize: 16,
    color: colores.texto,
  },
  textoSinFecha: {
    fontSize: 16,
    color: colores.textoSuave,
  },
});
