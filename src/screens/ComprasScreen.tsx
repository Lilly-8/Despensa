import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Encabezado from '../components/Encabezado';
import CampoTexto from '../components/CampoTexto';
import Boton from '../components/Boton';
import {
  agregarItemCompra,
  eliminarItemCompra,
  ItemCompra,
  leerListaCompras,
} from '../lib/almacenamiento';
import { colores, espacios, bordes } from '../constants/colores';

export default function ComprasScreen({ navigation }: any) {
  const [items, setItems] = useState<ItemCompra[]>([]);
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('1');

  const cargarLista = async () => {
    setItems(await leerListaCompras());
  };

  useEffect(() => {
    const sub = navigation.addListener('focus', () => {
      cargarLista();
    });

    return sub;
  }, [navigation]);

  const agregar = async () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;

    const nuevo: ItemCompra = {
      id: Date.now().toString(),
      nombre: nombreLimpio,
      // Acepta "1.5" y "1,5"; si no es un número válido, usa 1
      cantidad: Number(cantidad.replace(',', '.')) || 1,
      unidad: 'pza',
      comprado: false,
    };

    try {
      await agregarItemCompra(nuevo);
      setNombre('');
      setCantidad('1');
      await cargarLista();
    } catch (error) {
      Alert.alert('No se pudo agregar', 'Intenta de nuevo.');
    }
  };

  const eliminar = async (id: string) => {
    try {
      await eliminarItemCompra(id);
      await cargarLista();
    } catch (error) {
      Alert.alert('No se pudo eliminar', 'Intenta de nuevo.');
    }
  };

  const renderItem = ({ item }: { item: ItemCompra }) => (
    <View style={styles.fila}>
      <Text style={styles.nombre}>{item.nombre}</Text>
      <Text style={styles.cantidad}>
        {/* Solo la cantidad: la unidad se elige al pasarlo a la despensa */}
        x {item.cantidad}
      </Text>
      <TouchableOpacity style={styles.botonEliminar} onPress={() => eliminar(item.id)}>
        <Ionicons name="trash-outline" size={20} color={colores.textoSuave} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <Encabezado
        etiqueta="Compras"
        titulo="Lista del súper"
      />

      {/* Formulario para agregar: nombre y cantidad en la misma fila */}
      <View style={styles.formulario}>
        <View style={styles.campoNombre}>
          <CampoTexto
            etiqueta="Producto"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Leche, huevos..."
          />
        </View>
        <View style={styles.campoCantidad}>
          <CampoTexto
            etiqueta="Cantidad"
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      <Boton texto="Agregar a la lista" onPress={agregar} desactivado={!nombre.trim()} />

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>Tu lista está vacía</Text>
            <Text style={styles.vacioTexto}>Escribe arriba lo que necesitas comprar.</Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
        style={styles.lista}
        contentContainerStyle={styles.listaContenido}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
    paddingHorizontal: espacios.l,
  },
  formulario: {
    flexDirection: 'row',
    gap: espacios.s,
    paddingTop: espacios.m,
  },
  campoNombre: {
    flex: 1,
  },
  campoCantidad: {
    width: 96,
  },
  lista: {
    marginTop: espacios.m,
  },
  listaContenido: {
    paddingBottom: espacios.xl,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacios.m,
  },
  nombre: {
    flex: 1,
    fontSize: 17,
    color: colores.texto,
  },
  cantidad: {
    fontSize: 14,
    color: colores.textoSuave,
    marginRight: espacios.m,
  },
  botonEliminar: {
    padding: espacios.xs,
  },
  separador: {
    height: bordes.grosor,
    backgroundColor: colores.borde,
  },
  vacio: {
    paddingTop: espacios.l,
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
});
