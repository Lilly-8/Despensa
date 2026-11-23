import { useEffect, useState } from 'react';
import {Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import CampoTexto from '../components/CampoTexto';
import ChipFiltro from '../components/ChipFiltro';
import Boton from '../components/Boton';
import AccionesProducto from '../components/AccionesProducto';
import useForm from '../hooks/useForm';
import {
  actualizarProducto,
  agregarItemCompra,
  agregarProducto,
  eliminarItemCompra,
  leerListaCompras,
  eliminarProducto,
  guardarDatosDeCodigo,
  obtenerProducto,
  Producto,
} from '../lib/almacenamiento';
import { fechaATexto, textoAFecha, hoy, sumarDias, formatoMexico } from '../lib/fechas';
import { normalizarTexto } from '../lib/texto';
import { pedirPermisoNotificaciones, reprogramarAvisos } from '../lib/notificaciones';
import { sugerirFecha } from '../lib/vidaUtil';
import { esDemo } from '../lib/demo';
import { colores, espacios, bordes } from '../constants/colores';
import {
  UBICACIONES,
  UNIDADES,
  CATEGORIAS,
  LARGO_MAXIMO_NOMBRE,
  LARGO_MAXIMO_CANTIDAD,
} from '../constants/opciones';

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
  // Si viene de la lista de compras: el item que hay que quitar al guardar,
  // y sus datos para prellenar el formulario
  const itemCompraId = route.params?.itemCompraId;
  const nombreInicial = route.params?.nombre || '';
  const cantidadInicial = route.params?.cantidad ? String(route.params.cantidad) : '1';
  const unidadInicial = route.params?.unidad || 'pza';
  // Del escáner: lo que sugirió Open Food Facts o lo que se eligió la última vez
  const categoriaInicial = route.params?.categoria || 'otros';
  const ubicacionInicial = route.params?.ubicacion || 'alacena';
  // Si viene del escáner: el código leído y, si no se encontró el nombre, por qué
  const codigoBarras: string | undefined = route.params?.codigoBarras;
  const avisoCodigo: string | undefined = route.params?.avisoCodigo;
  const desdeCache: boolean = route.params?.desdeCache || false; // el nombre ya se conocía

  // Fecha sugerida (tabla de FoodKeeper): solo al agregar a mano o desde la
  // lista de compras. Al editar no se toca, y lo escaneado trae fecha impresa.
  const puedeSugerir = !id && !codigoBarras;
  const sugerenciaInicial = puedeSugerir ? sugerirFecha(nombreInicial, ubicacionInicial) : null;

  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [productoOriginal, setProductoOriginal] = useState<Producto | null>(null);
  // true = la fecha la puso la app; false = la eligió el usuario
  const [fechaEstimada, setFechaEstimada] = useState(!!sugerenciaInicial?.fecha);
  const [notaFecha, setNotaFecha] = useState(sugerenciaInicial?.nota || '');

  const form = useForm<ProductoForm>({
    initialValues: {
      nombre: nombreInicial,
      cantidad: cantidadInicial,
      unidad: unidadInicial,
      categoria: categoriaInicial,
      ubicacion: ubicacionInicial,
      fechaCaducidad: sugerenciaInicial?.fecha || '',
    },
    validate: (values) => {
      const errors: Partial<Record<keyof ProductoForm, string>> = {};

      if (!values.nombre.trim()) {
        errors.nombre = 'Escribe el nombre del producto';
      }

      // Vacía se guarda como 1 (como siempre); escrita, tiene que ser un número mayor que 0.
      // Acepta "1.5" y "1,5". Así "-3" o "0" no llegan a guardarse.
      const cantidadEscrita = values.cantidad.trim();
      if (cantidadEscrita !== '') {
        const numero = Number(cantidadEscrita.replace(',', '.'));
        if (isNaN(numero) || numero <= 0) {
          errors.cantidad = 'La cantidad debe ser mayor que 0';
        }
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
            fechaEstimada: fechaEstimada,
          });

          await reprogramarAvisos();
        } else {
          const nuevo: Producto = {
            // Si viene de un comprado de ejemplo, también es de ejemplo ("demo-…"),
            // para que "Borrar datos de demostración" lo quite
            id: (itemCompraId && esDemo(itemCompraId) ? 'demo-' : '') + Date.now(),
            nombre: values.nombre.trim(),
            categoria: values.categoria,
            cantidad: cantidad,
            unidad: values.unidad,
            ubicacion: values.ubicacion,
            fechaCaducidad: values.fechaCaducidad,
            fechaEstimada: fechaEstimada,
            codigoBarras: codigoBarras,
            estado: 'activo',
            creadoEn: new Date().toISOString(),
          };
          await agregarProducto(nuevo);

          await pedirPermisoNotificaciones();

          await reprogramarAvisos();

          // Venía de la lista de compras: ya está en la despensa, se quita de la lista
          if (itemCompraId) {
            await eliminarItemCompra(itemCompraId);
          }
        }

        // Si tiene código de barras (recién escaneado o al editar uno que ya lo
        // tenía), la caché se queda con lo que el usuario guardó, aunque lo
        // haya corregido: la próxima vez que lo escanee se llena igual
        const codigo = codigoBarras || productoOriginal?.codigoBarras;
        if (codigo) {
          await guardarDatosDeCodigo(codigo, {
            nombre: values.nombre,
            categoria: values.categoria,
            ubicacion: values.ubicacion,
            unidad: values.unidad,
          });
        }

        navigation.goBack();
      } catch {
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
    setFechaEstimada(producto.fechaEstimada);
  };

  // Vuelve a calcular la fecha sugerida con el nombre y la ubicación actuales.
  // No toca una fecha que el usuario eligió él mismo.
  const actualizarSugerencia = (nombre: string, ubicacion: ProductoForm['ubicacion']) => {
    if (!puedeSugerir) return;
    if (form.values.fechaCaducidad && !fechaEstimada) return;

    const sugerencia = sugerirFecha(nombre, ubicacion);
    if (!sugerencia) {
      // Ya no coincide con nada: quitar la fecha que había puesto la app
      if (fechaEstimada) form.handleChange('fechaCaducidad')('');
      setFechaEstimada(false);
      setNotaFecha('');
      return;
    }

    // Si no hay dato para esa ubicación, fecha vacía y la nota dice dónde sí hay
    form.handleChange('fechaCaducidad')(sugerencia.fecha);
    setFechaEstimada(sugerencia.fecha !== '');
    setNotaFecha(sugerencia.nota);
  };

  const cambiarNombre = (nombre: string) => {
    form.handleChange('nombre')(nombre);
    actualizarSugerencia(nombre, form.values.ubicacion);
  };

  const cambiarUbicacion = (ubicacion: ProductoForm['ubicacion']) => {
    form.handleChange('ubicacion')(ubicacion);
    actualizarSugerencia(form.values.nombre, ubicacion);
  };

  // Fecha elegida por el usuario (calendario o atajos): deja de ser estimada
  const elegirFecha = (fecha: string) => {
    form.handleChange('fechaCaducidad')(fecha);
    setFechaEstimada(false);
    setNotaFecha('');
  };

  // Función async dentro del efecto, igual que en Ajustes y RecetaScreen
  useEffect(() => {
    const cargar = async () => {
      if (id) {
        await cargarProducto(id);
      }
    };
    cargar();
    // Solo debe cargar cuando cambia el id. Si se agrega cargarProducto (como
    // sugiere el lint), se ejecutaría en cada render y recargaría sin parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const guardarEstado = async (estado: 'consumido' | 'tirado') => {
    if (!productoOriginal) return;

    try {
      // fechaSalida: para el resumen del mes en Inicio
      await actualizarProducto({ ...productoOriginal, estado: estado, fechaSalida: hoy() });
      await reprogramarAvisos();
    } catch {
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
      return;
    }

    // Consumido o tirado: en los dos casos ya no lo tienes.
    // Si ya está pendiente en la lista de compras, no preguntar.
    if (await yaEstaEnLaLista(productoOriginal)) {
      navigation.goBack();
    } else {
      preguntarAgregarACompras(productoOriginal, estado);
    }
  };

  // ¿Hay en la lista de compras un item PENDIENTE con ese nombre?
  // Misma comparación que el aviso de Compras: sin acentos y "contiene"
  // (si en la lista está "Leche", cuenta para "Leche entera").
  const yaEstaEnLaLista = async (producto: Producto): Promise<boolean> => {
    const lista = await leerListaCompras();
    const nombreProducto = normalizarTexto(producto.nombre);
    return lista.some(
      (item) => !item.comprado && nombreProducto.includes(normalizarTexto(item.nombre))
    );
  };

  // Después de consumir algo: ¿hay que volver a comprarlo?
  // Con cualquier respuesta se regresa a Despensa.
  const preguntarAgregarACompras = (producto: Producto, estado: 'consumido' | 'tirado') => {
    Alert.alert(
      '¿Agregarlo a la lista de compras?',
      estado === 'consumido'
        ? `Para no quedarte sin "${producto.nombre}".`
        : `Para reponer "${producto.nombre}".`,
      [
        { text: 'No', style: 'cancel', onPress: () => navigation.goBack() },
        {
          text: 'Sí, agregar',
          onPress: async () => {
            try {
              await agregarItemCompra({
                id: Date.now().toString(),
                nombre: producto.nombre,
                cantidad: producto.cantidad,
                unidad: producto.unidad,
                comprado: false,
              });
            } catch {
              Alert.alert('No se pudo agregar a la lista', 'Intenta de nuevo desde Compras.');
            }
            navigation.goBack();
          },
        },
      ],
      { cancelable: false } // en Android, tocar fuera no deja la pantalla sin regresar
    );
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
              // Ya no existe: sale de los avisos
              await reprogramarAvisos();
              navigation.goBack();
            } catch {
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
        {/* Viene del escáner sin nombre: decir por qué hay que escribirlo */}
        {codigoBarras && avisoCodigo ? (
          <View style={styles.avisoCodigo}>
            <Text style={styles.avisoCodigoTexto}>{avisoCodigo}</Text>
            <Text style={styles.codigoTexto}>Código {codigoBarras}</Text>
          </View>
        ) : null}

        {/* Viene del escáner con nombre: de dónde salió, discreto */}
        {codigoBarras && !avisoCodigo ? (
          <Text style={styles.codigoTexto}>
            Código {codigoBarras} ·{' '}
            {desdeCache ? 'Ya lo habías escaneado' : 'Datos de Open Food Facts'}
          </Text>
        ) : null}

        <CampoTexto
          etiqueta="Nombre"
          value={form.values.nombre}
          onChangeText={cambiarNombre}
          onBlur={form.handleBlur('nombre')}
          placeholder="Leche, jitomate, arroz..."
          error={form.touched.nombre ? form.errors.nombre : undefined}
          maxLength={LARGO_MAXIMO_NOMBRE}
        />
        <CampoTexto
          etiqueta="Cantidad"
          value={form.values.cantidad}
          onChangeText={form.handleChange('cantidad')}
          onBlur={form.handleBlur('cantidad')}
          keyboardType="decimal-pad"
          error={form.touched.cantidad ? form.errors.cantidad : undefined}
          maxLength={LARGO_MAXIMO_CANTIDAD}
        />

        {/* Unidad justo después de cantidad: "2" y "kg" son un solo dato */}
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

        {/* Ubicación antes de la fecha: la fecha sugerida depende de dónde se guarda */}
        <Text style={styles.etiqueta}>Ubicación</Text>
        <View style={styles.chips}>
          {UBICACIONES.map((opcion) => (
            <ChipFiltro
              key={opcion.valor}
              texto={opcion.texto}
              seleccionado={form.values.ubicacion === opcion.valor}
              onPress={() => cambiarUbicacion(opcion.valor as ProductoForm['ubicacion'])}
            />
          ))}
        </View>

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
        {notaFecha ? <Text style={styles.notaFecha}>{notaFecha}</Text> : null}

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
              elegirFecha(fechaATexto(fecha));
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
                onPress={() => elegirFecha(fechaAtajo)}
              />
            );
          })}
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

        <Boton
          texto={form.isSubmitting ? 'Guardando...' : 'Guardar'}
          onPress={form.handleSubmit}
          desactivado={form.isSubmitting}
        />

        {/* Acciones: solo al editar un producto que ya existe */}
        {productoOriginal ? (
          <View style={styles.acciones}>
            <Text style={styles.etiqueta}>¿Ya no lo tienes?</Text>
            {/* Igual que en la barra de selección múltiple */}
            <AccionesProducto
              onComi={() => confirmarEstado('consumido')}
              onTire={() => confirmarEstado('tirado')}
              onEliminar={confirmarEliminar}
            />
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
  // Nota de la fecha sugerida, debajo del selector
  notaFecha: {
    fontSize: 13,
    lineHeight: 19,
    color: colores.textoSuave,
    marginBottom: espacios.s,
  },
  // Aviso del escáner: borde fino con barra mostaza a la izquierda
  avisoCodigo: {
    padding: espacios.m,
    marginBottom: espacios.l,
    borderWidth: bordes.grosor,
    borderColor: colores.borde,
    borderRadius: bordes.radio,
    borderLeftWidth: 3,
    borderLeftColor: colores.pronto,
    gap: espacios.xs,
  },
  avisoCodigoTexto: {
    fontSize: 15,
    lineHeight: 22,
    color: colores.texto,
  },
  codigoTexto: {
    fontSize: 13,
    color: colores.textoSuave,
    marginBottom: espacios.m,
  },
  acciones: {
    marginTop: espacios.xl,
    paddingTop: espacios.l,
    borderTopWidth: bordes.grosor,
    borderTopColor: colores.borde,
    gap: espacios.s,
  },
});
