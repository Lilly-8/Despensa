import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
// Con nombre: el lint no lo encuentra dentro de "Notifications", aunque sí existe
import { AndroidImportance } from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { leerAjustes, leerProductos } from './almacenamiento';
import { formatoMexico, sumarDias, textoAFecha } from './fechas';


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
    try {
      await Notifications.setNotificationChannelAsync(CANAL_CADUCIDAD, {
        name: 'Caducidad',
        importance: AndroidImportance.HIGH,
      });
    } catch (error) {
      // Mensaje de error para saber por qué no llegan las notificaciones
      console.warn('No se pudo crear el canal de notificaciones:', error);
    }
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

// ¿Hay permiso de notificaciones? Solo consulta, no le pregunta nada al usuario.
export async function tienePermisoNotificaciones(): Promise<boolean> {
  try {
    const permiso = await Notifications.getPermissionsAsync();
    return permiso.granted;
  } catch {
    return false;
  }
}

// "mañana" o "en 3 días", para el título del aviso
function textoAnticipacion(dias: number): string {
  return dias === 1 ? 'mañana' : `en ${dias} días`;
}

// Productos que caducan el mismo día (comparten un solo aviso)
interface GrupoAviso {
  fechaCaducidad: string; // 'YYYY-MM-DD'
  nombres: string[];
}

// "Leche", "Leche y jamón", "Leche, jamón y huevos", "Leche, jamón, huevos y 2 más"
function unirNombres(nombres: string[]): string {
  if (nombres.length === 1) return nombres[0];
  if (nombres.length <= 3) {
    return nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1];
  }
  return nombres.slice(0, 3).join(', ') + ` y ${nombres.length - 3} más`;
}

// UN aviso por día, con todos los productos activos que caducan ese día.
export async function reprogramarAvisos(): Promise<void> {
  try {
    const permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted) {
      console.log('Avisos: no hay permiso de notificaciones, no se programa nada');
      return;
    }

    // 1. Quitar todos los avisos que había
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 2. Agrupar los productos activos por fecha de caducidad
    const productos = await leerProductos();

    // Días y hora elegidos en Ajustes ('09:00' → hora 9, minuto 0)
    const ajustes = await leerAjustes();
    const dias = ajustes.diasAnticipacion;
    const [hora, minuto] = ajustes.horaAviso.split(':').map(Number);
    const grupos: GrupoAviso[] = [];

    for (const producto of productos) {
      if (producto.estado !== 'activo' || !producto.fechaCaducidad) continue;

      const grupo = grupos.find((g) => g.fechaCaducidad === producto.fechaCaducidad);
      if (grupo) {
        grupo.nombres.push(producto.nombre);
      } else {
        grupos.push({ fechaCaducidad: producto.fechaCaducidad, nombres: [producto.nombre] });
      }
    }

    for (const grupo of grupos) {
      const fechaAviso = textoAFecha(sumarDias(grupo.fechaCaducidad, -dias));
      fechaAviso.setHours(hora, minuto, 0, 0);

      if (fechaAviso.getTime() <= Date.now()) {
        console.log(
          `Sin aviso para ${unirNombres(grupo.nombres)}: la hora del aviso (${fechaAviso.toLocaleString()}) ya pasó`
        );
        continue;
      }

      const varios = grupo.nombres.length > 1;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: varios
            ? `${grupo.nombres.length} productos caducan ${textoAnticipacion(dias)}`
            : `Caduca ${textoAnticipacion(dias)}`,
          body: varios
            ? `${unirNombres(grupo.nombres)}. Úsalos pronto.`
            : `"${grupo.nombres[0]}" caduca el ${formatoMexico(grupo.fechaCaducidad)}. Úsalo pronto.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fechaAviso,
          channelId: CANAL_CADUCIDAD,
        },
      });

      console.log(`Aviso el ${fechaAviso.toLocaleString()}: ${unirNombres(grupo.nombres)}`);
    }

    const programados = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`Avisos programados en total: ${programados.length}`);
  } catch (error) {
    console.error('Error al reprogramar los avisos:', error);
  }
}
