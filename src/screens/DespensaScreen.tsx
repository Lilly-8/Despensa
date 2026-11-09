import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Encabezado from '../components/Encabezado';
import CampoTexto from '../components/CampoTexto';
import FilaProducto from '../components/FilaProducto';
import { leerProductos, Producto } from '../lib/almacenamiento';
import { colores, espacios, bordes } from '../constants/colores';

// Ordena por fecha de caducidad: lo que caduca primero va arriba.
// Los productos sin fecha se van al final.
function ordenarPorFecha(productos: Producto[]): Producto[] {
  return [...productos].sort((a, b) => {
    if (!a.fechaCaducidad) return 1;
    if (!b.fechaCaducidad) return -1;
    return a.fechaCaducidad.localeCompare(b.fechaCaducidad);
  });
}

// Prepara un texto para comparar: minúsculas, sin espacios a los lados
// y sin acentos ("Plátano" → "platano"). La ñ se queda igual.
function normalizarTexto(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ü/g, 'u');
}

export default function DespensaScreen({ navigation }: any) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');


  const textoBuscado = normalizarTexto(busqueda);
  const productosFiltrados = productos.filter((p) =>
    normalizarTexto(p.nombre).includes(textoBuscado)
  );

  const cargarProductos = async () => {
    const guardados = await leerProductos();
    setProductos(ordenarPorFecha(guardados));
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
          textoBuscado ? (
            <View style={styles.vacio}>
              <Text style={styles.vacioTitulo}>Sin resultados</Text>
              <Text style={styles.vacioTexto}>
                No hay productos que se llamen "{busqueda.trim()}".
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
  lista: {
    paddingBottom: espacios.xxl * 2,
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
});
