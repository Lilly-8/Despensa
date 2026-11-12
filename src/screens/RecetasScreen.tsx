import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import Encabezado from '../components/Encabezado';
import Boton from '../components/Boton';
import { leerProductos, Producto } from '../lib/almacenamiento';
import { fechaATexto, formatoMexico } from '../lib/fechas';
import {
  claveDespensa,
  guardarCacheRecetas,
  leerCacheRecetas,
  pedirRecetas,
  productosParaRecetas,
  conIngredientesAlDia,
  Receta,
} from '../lib/recetas';
import { colores, espacios, bordes } from '../constants/colores';

// '2026-11-11T00:30:00.000Z' → '10/11/2026 a las 18:30' (hora local)
function textoFechaHora(iso: string): string {
  const fecha = new Date(iso);
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${formatoMexico(fechaATexto(fecha))} a las ${hora}:${minutos}`;
}

export default function RecetasScreen({ navigation }: any) {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(''); // '' = sin error

  // Caché: si lo que se ve viene de la caché, cuándo se guardó
  // y si la despensa sigue igual que cuando se pidieron
  const [desdeCache, setDesdeCache] = useState(false);
  const [guardadoEn, setGuardadoEn] = useState('');
  const [despensaIgual, setDespensaIgual] = useState(false);

  // Muestra las últimas recetas guardadas y revisa si la despensa cambió
  const cargarCache = async () => {
    // La despensa actual: sirve para saber qué ingredientes tienes
    const todos = await leerProductos();
    setProductos(todos);

    const cache = await leerCacheRecetas();
    if (!cache) return;

    setRecetas(cache.recetas);
    setDesdeCache(true);
    setGuardadoEn(cache.guardadoEn);
    setDespensaIgual(cache.clave === claveDespensa(productosParaRecetas(todos)));
  };

  // Cada vez que se entra a la tab (la despensa pudo cambiar en otra pantalla)
  useEffect(() => {
    const sub = navigation.addListener('focus', () => {
      cargarCache();
    });

    return sub;
  }, [navigation]);

  // Como en los ejemplos de clase: isConnected = hay wifi o datos;
  // isInternetReachable = además internet responde. Puede ser null ("aún no sé"),
  // y eso NO se trata como "sin conexión".
  const { isConnected, isInternetReachable } = useNetInfo();
  const sinConexion = isConnected === false || isInternetReachable === false;

  const generarRecetas = async () => {
    // Solo productos activos, con fecha y que no hayan caducado
    const todos = await leerProductos();
    setProductos(todos);
    const disponibles = productosParaRecetas(todos);

    if (disponibles.length === 0) {
      Alert.alert(
        'No hay productos para cocinar',
        'Agrega productos con fecha de caducidad en Despensa.'
      );
      return;
    }

    setError('');
    setCargando(true);
    try {
      const nuevas = await pedirRecetas(disponibles);
      setRecetas(nuevas);
      setDesdeCache(false); // son recién pedidas
      // Se guardan con la huella de la despensa que se mandó
      await guardarCacheRecetas(claveDespensa(disponibles), nuevas);
    } catch (e: any) {
      // Las recetas anteriores se quedan; arriba se explica qué pasó
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const renderReceta = ({ item }: { item: Receta }) => {
    // "Tienes X de Y" calculado contra tu despensa, no con lo que dijo la IA
    const alDia = conIngredientesAlDia(item, productos);
    const tengo = alDia.ingredientes.filter((i) => i.tengo).length;
    const total = alDia.ingredientes.length;

    return (
      <TouchableOpacity
        style={styles.receta}
        onPress={() => navigation.navigate('Receta', { receta: item })}
      >
        <Text style={styles.titulo}>{item.titulo}</Text>
        <Text style={styles.detalle}>
          {item.tiempo_min} min · Tienes {tengo} de {total} ingredientes
        </Text>
        {item.aprovecha.length > 0 ? (
          <Text style={styles.aprovecha}>Aprovecha: {item.aprovecha.join(', ')}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  // Lo que se ve cuando todavía no hay recetas en la lista
  const listaVacia = cargando ? (
    <View style={styles.cargando}>
      <ActivityIndicator size="large" color={colores.primario} />
      <Text style={styles.cargandoTitulo}>Buscando recetas con lo que tienes…</Text>
      <Text style={styles.cargandoTexto}>Puede tardar hasta un minuto.</Text>
    </View>
  ) : error ? undefined : (
    <View style={styles.vacio}>
      <Text style={styles.vacioTitulo}>Todavía no hay recetas</Text>
      <Text style={styles.vacioTexto}>
        Toca "Generar recetas" para ver ideas que aprovechan lo que está por caducar.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <Encabezado
        etiqueta="Recetas"
        titulo="Qué cocinar hoy"
      />

      {/* El indicador honesto: decir la verdad sobre la conexión */}
      {sinConexion ? (
        <View style={[styles.aviso, styles.avisoSinConexion]}>
          <Text style={styles.avisoTitulo}>Sin conexión</Text>
          <Text style={styles.avisoTexto}>
            Las recetas necesitan internet. Tu despensa, la lista de compras y los avisos
            funcionan igual.
          </Text>
        </View>
      ) : null}

      <View style={styles.boton}>
        <Boton
          texto={
            cargando
              ? 'Generando…'
              : desdeCache && despensaIgual
                ? 'Pedir otras recetas'
                : 'Generar recetas'
          }
          onPress={generarRecetas}
          desactivado={cargando || sinConexion}
        />
      </View>

      {/* Indicador honesto de la caché: de dónde viene lo que se ve */}
      {desdeCache && !cargando && recetas.length > 0 ? (
        <View style={[styles.aviso, despensaIgual ? styles.avisoCache : styles.avisoSinConexion]}>
          <Text style={styles.avisoTitulo}>
            {despensaIgual ? 'Recetas guardadas' : 'Tu despensa cambió'}
          </Text>
          <Text style={styles.avisoTexto}>
            {despensaIgual
              ? `Son del ${textoFechaHora(guardadoEn)}. Tu despensa no ha cambiado, así que no se volvieron a pedir.`
              : `Estas recetas son del ${textoFechaHora(guardadoEn)}, de antes de tus últimos cambios. Toca "Generar recetas" para actualizarlas.`}
          </Text>
        </View>
      ) : null}

      {/* Error: qué pasó y cómo seguir */}
      {error && !cargando ? (
        <View style={[styles.aviso, styles.avisoError]}>
          <Text style={styles.avisoTitulo}>No se pudieron generar recetas</Text>
          <Text style={styles.avisoTexto}>{error}</Text>
          {recetas.length > 0 ? (
            <Text style={styles.avisoTexto}>Abajo siguen las recetas anteriores.</Text>
          ) : null}
        </View>
      ) : null}

      {/* Ya hay recetas y se están pidiendo otras: avisar que se van a reemplazar */}
      {cargando && recetas.length > 0 ? (
        <View style={styles.actualizando}>
          <ActivityIndicator size="small" color={colores.primario} />
          <Text style={styles.actualizandoTexto}>
            Generando nuevas recetas; reemplazarán a las de abajo.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={recetas}
        renderItem={renderReceta}
        keyExtractor={(item, index) => index + '-' + item.titulo}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        ListEmptyComponent={listaVacia}
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
  // Avisos (sin conexión y error): borde fino con una barra de color a la izquierda
  aviso: {
    marginTop: espacios.m,
    padding: espacios.m,
    borderWidth: bordes.grosor,
    borderColor: colores.borde,
    borderRadius: bordes.radio,
    borderLeftWidth: 3,
    gap: espacios.xs,
  },
  avisoSinConexion: {
    borderLeftColor: colores.pronto,
  },
  avisoError: {
    borderLeftColor: colores.urgente,
  },
  avisoCache: {
    borderLeftColor: colores.tranquilo,
  },
  avisoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: colores.texto,
  },
  avisoTexto: {
    fontSize: 14,
    lineHeight: 20,
    color: colores.textoSuave,
  },
  cargando: {
    alignItems: 'center',
    paddingTop: espacios.xxl,
    gap: espacios.s,
  },
  cargandoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: colores.texto,
    marginTop: espacios.s,
  },
  cargandoTexto: {
    fontSize: 14,
    color: colores.textoSuave,
  },
  actualizando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.s,
    paddingVertical: espacios.s,
  },
  actualizandoTexto: {
    flex: 1,
    fontSize: 14,
    color: colores.textoSuave,
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
