import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Producto } from './almacenamiento';
import { formatoMexico, sumarDias, textoAFecha } from './fechas';

const DIAS_ANTICIPACION = 2;
const HORA_AVISO = 9; // 9:00
const MINUTO_AVISO = 0;


export const CANAL_CADUCIDAD = 'caducidad';
const CLAVE_PREGUNTADO = 'permisoNotificacionesPreguntado';

export async function configurarNotificaciones(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true, 
      shouldSetBadge: false,
    }),
  });


  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_CADUCIDAD, {
      name: 'Caducidad',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

function mostrarExplicacion(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      '¿Te avisamos antes de que caduque?',
      'Te mandaremos un aviso unos días antes de que caduque cada producto, para que lo uses a tiempo.',
      [
        { text: 'Ahora no', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Sí, avisarme', onPress: () => resolve(true) },
      ],
      { cancelable: false } 
    );
  });
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  try {
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;

    const preguntado = await AsyncStorage.getItem(CLAVE_PREGUNTADO);
    if (preguntado || !actual.canAskAgain) return false;

    await AsyncStorage.setItem(CLAVE_PREGUNTADO, 'si');

    const acepta = await mostrarExplicacion();
    if (!acepta) return false;

    const nuevo = await Notifications.requestPermissionsAsync();
    if (!nuevo.granted) {
      Alert.alert(
        'Avisos desactivados',
        'La app seguirá funcionando igual. Si cambias de opinión, podrás activarlos desde Ajustes.'
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error al pedir permiso de notificaciones:', error);
    return false;
  }
}

export async function programarAvisoCaducidad(producto: Producto): Promise<string | undefined> {
  try {
    if (!producto.fechaCaducidad) return undefined;

    const permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted) return undefined;

    const fechaAviso = textoAFecha(sumarDias(producto.fechaCaducidad, -DIAS_ANTICIPACION));
    fechaAviso.setHours(HORA_AVISO, MINUTO_AVISO, 0, 0);

    if (fechaAviso.getTime() <= Date.now()) {
      console.log(`Sin aviso para "${producto.nombre}": la hora del aviso ya pasó`);
      return undefined;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Caduca en ${DIAS_ANTICIPACION} días`,
        body: `"${producto.nombre}" caduca el ${formatoMexico(producto.fechaCaducidad)}. Úsalo pronto.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fechaAviso,
        channelId: CANAL_CADUCIDAD,
      },
    });

    console.log(`Aviso programado para "${producto.nombre}" el ${fechaAviso.toLocaleString()} (id ${id})`);
    return id;
  } catch (error) {
    console.error('Error al programar el aviso:', error);
    return undefined;
  }
}
