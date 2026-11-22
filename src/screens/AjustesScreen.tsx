import { useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import ChipFiltro from '../components/ChipFiltro';
import Boton from '../components/Boton';
import { AJUSTES_POR_DEFECTO, guardarAjustes, leerAjustes } from '../lib/almacenamiento';
import { borrarDatosDemo, cargarDatosDemo } from '../lib/demo';
import { reprogramarAvisos, tienePermisoNotificaciones } from '../lib/notificaciones';
import { colores, espacios, bordes } from '../constants/colores';

const OPCIONES_DIAS = [1, 2, 3, 5, 7];


function horaATexto(fecha: Date): string {
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

function textoAHora(texto: string): Date {
  const [horas, minutos] = texto.split(':').map(Number);
  const fecha = new Date();
  fecha.setHours(horas, minutos, 0, 0);
  return fecha;
}

export default function AjustesScreen({ navigation }: any) {
  const [diasAnticipacion, setDiasAnticipacion] = useState(AJUSTES_POR_DEFECTO.diasAnticipacion);
  const [horaAviso, setHoraAviso] = useState(AJUSTES_POR_DEFECTO.horaAviso);
  const [mostrarReloj, setMostrarReloj] = useState(false);
  const [hayPermiso, setHayPermiso] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargarAjustes = async () => {
    const ajustes = await leerAjustes();
    setDiasAnticipacion(ajustes.diasAnticipacion);
    setHoraAviso(ajustes.horaAviso);
  };

  const revisarPermiso = async () => {
    setHayPermiso(await tienePermisoNotificaciones());
  };

  // Función async dentro del efecto, como en RecetaScreen: así el lint
  // entiende que el estado cambia después de leer, no al instante.
  useEffect(() => {
    const cargar = async () => {
      await cargarAjustes();
      await revisarPermiso();
    };
    cargar();
  }, []);

  // Al volver de la configuración del teléfono, revisar otra vez el permiso
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') revisarPermiso();
    });

    return () => sub.remove();
  }, []);

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarAjustes({ diasAnticipacion, horaAviso });
      // Mueve todos los avisos a los nuevos días y hora
      await reprogramarAvisos();
      navigation.goBack();
    } catch {
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // Para presentar la app: agrega datos de ejemplo junto a los tuyos
  const confirmarDemo = () => {
    Alert.alert(
      'Cargar datos de demostración',
      'Se agregarán productos y una lista de compras de ejemplo. Lo tuyo no se toca, y después puedes quitar solo los ejemplos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cargar',
          onPress: async () => {
            try {
              await cargarDatosDemo();
              await reprogramarAvisos(); // avisos de los productos de ejemplo
              Alert.alert('Listo', 'Se cargaron los datos de demostración.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch {
              Alert.alert('No se pudieron cargar', 'Intenta de nuevo.');
            }
          },
        },
      ]
    );
  };

  // Quita solo lo de ejemplo; lo del usuario se queda
  const confirmarBorrar = () => {
    Alert.alert(
      'Borrar datos de demostración',
      'Se quitarán los productos y la lista de compras de ejemplo. Lo tuyo no se toca.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await borrarDatosDemo();
              await reprogramarAvisos(); // los avisos quedan solo con tus productos
              Alert.alert('Listo', 'Se borraron los datos de demostración.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch {
              Alert.alert('No se pudieron borrar', 'Intenta de nuevo.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido}>
      {!hayPermiso ? (
        <View style={styles.avisoPermiso}>
          <Text style={styles.avisoTitulo}>Los avisos están desactivados</Text>
          <Text style={styles.avisoTexto}>
            Para recibir avisos antes de que caduquen tus productos, activa las
            notificaciones en la configuración del teléfono.
          </Text>
          <Boton
            texto="Abrir configuración del teléfono"
            onPress={() => Linking.openSettings()}
            secundario
          />
        </View>
      ) : null}

      <Text style={styles.etiqueta}>Avisarme con anticipación</Text>
      <View style={styles.chips}>
        {OPCIONES_DIAS.map((dias) => (
          <ChipFiltro
            key={dias}
            texto={dias === 1 ? '1 día antes' : `${dias} días antes`}
            seleccionado={diasAnticipacion === dias}
            onPress={() => setDiasAnticipacion(dias)}
          />
        ))}
      </View>

      <Text style={styles.etiqueta}>Hora del aviso</Text>
      <TouchableOpacity style={styles.selectorHora} onPress={() => setMostrarReloj(true)}>
        <Text style={styles.textoHora}>{horaAviso}</Text>
        <Ionicons name="time-outline" size={20} color={colores.primario} />
      </TouchableOpacity>

      {mostrarReloj ? (
        <DateTimePicker
          value={textoAHora(horaAviso)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onValueChange={(evento, fecha) => {
            setMostrarReloj(false);
            setHoraAviso(horaATexto(fecha));
          }}
          onDismiss={() => setMostrarReloj(false)}
        />
      ) : null}

      <View style={styles.guardar}>
        <Boton
          texto={guardando ? 'Guardando...' : 'Guardar'}
          onPress={guardar}
          desactivado={guardando}
        />
      </View>

      {/* Datos de la app: separados de los ajustes con un borde fino */}
      <View style={styles.datos}>
        <Text style={styles.etiqueta}>Datos de la app</Text>
        <Text style={styles.datosTexto}>
          Para presentar la app, agrega productos y una lista de compras de ejemplo. Se suman a
          los tuyos, y al terminar puedes quitar solo los ejemplos.
        </Text>
        <Boton texto="Cargar datos de demostración" onPress={confirmarDemo} secundario />
        <Boton
          texto="Borrar datos de demostración"
          onPress={confirmarBorrar}
          secundario
          peligro
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    padding: espacios.l,
  },
  avisoPermiso: {
    padding: espacios.m,
    marginBottom: espacios.l,
    borderWidth: bordes.grosor,
    borderColor: colores.borde,
    borderRadius: bordes.radio,
    borderLeftWidth: 3,
    borderLeftColor: colores.pronto,
    gap: espacios.s,
  },
  avisoTitulo: {
    fontSize: 17,
    fontWeight: '600',
    color: colores.texto,
  },
  avisoTexto: {
    fontSize: 15,
    lineHeight: 22,
    color: colores.textoSuave,
    marginBottom: espacios.xs,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '600',
    color: colores.texto,
    marginBottom: espacios.s,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacios.s,
    marginBottom: espacios.l,
  },
  selectorHora: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: bordes.grosor,
    borderColor: colores.borde,
    borderRadius: bordes.radio,
    backgroundColor: colores.superficie,
    paddingVertical: espacios.s + espacios.xs,
    paddingHorizontal: espacios.m,
    marginBottom: espacios.l,
  },
  textoHora: {
    fontSize: 16,
    color: colores.texto,
  },
  guardar: {
    marginTop: espacios.s,
  },
  datos: {
    marginTop: espacios.xl,
    paddingTop: espacios.l,
    borderTopWidth: bordes.grosor,
    borderTopColor: colores.borde,
    gap: espacios.s,
  },
  datosTexto: {
    fontSize: 15,
    lineHeight: 22,
    color: colores.textoSuave,
    marginBottom: espacios.s,
  },
});
