import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Encabezado from '../components/Encabezado';
import CampoTexto from '../components/CampoTexto';
import FilaProducto from '../components/FilaProducto';
import ChipFiltro from '../components/ChipFiltro';
import { leerProductos, Producto } from '../lib/almacenamiento';
import { normalizarTexto } from '../lib/texto';
import { colores, espacios, bordes } from '../constants/colores';
import { CATEGORIAS, UBICACIONES, Opcion } from '../constants/opciones';


const FILTRO_CATEGORIAS: Opcion[] = [
  { valor: '', texto: 'Todas las categorías' },
  ...CATEGORIAS,
];
const FILTRO_UBICACIONES: Opcion[] = [
  { valor: '', texto: 'Todas las ubicaciones' },
  ...UBICACIONES,
];

// Ordena por fecha de caducidad: lo que caduca primero va arriba.
// Los productos sin fecha se van al final.
function ordenarPorFecha(productos: Producto[]): Producto[] {
  return [...productos].sort((a, b) => {
    if (!a.fechaCaducidad) return 1;
    if (!b.fechaCaducidad) return -1;
    return a.fechaCaducidad.localeCompare(b.fechaCaducidad);
  });
}

export default function DespensaScreen({ navigation }: any) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState(''); // '' = todas
  const [ubicacion, setUbicacion] = useState(''); // '' = todas


  const textoBuscado = normalizarTexto(busqueda);
  const productosFiltrados = productos.filter(
    (p) =>
      normalizarTexto(p.nombre).includes(textoBuscado) &&
      (categoria === '' || p.categoria === categoria) &&
      (ubicacion === '' || p.ubicacion === ubicacion)
  );
  const hayFiltros = textoBuscado !== '' || categoria !== '' || ubicacion !== '';

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
          onChangeText={setBusqueda}
          placeholder="Nombre del producto"
        />
      </View>

      <FlatList
        data={FILTRO_CATEGORIAS}
        renderItem={({ item }) => (
          <ChipFiltro
            texto={item.texto}
            seleccionado={categoria === item.valor}
            onPress={() => setCategoria(item.valor)}
          />
        )}
        keyExtractor={(item) => 'categoria-' + item.valor}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtros}
        contentContainerStyle={styles.filtrosContenido}
      />

      <FlatList
        data={FILTRO_UBICACIONES}
        renderItem={({ item }) => (
          <ChipFiltro
            texto={item.texto}
            seleccionado={ubicacion === item.valor}
            onPress={() => setUbicacion(item.valor)}
          />
        )}
        keyExtractor={(item) => 'ubicacion-' + item.valor}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtros}
        contentContainerStyle={styles.filtrosContenido}
      />

      <FlatList
        data={productosFiltrados}
        renderItem={({ item }) => (
          <FilaProducto
            producto={item}
            onPress={() => navigation.navigate('Producto', { id: item.id })}
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
  filtros: {
    flexGrow: 0, 
    flexShrink: 0, 
    marginHorizontal: -espacios.l, 
    marginBottom: espacios.s,
  },
  filtrosContenido: {
    paddingHorizontal: espacios.l,
    gap: espacios.s,
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
