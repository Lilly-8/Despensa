import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Encabezado from '../components/Encabezado';
import Boton from '../components/Boton';
import { leerProductos } from '../lib/almacenamiento';
import { diasRestantes } from '../lib/fechas';
import { pedirRecetas, Receta } from '../lib/recetas';
import { colores, espacios, bordes } from '../constants/colores';

export default function RecetasScreen() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [cargando, setCargando] = useState(false);

  const generarRecetas = async () => {
    // Solo productos activos, con fecha y que no hayan caducado
    const productos = await leerProductos();
    const disponibles = productos.filter(
      (p) => p.estado === 'activo' && p.fechaCaducidad !== '' && diasRestantes(p.fechaCaducidad) >= 0
    );

    if (disponibles.length === 0) {
      Alert.alert(
        'No hay productos para cocinar',
        'Agrega productos con fecha de caducidad en Despensa.'
      );
      return;
    }

    setCargando(true);
    try {
      setRecetas(await pedirRecetas(disponibles));
    } catch (error: any) {
      Alert.alert('No se pudieron generar recetas', error.message);
    } finally {
      setCargando(false);
    }
  };

  const renderReceta = ({ item }: { item: Receta }) => {
    const tengo = item.ingredientes.filter((i) => i.tengo).length;
    const total = item.ingredientes.length;

    return (
      <View style={styles.receta}>
        <Text style={styles.titulo}>{item.titulo}</Text>
        <Text style={styles.detalle}>
          {item.tiempo_min} min · Tienes {tengo} de {total} ingredientes
        </Text>
        {item.aprovecha.length > 0 ? (
          <Text style={styles.aprovecha}>Aprovecha: {item.aprovecha.join(', ')}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <Encabezado
        etiqueta="Recetas"
        titulo="Qué cocinar hoy"
      />

      <View style={styles.boton}>
        <Boton
          texto={cargando ? 'Generando…' : 'Generar recetas'}
          onPress={generarRecetas}
          desactivado={cargando}
        />
      </View>

      <FlatList
        data={recetas}
        renderItem={renderReceta}
        keyExtractor={(item, index) => index + '-' + item.titulo}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        ListEmptyComponent={
          cargando ? undefined : (
            <View style={styles.vacio}>
              <Text style={styles.vacioTitulo}>Todavía no hay recetas</Text>
              <Text style={styles.vacioTexto}>
                Toca "Generar recetas" para ver ideas que aprovechan lo que está por caducar.
              </Text>
            </View>
          )
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
  boton: {
    paddingTop: espacios.m,
    paddingBottom: espacios.s,
  },
  lista: {
    paddingBottom: espacios.xl,
  },
  receta: {
    paddingVertical: espacios.m,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '600',
    color: colores.texto,
    marginBottom: espacios.xs,
  },
  detalle: {
    fontSize: 14,
    color: colores.textoSuave,
    marginBottom: espacios.xs,
  },
  aprovecha: {
    fontSize: 14,
    lineHeight: 20,
    color: colores.primario,
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
    lineHeight: 22,
    color: colores.textoSuave,
  },
});
