import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Boton from '../components/Boton';
import {
  guardarListaCompras,
  guardarProductos,
  ItemCompra,
  leerListaCompras,
  leerProductos,
} from '../lib/almacenamiento';
import { formatoMexico } from '../lib/fechas';
import { pedirPermisoNotificaciones, reprogramarAvisos } from '../lib/notificaciones';
import { DatosSugeridos, sugerirDatos } from '../lib/vidaUtil';
import { UBICACIONES } from '../constants/opciones';
import { colores, espacios, bordes } from '../constants/colores';

// Un comprado, con lo que la app propone para guardarlo en la despensa
interface Revision {
  item: ItemCompra;
  datos: DatosSugeridos;
}

// Revisión de todos los productos comprados para pasarlos de golpe a la despensa.
// La fecha, la categoría y la ubicación salen de la tabla de vida útil.
// Los que no tienen fecha (empacados, o lo que no está en la tabla) se quedan en
// Compras; al tocarlos se abre el formulario de siempre para ponérsela.
export default function PasarDespensaScreen({ navigation }: any) {
  const [comprados, setComprados] = useState<ItemCompra[]>([]);
  const [quitados, setQuitados] = useState<string[]>([]); // ids que no se pasan esta vez
  const [guardando, setGuardando] = useState(false);

  // Al volver del formulario, el item que se guardó ya no está en la lista
  useEffect(() => {
    const sub = navigation.addListener('focus', async () => {
      const lista = await leerListaCompras();
      setComprados(lista.filter((item) => item.comprado));
    });

    return sub;
  }, [navigation]);

  const revisiones: Revision[] = comprados
    .filter((item) => !quitados.includes(item.id))
    .map((item) => ({ item: item, datos: sugerirDatos(item.nombre) }));

  const conFecha = revisiones.filter((r) => r.datos.fecha !== '');
  const sinFecha = revisiones.length - conFecha.length;

  // Abre el formulario de siempre, ya lleno. Al guardar ahí, el formulario
  // pasa el producto a la despensa y lo quita de la lista de compras.
  const abrirFormulario = (revision: Revision) => {
    navigation.navigate('Producto', {
      itemCompraId: revision.item.id,
      nombre: revision.item.nombre,
      cantidad: revision.item.cantidad,
      unidad: revision.item.unidad,
      categoria: revision.datos.categoria,
      ubicacion: revision.datos.ubicacion,
    });
  };

  const quitar = (id: string) => {
    setQuitados([...quitados, id]);
  };

  // Guarda los que tienen fecha; los demás se quedan en Compras
  const guardarTodos = async () => {
    setGuardando(true);
    try {
      // Todos los productos nuevos en una sola escritura
      const productos = await leerProductos();
      const ahora = Date.now();
      let numero = 0;
      for (const revision of conFecha) {
        productos.push({
          // Date.now() solo no basta: todos se crean en el mismo milisegundo
          id: ahora + '-' + numero,
          nombre: revision.item.nombre,
          categoria: revision.datos.categoria,
          cantidad: revision.item.cantidad,
          unidad: revision.item.unidad,
          ubicacion: revision.datos.ubicacion,
          fechaCaducidad: revision.datos.fecha,
          fechaEstimada: true, // la puso la tabla de vida útil
          estado: 'activo',
          creadoEn: new Date().toISOString(),
        });
        numero++;
      }
      await guardarProductos(productos);

      // Quitar de la lista de compras solo los que se guardaron
      const guardados = conFecha.map((r) => r.item.id);
      const lista = await leerListaCompras();
      await guardarListaCompras(lista.filter((item) => !guardados.includes(item.id)));

      // Igual que al guardar un producto: permiso en contexto y avisos al día
      await pedirPermisoNotificaciones();
      await reprogramarAvisos();

      const n = conFecha.length;
      let mensaje = n === 1 ? '1 producto pasó a tu despensa.' : `${n} productos pasaron a tu despensa.`;
      if (sinFecha > 0) {
        mensaje +=
          sinFecha === 1
            ? ' 1 se quedó en Compras porque le falta la fecha.'
            : ` ${sinFecha} se quedaron en Compras porque les falta la fecha.`;
      }
      Alert.alert('Listo', mensaje, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const renderRevision = ({ item }: { item: Revision }) => {
    const ubicacion = UBICACIONES.find((u) => u.valor === item.datos.ubicacion);
    return (
      <View style={styles.fila}>
        <TouchableOpacity style={styles.info} onPress={() => abrirFormulario(item)}>
          <Text style={styles.nombre}>{item.item.nombre}</Text>
          <Text style={styles.detalle}>
            {item.item.cantidad} {item.item.unidad} · {ubicacion ? ubicacion.texto : ''}
          </Text>
          {item.datos.fecha ? (
            <Text style={styles.fecha}>{formatoMexico(item.datos.fecha)} · estimada</Text>
          ) : (
            <View style={styles.faltaFecha}>
              <Ionicons name="alert-circle-outline" size={16} color={colores.pronto} />
              <Text style={styles.faltaFechaTexto}>Falta fecha: tócalo para ponerla</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.botonQuitar} onPress={() => quitar(item.item.id)}>
          <Ionicons name="close-outline" size={22} color={colores.textoSuave} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.explicacion}>
        Revisa lo que compraste. Las fechas de los alimentos frescos son estimadas; toca un
        producto para cambiar algo o ponerle la fecha del empaque. Con ✕ se queda en Compras.
      </Text>

      <FlatList
        data={revisiones}
        renderItem={renderRevision}
        keyExtractor={(revision) => revision.item.id}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        ListEmptyComponent={
          <Text style={styles.vacio}>No quedan productos comprados por pasar.</Text>
        }
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.pie}>
        <Boton
          texto={
            guardando
              ? 'Guardando…'
              : conFecha.length === 0
                ? 'Ninguno tiene fecha todavía'
                : conFecha.length === 1
                  ? 'Guardar 1 en la despensa'
                  : `Guardar ${conFecha.length} en la despensa`
          }
          onPress={guardarTodos}
          desactivado={guardando || conFecha.length === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
    paddingHorizontal: espacios.l,
  },
  explicacion: {
    fontSize: 15,
    lineHeight: 22,
    color: colores.textoSuave,
    paddingTop: espacios.m,
    paddingBottom: espacios.m,
    borderBottomWidth: bordes.grosor,
    borderBottomColor: colores.borde,
  },
  lista: {
    paddingBottom: espacios.l,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacios.m,
  },
  info: {
    flex: 1,
    gap: espacios.xs,
  },
  nombre: {
    fontSize: 17,
    fontWeight: '600',
    color: colores.texto,
  },
  detalle: {
    fontSize: 14,
    color: colores.textoSuave,
  },
  fecha: {
    fontSize: 14,
    color: colores.texto,
  },
  faltaFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.xs,
  },
  faltaFechaTexto: {
    fontSize: 14,
    color: colores.texto,
  },
  botonQuitar: {
    padding: espacios.s,
  },
  separador: {
    height: bordes.grosor,
    backgroundColor: colores.borde,
  },
  vacio: {
    fontSize: 15,
    color: colores.textoSuave,
    paddingTop: espacios.l,
  },
  pie: {
    paddingTop: espacios.m,
    paddingBottom: espacios.xl,
    borderTopWidth: bordes.grosor,
    borderTopColor: colores.borde,
  },
});
