import { useEffect, useState } from 'react';
import { AppState, BackHandler, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Encabezado from '../components/Encabezado';
import FilaProducto from '../components/FilaProducto';
import BarraSeleccion from '../components/BarraSeleccion';
import { leerProductos, Producto } from '../lib/almacenamiento';
import { diasRestantes, hoy, nivelUrgencia } from '../lib/fechas';
import { colores, espacios, bordes } from '../constants/colores';

const DIAS_PRONTO = 30;

interface SeccionUrgencia {
  titulo: string;
  color: string;
  data: Producto[];
}

// Las secciones vacías no se muestran.
function armarSecciones(productos: Producto[]): SeccionUrgencia[] {
  const caducados: Producto[] = [];
  const urgentes: Producto[] = [];
  const pronto: Producto[] = [];
  const tranquilos: Producto[] = [];

  const conFecha = productos
    .filter((p) => p.estado === 'activo' && p.fechaCaducidad !== '')
    .sort((a, b) => a.fechaCaducidad.localeCompare(b.fechaCaducidad));

  for (const producto of conFecha) {
    const dias = diasRestantes(producto.fechaCaducidad);
    if (dias > DIAS_PRONTO) continue;

    // Ya no se pueden usar: van aparte, no en "Úsalo ya"
    if (dias < 0) {
      caducados.push(producto);
      continue;
    }

    const nivel = nivelUrgencia(dias);
    if (nivel === 'urgente') urgentes.push(producto);
    else if (nivel === 'pronto') pronto.push(producto);
    else tranquilos.push(producto);
  }

  const secciones: SeccionUrgencia[] = [
    // Primero, para que se marquen como tirados y salgan de la despensa
    { titulo: 'Ya caducaron', color: colores.textoSuave, data: caducados },
    { titulo: 'Úsalo ya · 3 días o menos', color: colores.urgente, data: urgentes },
    { titulo: 'Esta semana · 7 días o menos', color: colores.pronto, data: pronto },
    { titulo: 'Este mes', color: colores.tranquilo, data: tranquilos },
  ];

  return secciones.filter((s) => s.data.length > 0);
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface ResumenMes {
  aprovechados: number;
  tirados: number;
}

// Cuántos productos se marcaron este mes como "Me lo comí" y "Lo tiré".
// Los que se marcaron antes de guardar fechaSalida no cuentan.
function resumenDelMes(productos: Producto[]): ResumenMes {
  const mesActual = hoy().slice(0, 7); // 'YYYY-MM'
  let aprovechados = 0;
  let tirados = 0;

  for (const producto of productos) {
    if (!producto.fechaSalida || producto.fechaSalida.slice(0, 7) !== mesActual) continue;
    if (producto.estado === 'consumido') aprovechados++;
    else if (producto.estado === 'tirado') tirados++;
  }

  return { aprovechados, tirados };
}

export default function InicioScreen({ navigation }: any) {
  const [secciones, setSecciones] = useState<SeccionUrgencia[]>([]);
  const [resumen, setResumen] = useState<ResumenMes>({ aprovechados: 0, tirados: 0 });
  const [seleccionados, setSeleccionados] = useState<string[]>([]); // ids marcados
  const enSeleccion = seleccionados.length > 0;

  const cargarProductos = async () => {
    const guardados = await leerProductos();
    setSecciones(armarSecciones(guardados));
    setResumen(resumenDelMes(guardados));
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') cargarProductos();
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = navigation.addListener('focus', () => {
      setSeleccionados([]);
      cargarProductos();
    });

    return sub;
  }, [navigation]);

  // Android: el botón de atrás quita la selección en vez de salir de la pantalla
  useEffect(() => {
    if (!enSeleccion) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSeleccionados([]);
      return true; // ya se manejó: no regresa ni cierra la app
    });

    return () => sub.remove();
  }, [enSeleccion]);

  // Marca o desmarca un producto
  const alternarSeleccion = (id: string) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter((s) => s !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  // En modo selección, tocar marca o desmarca; si no, abre el producto
  const tocarProducto = (producto: Producto) => {
    if (enSeleccion) {
      alternarSeleccion(producto.id);
    } else {
      navigation.navigate('Producto', { id: producto.id });
    }
  };

  // Después de aplicar una acción: la lista y el resumen del mes se actualizan
  const terminarSeleccion = () => {
    setSeleccionados([]);
    cargarProductos();
  };

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <SectionList
        sections={secciones}
        renderItem={({ item }) => (
          <FilaProducto
            producto={item}
            onPress={() => tocarProducto(item)}
            onLongPress={() => alternarSeleccion(item.id)}
            seleccionado={seleccionados.includes(item.id)}
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

            {/* Resumen del mes: lo que se aprovechó y lo que se tiró */}
            <View style={styles.resumen}>
              <Text style={styles.resumenMes}>{MESES[new Date().getMonth()]}</Text>
              {resumen.aprovechados + resumen.tirados === 0 ? (
                <Text style={styles.resumenVacio}>
                  Cuando marques productos como comidos o tirados, aquí verás tu resumen del mes.
                </Text>
              ) : (
                <View>
                  <View style={styles.resumenNumeros}>
                    <View style={styles.resumenDato}>
                      <Text style={styles.resumenNumero}>{resumen.aprovechados}</Text>
                      <Text style={styles.resumenEtiqueta}>
                        {resumen.aprovechados === 1 ? 'aprovechado' : 'aprovechados'}
                      </Text>
                    </View>
                    <View style={[styles.resumenDato, styles.resumenDatoDerecho]}>
                      <Text style={styles.resumenNumero}>{resumen.tirados}</Text>
                      <Text style={styles.resumenEtiqueta}>
                        {resumen.tirados === 1 ? 'tirado' : 'tirados'}
                      </Text>
                    </View>
                  </View>

                  {/* Barra de proporción: cada parte crece según su número */}
                  <View style={styles.barra}>
                    <View style={[styles.barraAprovechados, { flex: resumen.aprovechados }]} />
                    <View style={[styles.barraTirados, { flex: resumen.tirados }]} />
                  </View>
                </View>
              )}
            </View>
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

      {enSeleccion ? (
        <BarraSeleccion
          seleccionados={seleccionados}
          onCancelar={() => setSeleccionados([])}
          onTerminar={terminarSeleccion}
        />
      ) : null}
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
  // Resumen del mes: franja con borde fino abajo (el de arriba es el del Encabezado)
  resumen: {
    paddingVertical: espacios.m,
    borderBottomWidth: bordes.grosor,
    borderBottomColor: colores.borde,
  },
  resumenMes: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colores.texto,
    marginBottom: espacios.s,
  },
  resumenVacio: {
    fontSize: 15,
    lineHeight: 22,
    color: colores.textoSuave,
  },
  resumenNumeros: {
    flexDirection: 'row',
  },
  resumenDato: {
    paddingRight: espacios.l,
  },
  resumenDatoDerecho: {
    paddingLeft: espacios.l,
    borderLeftWidth: bordes.grosor,
    borderLeftColor: colores.borde,
  },
  resumenNumero: {
    fontSize: 28,
    fontWeight: '700',
    color: colores.texto,
  },
  resumenEtiqueta: {
    fontSize: 14,
    color: colores.textoSuave,
  },
  barra: {
    flexDirection: 'row',
    height: 6,
    marginTop: espacios.m,
    borderRadius: bordes.radio / 2,
    overflow: 'hidden',
  },
  barraAprovechados: {
    backgroundColor: colores.primario,
  },
  barraTirados: {
    backgroundColor: colores.urgente,
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
