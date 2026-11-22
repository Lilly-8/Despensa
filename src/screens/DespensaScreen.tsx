import { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Encabezado from '../components/Encabezado';
import CampoTexto from '../components/CampoTexto';
import FilaProducto from '../components/FilaProducto';
import ChipFiltro from '../components/ChipFiltro';
import BarraSeleccion from '../components/BarraSeleccion';
import Boton from '../components/Boton';
import useSeleccion from '../hooks/useSeleccion';
import { leerProductos, Producto } from '../lib/almacenamiento';
import { grupoCaducidad } from '../lib/fechas';
import { normalizarTexto } from '../lib/texto';
import { colores, espacios, bordes } from '../constants/colores';
import { CATEGORIAS, UBICACIONES, URGENCIAS, Opcion } from '../constants/opciones';

// Opciones del panel de filtros: '' = sin filtrar
const FILTRO_URGENCIAS: Opcion[] = [{ valor: '', texto: 'Todas' }, ...URGENCIAS];
const FILTRO_UBICACIONES: Opcion[] = [{ valor: '', texto: 'Todas' }, ...UBICACIONES];
const FILTRO_CATEGORIAS: Opcion[] = [{ valor: '', texto: 'Todas' }, ...CATEGORIAS];

// El texto de una opción elegida ('' si no hay filtro)
function textoDeOpcion(opciones: Opcion[], valor: string): string {
  if (valor === '') return '';
  const opcion = opciones.find((o) => o.valor === valor);
  return opcion ? opcion.texto : '';
}

// Ordena por fecha de caducidad: lo que caduca primero va arriba.
// Los productos sin fecha se van al final.
function ordenarPorFecha(productos: Producto[]): Producto[] {
  return [...productos].sort((a, b) => {
    if (!a.fechaCaducidad) return 1;
    if (!b.fechaCaducidad) return -1;
    return a.fechaCaducidad.localeCompare(b.fechaCaducidad);
  });
}

// route.params.urgencia: lo manda Inicio al tocar "Ya caducaron", "Esta semana"…
export default function DespensaScreen({ navigation, route }: any) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [urgencia, setUrgencia] = useState(''); // '' = todas
  const [categoria, setCategoria] = useState(''); // '' = todas
  const [ubicacion, setUbicacion] = useState(''); // '' = todas
  const [panelVisible, setPanelVisible] = useState(false); // panel de filtros
  const seleccion = useSeleccion(navigation); // selección múltiple (mantener pulsado)

  const textoBuscado = normalizarTexto(busqueda);
  const productosFiltrados = productos.filter(
    (p) =>
      normalizarTexto(p.nombre).includes(textoBuscado) &&
      (urgencia === '' || grupoCaducidad(p.fechaCaducidad) === urgencia) &&
      (categoria === '' || p.categoria === categoria) &&
      (ubicacion === '' || p.ubicacion === ubicacion)
  );
  const hayFiltros = textoBuscado !== '' || urgencia !== '' || categoria !== '' || ubicacion !== '';

  // Lo que se ve junto a "Filtrar", ej. "Caducados · Refrigerador"
  const filtrosActivos = [
    textoDeOpcion(URGENCIAS, urgencia),
    textoDeOpcion(UBICACIONES, ubicacion),
    textoDeOpcion(CATEGORIAS, categoria),
  ].filter((texto) => texto !== '');

  const cargarProductos = async () => {
    const guardados = await leerProductos();
    const activos = guardados.filter((p) => p.estado === 'activo');
    setProductos(ordenarPorFecha(activos));
  };


  useEffect(() => {
    const sub = navigation.addListener('focus', () => {
      cargarProductos();
    });

    return sub;
  }, [navigation]);

  // Si se llegó desde Inicio con una urgencia, se muestra solo eso.
  // Se compara con la anterior para aplicarla una sola vez cuando cambia
  // (así lo recomienda React, en lugar de un useEffect con setState).
  const urgenciaRecibida = route.params ? route.params.urgencia : undefined;
  const [urgenciaAnterior, setUrgenciaAnterior] = useState(urgenciaRecibida);
  if (urgenciaRecibida !== urgenciaAnterior) {
    setUrgenciaAnterior(urgenciaRecibida);
    if (urgenciaRecibida !== undefined) {
      setUrgencia(urgenciaRecibida);
      setUbicacion('');
      setCategoria('');
      setBusqueda('');
    }
  }

  // Ya aplicada, se borra el parámetro. Si no, tocar dos veces seguidas
  // "Ya caducaron" en Inicio no volvería a filtrar.
  useEffect(() => {
    if (urgenciaRecibida !== undefined) {
      navigation.setParams({ urgencia: undefined });
    }
  }, [urgenciaRecibida, navigation]);

  // En modo selección, tocar marca o desmarca; si no, abre el producto
  const tocarProducto = (producto: Producto) => {
    if (seleccion.enSeleccion) {
      seleccion.alternar(producto.id);
    } else {
      navigation.navigate('Producto', { id: producto.id });
    }
  };

  // Al buscar o filtrar se borra la selección, para no actuar sobre algo que ya no se ve
  const cambiarBusqueda = (texto: string) => {
    setBusqueda(texto);
    seleccion.limpiar();
  };

  const cambiarUrgencia = (valor: string) => {
    setUrgencia(valor);
    seleccion.limpiar();
  };

  // La ✕ junto a los filtros activos: quita los del panel (no la búsqueda)
  const quitarFiltros = () => {
    setUrgencia('');
    setUbicacion('');
    setCategoria('');
    seleccion.limpiar();
  };

  const cambiarCategoria = (valor: string) => {
    setCategoria(valor);
    seleccion.limpiar();
  };

  const cambiarUbicacion = (valor: string) => {
    setUbicacion(valor);
    seleccion.limpiar();
  };

  // Después de aplicar una acción a los seleccionados
  const terminarSeleccion = () => {
    seleccion.limpiar();
    cargarProductos();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarProductos();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <Encabezado
        etiqueta="Despensa"
        titulo="Tus productos"
      />

      <View style={styles.busqueda}>
        <CampoTexto
          etiqueta="Buscar"
          value={busqueda}
          onChangeText={cambiarBusqueda}
          placeholder="Nombre del producto"
        />
      </View>

      {/* Una sola línea: abre el panel y dice qué filtros hay puestos */}
      <View style={styles.filtros}>
        <TouchableOpacity style={styles.botonFiltrar} onPress={() => setPanelVisible(true)}>
          <Ionicons name="options-outline" size={20} color={colores.primario} />
          <Text style={styles.botonFiltrarTexto}>Filtrar</Text>
        </TouchableOpacity>
        <Text style={styles.filtrosActivos} numberOfLines={1}>
          {filtrosActivos.length > 0 ? filtrosActivos.join(' · ') : 'Sin filtros'}
        </Text>
        {filtrosActivos.length > 0 ? (
          <TouchableOpacity onPress={quitarFiltros}>
            <Ionicons name="close-outline" size={22} color={colores.textoSuave} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={productosFiltrados}
        renderItem={({ item }) => (
          <FilaProducto
            producto={item}
            onPress={() => tocarProducto(item)}
            onLongPress={() => seleccion.alternar(item.id)}
            seleccionado={seleccion.seleccionados.includes(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        ListEmptyComponent={
          hayFiltros ? (
            <View style={styles.vacio}>
              <Text style={styles.vacioTitulo}>Sin resultados</Text>
              <Text style={styles.vacioTexto}>
                Prueba con otro nombre o quita los filtros.
              </Text>
            </View>
          ) : (
            <View style={styles.vacio}>
              <Text style={styles.vacioTitulo}>Todavía no hay productos</Text>
              <Text style={styles.vacioTexto}>Toca + para agregar el primero.</Text>
            </View>
          )
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
      />

      {seleccion.enSeleccion ? (
        // Reemplaza a los botones flotantes mientras hay selección
        <BarraSeleccion
          seleccionados={seleccion.seleccionados}
          onCancelar={seleccion.limpiar}
          onTerminar={terminarSeleccion}
        />
      ) : (
        <>
          {/* Escanear: encima del +, con contorno para que el + siga siendo el principal */}
          <TouchableOpacity
            style={styles.botonEscanear}
            onPress={() => navigation.navigate('Escaner')}
          >
            <Ionicons name="barcode-outline" size={26} color={colores.primario} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonAgregar}
            onPress={() => navigation.navigate('Producto')}
          >
            <Ionicons name="add" size={28} color={colores.textoSobrePrimario} />
          </TouchableOpacity>
        </>
      )}

      {/* Panel de filtros: sube desde abajo, encima de la lista.
          Cada opción se aplica al tocarla; el botón de abajo solo cierra. */}
      <Modal
        visible={panelVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPanelVisible(false)} // botón "atrás" de Android
      >
        <View style={styles.velo}>
          {/* Tocar lo oscuro de arriba también cierra */}
          <TouchableOpacity style={styles.veloZona} onPress={() => setPanelVisible(false)} />

          <View style={styles.panel}>
            <View style={styles.panelEncabezado}>
              <Text style={styles.panelTitulo}>Filtrar</Text>
              <TouchableOpacity onPress={() => setPanelVisible(false)}>
                <Ionicons name="close-outline" size={26} color={colores.textoSuave} />
              </TouchableOpacity>
            </View>

            <Text style={styles.grupoTitulo}>Caducidad</Text>
            <View style={styles.opciones}>
              {FILTRO_URGENCIAS.map((opcion) => (
                <ChipFiltro
                  key={'urgencia-' + opcion.valor}
                  texto={opcion.texto}
                  seleccionado={urgencia === opcion.valor}
                  onPress={() => cambiarUrgencia(opcion.valor)}
                />
              ))}
            </View>

            <Text style={styles.grupoTitulo}>Ubicación</Text>
            <View style={styles.opciones}>
              {FILTRO_UBICACIONES.map((opcion) => (
                <ChipFiltro
                  key={'ubicacion-' + opcion.valor}
                  texto={opcion.texto}
                  seleccionado={ubicacion === opcion.valor}
                  onPress={() => cambiarUbicacion(opcion.valor)}
                />
              ))}
            </View>

            <Text style={styles.grupoTitulo}>Categoría</Text>
            <View style={styles.opciones}>
              {FILTRO_CATEGORIAS.map((opcion) => (
                <ChipFiltro
                  key={'categoria-' + opcion.valor}
                  texto={opcion.texto}
                  seleccionado={categoria === opcion.valor}
                  onPress={() => cambiarCategoria(opcion.valor)}
                />
              ))}
            </View>

            <View style={styles.panelBoton}>
              <Boton
                texto={
                  productosFiltrados.length === 1
                    ? 'Ver 1 producto'
                    : `Ver ${productosFiltrados.length} productos`
                }
                onPress={() => setPanelVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
    paddingHorizontal: espacios.l,
  },
  busqueda: {
    paddingTop: espacios.m,
  },
  // Línea de filtros: "Filtrar" a la izquierda, lo activo a la derecha
  filtros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.s,
    paddingVertical: espacios.s,
    borderBottomWidth: bordes.grosor,
    borderBottomColor: colores.borde,
  },
  botonFiltrar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.xs,
    paddingVertical: espacios.xs,
    paddingRight: espacios.s,
  },
  botonFiltrarTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: colores.primario,
  },
  filtrosActivos: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: colores.textoSuave,
  },
  // Panel de filtros (Modal)
  velo: {
    flex: 1,
    backgroundColor: colores.velo,
    justifyContent: 'flex-end',
  },
  veloZona: {
    flex: 1,
  },
  panel: {
    backgroundColor: colores.fondo,
    borderTopWidth: bordes.grosor,
    borderTopColor: colores.borde,
    borderTopLeftRadius: bordes.radio,
    borderTopRightRadius: bordes.radio,
    paddingHorizontal: espacios.l,
    paddingTop: espacios.m,
    paddingBottom: espacios.xl,
  },
  panelEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espacios.s,
  },
  panelTitulo: {
    fontSize: 22,
    fontWeight: '700',
    color: colores.texto,
  },
  grupoTitulo: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colores.texto,
    marginTop: espacios.m,
    marginBottom: espacios.s,
  },
  opciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacios.s,
  },
  panelBoton: {
    marginTop: espacios.l,
  },
  lista: {
    // Espacio para que los dos botones flotantes no tapen el último producto
    paddingBottom: espacios.xxl * 3 + espacios.m,
  },
  separador: {
    height: bordes.grosor,
    backgroundColor: colores.borde,
  },
  vacio: {
    paddingTop: espacios.xl,
  },
  vacioTitulo: {
    fontSize: 17,
    fontWeight: '600',
    color: colores.texto,
    marginBottom: espacios.xs,
  },
  vacioTexto: {
    fontSize: 15,
    color: colores.textoSuave,
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
  // Mismo tamaño que el +, justo encima, con borde fino en lugar de relleno
  botonEscanear: {
    position: 'absolute',
    right: espacios.l,
    bottom: espacios.l + 56 + espacios.s,
    width: 56,
    height: 56,
    borderRadius: bordes.radio,
    borderWidth: bordes.grosor,
    borderColor: colores.primario,
    backgroundColor: colores.fondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
