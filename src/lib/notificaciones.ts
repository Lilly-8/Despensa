import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { leerProductos } from './almacenamiento';
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
    try {
      await Notifications.setNotificationChannelAsync(CANAL_CADUCIDAD, {
        name: 'Caducidad',
        importance: Notifications.AndroidImportance.HIGH,
      });
    } catch (error) {
      // mensaje de error para saber porque no llegan las notifiaciones 
      // console.warn('No se pudo crear el canal de notificaciones:', error);
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

// Borra todos los avisos y los vuelve a programar desde cero:
// UN aviso por día, con todos los productos activos que caducan ese día.
// Se llama después de cualquier cambio en la despensa y siempre deja todo correcto.
export async function reprogramarAvisos(): Promise<void> {
  try {
    const permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted) return;

    // 1. Quitar todos los avisos que había
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 2. Agrupar los productos activos por fecha de caducidad
    const productos = await leerProductos();
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

    // 3. Programar un aviso por grupo (for...of porque hay await adentro)
    for (const grupo of grupos) {
      // Ej. caducan el 12/11 → aviso el 10/11 a las 9:00 en hora local
      const fechaAviso = textoAFecha(sumarDias(grupo.fechaCaducidad, -DIAS_ANTICIPACION));
      fechaAviso.setHours(HORA_AVISO, MINUTO_AVISO, 0, 0);

      // Si la hora del aviso ya pasó (ej. caducan mañana), no programar nada
      if (fechaAviso.getTime() <= Date.now()) continue;

      const varios = grupo.nombres.length > 1;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: varios
            ? `${grupo.nombres.length} productos caducan en ${DIAS_ANTICIPACION} días`
            : `Caduca en ${DIAS_ANTICIPACION} días`,
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

      // Aparece en la terminal de Expo: sirve para comprobar sin esperar días
      console.log(`Aviso el ${fechaAviso.toLocaleString()}: ${unirNombres(grupo.nombres)}`);
    }
  } catch (error) {
    console.error('Error al reprogramar los avisos:', error);
  }
}
