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

  useEffect(() => {
    cargarAjustes();
    revisarPermiso();
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
    } catch (error) {
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
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
});
