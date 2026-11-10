import { useEffect, useState } from 'react';
import { AppState, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Encabezado from '../components/Encabezado';
import FilaProducto from '../components/FilaProducto';
import { leerProductos, Producto } from '../lib/almacenamiento';
import { diasRestantes, nivelUrgencia } from '../lib/fechas';
import { colores, espacios, bordes } from '../constants/colores';

const DIAS_PRONTO = 30;

interface SeccionUrgencia {
  titulo: string;
  color: string;
  data: Producto[];
}

// Las secciones vacías no se muestran.
function armarSecciones(productos: Producto[]): SeccionUrgencia[] {
  const urgentes: Producto[] = [];
  const pronto: Producto[] = [];
  const tranquilos: Producto[] = [];

  const conFecha = productos
    .filter((p) => p.estado === 'activo' && p.fechaCaducidad !== '')
    .sort((a, b) => a.fechaCaducidad.localeCompare(b.fechaCaducidad));

  for (const producto of conFecha) {
    const dias = diasRestantes(producto.fechaCaducidad);
    if (dias > DIAS_PRONTO) continue; 

    const nivel = nivelUrgencia(dias);
    if (nivel === 'urgente') urgentes.push(producto);
    else if (nivel === 'pronto') pronto.push(producto);
    else tranquilos.push(producto);
  }

  const secciones: SeccionUrgencia[] = [
    { titulo: 'Úsalo ya · 3 días o menos', color: colores.urgente, data: urgentes },
    { titulo: 'Esta semana · 7 días o menos', color: colores.pronto, data: pronto },
    { titulo: 'Este mes', color: colores.tranquilo, data: tranquilos },
  ];

  return secciones.filter((s) => s.data.length > 0);
}

export default function InicioScreen({ navigation }: any) {
  const [secciones, setSecciones] = useState<SeccionUrgencia[]>([]);

  const cargarProductos = async () => {
    const guardados = await leerProductos();
    setSecciones(armarSecciones(guardados));
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') cargarProductos();
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = navigation.addListener('focus', () => {
      cargarProductos();
    });

    return sub;
  }, [navigation]);

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <SectionList
        sections={secciones}
        renderItem={({ item }) => (
          <FilaProducto
            producto={item}
            onPress={() => navigation.navigate('Producto', { id: item.id })}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.seccion}>
            <View style={[styles.marca, { backgroundColor: section.color }]} />
            <Text style={styles.seccionTitulo}>{section.titulo}</Text>
            <Text style={styles.seccionCantidad}>{section.data.length}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            <Encabezado
              etiqueta="Mi despensa"
              titulo="Lo que hay en casa"
            />
            {/* Acceso a Ajustes, arriba a la derecha */}
            <TouchableOpacity
              style={styles.botonAjustes}
              onPress={() => navigation.navigate('Ajustes')}
            >
              <Ionicons name="settings-outline" size={24} color={colores.primario} />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>Nada caduca pronto</Text>
            <Text style={styles.vacioTexto}>
              Aquí aparecerá lo que caduque en los próximos {DIAS_PRONTO} días.
            </Text>
          </View>
        }
        contentContainerStyle={styles.lista}
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
  botonAjustes: {
    position: 'absolute',
    top: espacios.xl,
    right: 0,
    padding: espacios.xs,
  },
  lista: {
    paddingBottom: espacios.xl,
  },
  seccion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: espacios.l,
    paddingBottom: espacios.s,
    borderBottomWidth: bordes.grosor,
    borderBottomColor: colores.borde,
  },
  marca: {
    width: 10,
    height: 10,
    borderRadius: bordes.radio / 2,
    marginRight: espacios.s,
  },
  seccionTitulo: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colores.texto,
  },
  seccionCantidad: {
    fontSize: 13,
    color: colores.textoSuave,
  },
  separador: {
    height: bordes.grosor,
    backgroundColor: colores.borde,
  },
  vacio: {
    marginTop: espacios.l,
    padding: espacios.m,
    borderWidth: bordes.grosor,
    borderColor: colores.borde,
    borderRadius: bordes.radio,
    borderLeftWidth: 3,
    borderLeftColor: colores.primario,
  },
  vacioTitulo: {
    fontSize: 17,
    fontWeight: '600',
    color: colores.texto,
    marginBottom: espacios.xs,
  },
  vacioTexto: {
    fontSize: 15,
    lineHeight: 22,
    color: colores.textoSuave,
  },
});
