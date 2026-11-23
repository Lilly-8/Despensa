import { useEffect, useState } from 'react';
import { Alert, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Encabezado from '../components/Encabezado';
import CampoTexto from '../components/CampoTexto';
import {
  actualizarItemCompra,
  agregarItemCompra,
  eliminarItemCompra,
  ItemCompra,
  leerListaCompras,
  leerProductos,
  nuevoId,
  Producto,
} from '../lib/almacenamiento';
import { diasRestantes, formatoMexico } from '../lib/fechas';
import { normalizarTexto } from '../lib/texto';
import { colores, espacios, bordes } from '../constants/colores';
import { LARGO_MAXIMO_CANTIDAD, LARGO_MAXIMO_NOMBRE } from '../constants/opciones';

interface SeccionCompras {
  titulo: string;
  data: ItemCompra[];
}

// "caduca el 12/11/2026", "caducó el 05/11/2026" o "sin fecha"
function textoCaducidad(producto: Producto): string {
  if (!producto.fechaCaducidad) return 'sin fecha';
  const fecha = formatoMexico(producto.fechaCaducidad);
  return diasRestantes(producto.fechaCaducidad) < 0 ? `caducó el ${fecha}` : `caduca el ${fecha}`;
}

export default function ComprasScreen({ navigation }: any) {
  const [items, setItems] = useState<ItemCompra[]>([]);
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('1');

  // Dos secciones: lo que falta comprar arriba, lo ya comprado abajo.
  // Las secciones vacías no se muestran.
  const secciones: SeccionCompras[] = [
    { titulo: 'Pendientes', data: items.filter((i) => !i.comprado) },
    { titulo: 'Comprados', data: items.filter((i) => i.comprado) },
  ].filter((s) => s.data.length > 0);

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

    // Acepta "1.5" y "1,5". Si no es un número, o es 0 o negativo ("-3"), usa 1.
    // (NaN > 0 es falso, así que "abc" también termina en 1.)
    const numero = Number(cantidad.replace(',', '.'));

    const nuevo: ItemCompra = {
      id: nuevoId(),
      nombre: nombreLimpio,
      cantidad: numero > 0 ? numero : 1,
      unidad: 'pza',
      comprado: false,
    };

    // ¿Ya hay algo con ese nombre en la despensa? (sin importar mayúsculas ni acentos;
    // "leche" encuentra "Leche" y "Leche entera")
    const productos = await leerProductos();
    const buscado = normalizarTexto(nombreLimpio);
    const enDespensa = productos.filter(
      (p) => p.estado === 'activo' && normalizarTexto(p.nombre).includes(buscado)
    );

    if (enDespensa.length === 0) {
      await guardarItem(nuevo);
      return;
    }

    // Avisa qué hay y cuándo caduca, y deja decidir
    const detalle = enDespensa
      .slice(0, 3)
      .map((p) => `• ${p.nombre}: ${p.cantidad} ${p.unidad}, ${textoCaducidad(p)}`)
      .join('\n');
    const resto = enDespensa.length > 3 ? `\n…y ${enDespensa.length - 3} más` : '';

    Alert.alert(
      `Ya tienes "${nombreLimpio}"`,
      `En tu despensa:\n${detalle}${resto}\n\n¿Agregarlo a la lista de todos modos?`,
      [
        { text: 'No agregar', style: 'cancel' },
        { text: 'Agregar', onPress: () => guardarItem(nuevo) },
      ]
    );
  };

  // Guarda el item en la lista y limpia el formulario
  const guardarItem = async (item: ItemCompra) => {
    try {
      await agregarItemCompra(item);
      setNombre('');
      setCantidad('1');
      await cargarLista();
    } catch {
      Alert.alert('No se pudo agregar', 'Intenta de nuevo.');
    }
  };

  const eliminar = async (id: string) => {
    try {
      await eliminarItemCompra(id);
      await cargarLista();
    } catch {
      Alert.alert('No se pudo eliminar', 'Intenta de nuevo.');
    }
  };

  // Cambia de pendiente a comprado, o al revés
  const alternarComprado = async (item: ItemCompra) => {
    try {
      await actualizarItemCompra({ ...item, comprado: !item.comprado });
      await cargarLista();
    } catch {
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
    }
  };

  // Abre el formulario de producto con los datos del item.
  // Al guardar ahí, el formulario lo quita de esta lista.
  const pasarADespensa = (item: ItemCompra) => {
    navigation.navigate('Producto', {
      itemCompraId: item.id,
      nombre: item.nombre,
      cantidad: item.cantidad,
      unidad: item.unidad,
    });
  };

  const renderItem = ({ item }: { item: ItemCompra }) => (
    <View style={styles.fila}>
      {/* Casilla: toda la parte izquierda se puede tocar */}
      <TouchableOpacity style={styles.casilla} onPress={() => alternarComprado(item)}>
        <Ionicons
          name={item.comprado ? 'checkbox-outline' : 'square-outline'}
          size={24}
          color={item.comprado ? colores.primario : colores.textoSuave}
        />
        {/* Máximo 2 líneas con "…": el nombre completo se ve al abrirlo */}
        <Text
          style={[styles.nombre, item.comprado ? styles.nombreComprado : null]}
          numberOfLines={2}
        >
          {item.nombre}
        </Text>
      </TouchableOpacity>
      <Text style={styles.cantidad}>
        {/* Solo la cantidad: la unidad se elige al pasarlo a la despensa */}
        x {item.cantidad}
      </Text>
      {/* Solo en los comprados: pasarlo a la despensa (mismo ícono que la tab Despensa) */}
      {item.comprado ? (
        <TouchableOpacity style={styles.botonIcono} onPress={() => pasarADespensa(item)}>
          <Ionicons name="file-tray-stacked-outline" size={20} color={colores.primario} />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={styles.botonIcono} onPress={() => eliminar(item.id)}>
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

      {/* Formulario para agregar: nombre, cantidad y + en la misma fila,
          para que la lista tenga más espacio (sobre todo con el teclado abierto) */}
      <View style={styles.formulario}>
        <View style={styles.campoNombre}>
          <CampoTexto
            etiqueta="Producto"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Leche, huevos..."
            maxLength={LARGO_MAXIMO_NOMBRE}
          />
        </View>
        <View style={styles.campoCantidad}>
          <CampoTexto
            etiqueta="Cantidad"
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="decimal-pad"
            maxLength={LARGO_MAXIMO_CANTIDAD}
          />
        </View>
        <TouchableOpacity
          style={[styles.botonAgregar, !nombre.trim() && styles.botonAgregarDesactivado]}
          onPress={agregar}
          disabled={!nombre.trim()}
          accessibilityLabel="Agregar a la lista"
        >
          <Ionicons name="add" size={20} color={colores.textoSobrePrimario} />
        </TouchableOpacity>
      </View>

      <SectionList
        sections={secciones}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>
              {section.titulo} · {section.data.length}
            </Text>
            {/* En los comprados: pasarlos todos de una vez a la despensa */}
            {section.titulo === 'Comprados' ? (
              <TouchableOpacity
                style={styles.pasarTodo}
                onPress={() => navigation.navigate('PasarDespensa')}
              >
                <Ionicons name="file-tray-stacked-outline" size={16} color={colores.primario} />
                <Text style={styles.pasarTodoTexto}>Pasar todo a la despensa</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>Tu lista está vacía</Text>
            <Text style={styles.vacioTexto}>Escribe arriba lo que necesitas comprar.</Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
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
    alignItems: 'flex-end', // el + queda a la altura de los campos, no de las etiquetas
    gap: espacios.s,
    paddingTop: espacios.m,
  },
  campoNombre: {
    flex: 1,
  },
  campoCantidad: {
    width: 80,
  },
  // Misma altura que un CampoTexto: mismo borde y relleno vertical, ícono del
  // tamaño de una línea de texto. marginBottom igual al margen de CampoTexto.
  botonAgregar: {
    borderWidth: bordes.grosor,
    borderColor: colores.primario,
    borderRadius: bordes.radio,
    backgroundColor: colores.primario,
    paddingVertical: espacios.s + espacios.xs,
    paddingHorizontal: espacios.m,
    marginBottom: espacios.m,
  },
  botonAgregarDesactivado: {
    opacity: 0.5,
  },
  listaContenido: {
    paddingBottom: espacios.xl,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacios.m,
  },
  casilla: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.m,
  },
  nombre: {
    flex: 1,
    fontSize: 17,
    color: colores.texto,
  },
  nombreComprado: {
    color: colores.textoSuave,
    textDecorationLine: 'line-through',
  },
  // Encabezado de sección: título a la izquierda y, en Comprados, la acción a la derecha
  seccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: espacios.l,
    paddingBottom: espacios.s,
    borderBottomWidth: bordes.grosor,
    borderBottomColor: colores.borde,
  },
  seccionTitulo: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colores.texto,
  },
  pasarTodo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.xs,
  },
  pasarTodoTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: colores.primario,
  },
  cantidad: {
    fontSize: 14,
    color: colores.textoSuave,
    marginRight: espacios.m,
  },
  botonIcono: {
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
