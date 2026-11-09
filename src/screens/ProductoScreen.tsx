import { useEffect, useState } from 'react';
import {Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import CampoTexto from '../components/CampoTexto';
import ChipFiltro from '../components/ChipFiltro';
import Boton from '../components/Boton';
import useForm from '../hooks/useForm';
import {
  actualizarProducto,
  agregarProducto,
  eliminarProducto,
  obtenerProducto,
  Producto,
} from '../lib/almacenamiento';
import { fechaATexto, textoAFecha, hoy, sumarDias, formatoMexico } from '../lib/fechas';
import { pedirPermisoNotificaciones } from '../lib/notificaciones';
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

export default function ProductoScreen({ navigation, route }: any) {
  const id = route.params?.id;

  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [productoOriginal, setProductoOriginal] = useState<Producto | null>(null);

  const form = useForm<ProductoForm>({
    initialValues: {
      nombre: '',
      cantidad: '1',
      unidad: 'pza',
      categoria: 'otros',
      ubicacion: 'alacena',
      fechaCaducidad: '',
    },
    validate: (values) => {
      const errors: Partial<Record<keyof ProductoForm, string>> = {};

      if (!values.nombre.trim()) {
        errors.nombre = 'Escribe el nombre del producto';
      }

      if (!values.fechaCaducidad) {
        errors.fechaCaducidad = 'Elige la fecha de caducidad';
      }

      return errors;
    },
    onSubmit: async (values) => {
      if (id && !productoOriginal) return;

      const cantidad = Number(values.cantidad.replace(',', '.')) || 1;

      try {
        if (productoOriginal) {
          await actualizarProducto({
            ...productoOriginal,
            nombre: values.nombre.trim(),
            categoria: values.categoria,
            cantidad: cantidad,
            unidad: values.unidad,
            ubicacion: values.ubicacion,
            fechaCaducidad: values.fechaCaducidad,
          });
        } else {
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
          await agregarProducto(nuevo);

          await pedirPermisoNotificaciones();
        }
        navigation.goBack();
      } catch (error) {
        Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
      }
    },
  });

  const cargarProducto = async (idProducto: string) => {
    const producto = await obtenerProducto(idProducto);

    if (!producto) {
      Alert.alert('No se encontró el producto');
      navigation.goBack();
      return;
    }

    setProductoOriginal(producto);
    form.handleChange('nombre')(producto.nombre);
    form.handleChange('cantidad')(String(producto.cantidad));
    form.handleChange('unidad')(producto.unidad);
    form.handleChange('categoria')(producto.categoria);
    form.handleChange('ubicacion')(producto.ubicacion);
    form.handleChange('fechaCaducidad')(producto.fechaCaducidad);
  };

  useEffect(() => {
    if (id) {
      cargarProducto(id);
    }
  }, [id]);

  const errorFecha = form.touched.fechaCaducidad ? form.errors.fechaCaducidad : undefined;

  const confirmarEstado = (estado: 'consumido' | 'tirado') => {
    if (!productoOriginal) return;

    const mensaje =
      estado === 'consumido'
        ? `¿Marcar "${productoOriginal.nombre}" como consumido? Saldrá de tu despensa.`
        : `¿Marcar "${productoOriginal.nombre}" como tirado? Saldrá de tu despensa y contará como desperdicio.`;

    Alert.alert(estado === 'consumido' ? 'Me lo comí' : 'Lo tiré', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, marcar', onPress: () => guardarEstado(estado) },
    ]);
  };

  // Cambia solo el estado; lo demás se queda como estaba guardado.
  const guardarEstado = async (estado: 'consumido' | 'tirado') => {
    if (!productoOriginal) return;

    try {
      await actualizarProducto({ ...productoOriginal, estado: estado });
      navigation.goBack();
    } catch (error) {
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
    }
  };

  const confirmarEliminar = () => {
    if (!productoOriginal) return;

    Alert.alert(
      'Eliminar producto',
      `¿Seguro que quieres eliminar "${productoOriginal.nombre}"? No se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarProducto(productoOriginal.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('No se pudo eliminar', 'Intenta de nuevo.');
            }
          },
        },
      ]
    );
  };

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
          error={form.touched.nombre ? form.errors.nombre : undefined}
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
          style={[styles.selectorFecha, errorFecha ? styles.selectorFechaError : null]}
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
        {errorFecha ? <Text style={styles.textoError}>{errorFecha}</Text> : null}

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

        {/* Acciones: solo al editar un producto que ya existe */}
        {productoOriginal ? (
          <View style={styles.acciones}>
            <Text style={styles.etiqueta}>¿Ya no lo tienes?</Text>
            <Boton texto="Me lo comí" onPress={() => confirmarEstado('consumido')} secundario />
            <Boton texto="Lo tiré" onPress={() => confirmarEstado('tirado')} secundario />
            <Boton texto="Eliminar" onPress={confirmarEliminar} secundario peligro />
          </View>
        ) : null}
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
  selectorFechaError: {
    borderColor: colores.urgente,
  },
  textoError: {
    fontSize: 13,
    color: colores.urgente,
    marginBottom: espacios.s,
  },
  acciones: {
    marginTop: espacios.xl,
    paddingTop: espacios.l,
    borderTopWidth: bordes.grosor,
    borderTopColor: colores.borde,
    gap: espacios.s,
  },
});
